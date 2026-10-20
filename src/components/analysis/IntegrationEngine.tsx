// src/components/IntegrationEngine.tsx
"use client";

import React, { useEffect, useCallback, useRef } from 'react';
import { getGlobalInferenceClient } from '@/lib/inference/clientSingleton';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';
import { useLogStore } from '@/store/logStore';
import { useToastStore } from '@/store/toastStore';
import { useFrameCapture } from '@/hooks/useFrameCapture';
import { detectTaskFromShapes } from '@/lib/inference/detect-task';
import { resolveEngineConfig } from '@/store/modelConfig';
import { ClassPresenceTracker } from '@/lib/inference/presence';
import { useVideoStore } from '@/store/videoStore'; // Импортируем useVideoStore

export function IntegrationEngine() {
  const videoEl = useVideoStore((s) => s.videoEl); // Получаем videoEl из стора
  const isInferring = useInferenceStore((s) => s.isInferring);
  const setInferringState = useInferenceStore((s) => s.setInferringState);
  const addResult = useInferenceStore((s) => s.addResult);
  const clearResults = useInferenceStore((s) => s.clearResults);
  
  const modelInfo = useModelStore((s) => s.modelInfo);
  const config = useModelStore((s) => s.config);
  const detected = useModelStore((s) => s.detected);
  const labels = useModelStore((s) => s.labels);
  const setModel = useModelStore((s) => s.setModel); // Для обновления detected
  const setConfig = useModelStore((s) => s.setConfig);
  
  const addEvent = useLogStore((s) => s.addEvent);
  const addToast = useToastStore((s) => s.addToast);

  const tracker = useRef(new ClassPresenceTracker());

  // Обработка кадра
  const processFrame = useCallback(async (bitmap: ImageBitmap) => {
    try {
      const client = getGlobalInferenceClient();
      const start = performance.now();
      const out = await client.infer(bitmap);
      
      if (!out) { // Кадр пропущен воркером
        return;
      }
      
      // Если анализ был остановлен, пока кадр был в воркере
      if (!useInferenceStore.getState().isInferring) {
        return;
      }
      
      const { result, timings, frame } = out;
      const fpsInf = Math.round(1000 / (performance.now() - start)); // FPS инференса считаем по времени обработки кадра здесь, а не по количеству.
      addResult(result, timings, frame);

      const presence = tracker.current.update(result, performance.now());
      presence.appeared.forEach(name => addEvent({ type: 'class_appeared', message: `Появился: ${name}` }));
      presence.disappeared.forEach(name => addEvent({ type: 'class_disappeared', message: `Исчез: ${name}` }));

    } catch (e) {
      console.error(e);
      setInferringState(false);
      addToast('error', `Анализ остановлен: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
      addEvent({ type: 'error', message: `Анализ остановлен из-за ошибки: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}` });
    }
  }, [addResult, setInferringState, addToast, addEvent]);

  // Запуск захвата
  useFrameCapture(videoEl, processFrame, isInferring && modelInfo !== null);

  // Синхронизация настроек "на лету" и автоопределение задачи
  useEffect(() => {
    if (modelInfo) {
      // Автоопределение задачи, если выбрано 'auto'
      if (config.task === 'auto') {
        const currentDetected = detectTaskFromShapes(modelInfo.outputs);
        // Обновляем detected в сторе, но не перезаписываем config.task
        if (currentDetected.task !== detected?.task) {
          setModel(modelInfo, useModelStore.getState().modelFiles, currentDetected);
          addToast('info', `Автоопределение задачи: ${currentDetected.task.toUpperCase()} (${currentDetected.explanation})`);
        }
      }

      // Отправляем конфиг в воркер, используя разрешенную задачу
      getGlobalInferenceClient()
        .configure(resolveEngineConfig(config, detected), labels)
        .catch(e => console.warn('Не удалось обновить конфиг', e));
    }
  }, [config, detected, labels, modelInfo, setModel, addToast]);

  // Остановка анализа при выключении isInferring или сбросе модели
  useEffect(() => {
    if (!isInferring) {
      clearResults();
      tracker.current.reset();
    }
  }, [isInferring, clearResults]);

  // Остановка анализа, если модель была выгружена
  useEffect(() => {
    if (!modelInfo && isInferring) {
      setInferringState(false);
    }
  }, [modelInfo, isInferring, setInferringState]);

  return null; // Это компонент без UI, он только связывает логику
}