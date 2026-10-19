"use client";

import React, { useEffect, useCallback } from 'react';
import { getGlobalInferenceClient } from '@/lib/inference/clientSingleton';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';
import { useLogStore } from '@/store/logStore';
import { useToastStore } from '@/store/toastStore';
import { useFrameCapture } from '@/hooks/useFrameCapture';
import { detectTaskFromShapes } from '@/lib/inference/detect-task';

export function IntegrationEngine({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const isInferring = useInferenceStore((s) => s.isInferring);
  const setInferringState = useInferenceStore((s) => s.setInferringState);
  const addResult = useInferenceStore((s) => s.addResult);
  
  const config = useModelStore((s) => s.config);
  const activeModelId = useModelStore((s) => s.activeModelId);
  const setConfig = useModelStore((s) => s.setConfig);
  
  const addEvent = useLogStore((s) => s.addEvent);
  const addToast = useToastStore((s) => s.addToast);

  // Обработка кадра
  const processFrame = useCallback(async (bitmap: ImageBitmap) => {
    try {
      const client = getGlobalInferenceClient();
      const start = performance.now();
      const { result, timings } = await client.infer(bitmap);
      const fpsInf = Math.round(1000 / (performance.now() - start));
      addResult(result, timings, fpsInf);
    } catch (e) {
      console.error(e);
      setInferringState(false);
      addToast('error', `Ошибка инференса: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
      addEvent({ type: 'error', message: 'Остановка из-за ошибки инференса' });
    }
  }, [addResult, setInferringState, addToast, addEvent]);

  // Запуск захвата
  useFrameCapture(videoRef, processFrame, isInferring);

  // Синхронизация настроек "на лету"
  useEffect(() => {
    if (activeModelId) {
      getGlobalInferenceClient().configure(config).catch(e => console.warn('Не удалось обновить конфиг', e));
      
      // Логика автоопределения задачи, если выставлено auto
      if (config.task === 'auto') {
        const info = useModelStore.getState().modelInfo;
        if (info) {
          const detected = detectTaskFromShapes(info.outputs);
          setConfig(c => ({ ...c, task: detected.task }));
          addToast('info', `Автоопределение задачи: ${detected.task.toUpperCase()} (${detected.explanation})`);
        }
      }
    }
  }, [config, activeModelId, setConfig, addToast]);

  // Остановка при смене модели
  useEffect(() => {
    if (!activeModelId && isInferring) {
      setInferringState(false);
    }
  }, [activeModelId, isInferring, setInferringState]);

  return null; // Это компонент без UI, он только связывает логику
}