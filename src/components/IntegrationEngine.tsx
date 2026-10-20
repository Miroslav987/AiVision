// src/components/IntegrationEngine.tsx
"use client";

import React, { useEffect, useCallback, useRef } from 'react';
import { getGlobalInferenceClient } from '@/lib/inference/clientSingleton';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';
import { useLogStore } from '@/store/logStore';
import { useToastStore } from '@/store/toastStore';
import { useFrameCapture } from '@/hooks/useFrameCapture';
import { resolveEngineConfig } from '@/store/modelConfig';
import { ClassPresenceTracker } from '@/lib/inference/presence';
import { useVideoStore } from '@/store/videoStore';

export function IntegrationEngine() {
  const videoEl = useVideoStore((s) => s.videoEl);
  
  const isInferring = useInferenceStore((s) => s.isInferring);
  const setInferringState = useInferenceStore((s) => s.setInferringState);
  const addResult = useInferenceStore((s) => s.addResult);
  const clearResults = useInferenceStore((s) => s.clearResults);
  
  const modelInfo = useModelStore((s) => s.modelInfo);
  const config = useModelStore((s) => s.config);
  const detected = useModelStore((s) => s.detected);
  const labels = useModelStore((s) => s.labels);
  
  const addEvent = useLogStore((s) => s.addEvent);
  const addToast = useToastStore((s) => s.addToast);

  const tracker = useRef(new ClassPresenceTracker());

  const processFrame = useCallback(async (bitmap: ImageBitmap) => {
    try {
      const client = getGlobalInferenceClient();
      const out = await client.infer(bitmap);
      
      if (!out) return;
      
      if (!useInferenceStore.getState().isInferring) return;
      
      const { result, timings, frame } = out;
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

  useFrameCapture(videoEl, processFrame, isInferring && modelInfo !== null);

  useEffect(() => {
    if (modelInfo) {
      getGlobalInferenceClient()
        .configure(resolveEngineConfig(config, detected), labels)
        .catch(e => console.warn('Не удалось обновить конфиг', e));
    }
  }, [config, detected, labels, modelInfo]);

  useEffect(() => {
    if (!isInferring) {
      clearResults();
      tracker.current.reset();
    }
  }, [isInferring, clearResults]);

  useEffect(() => {
    if (!modelInfo && isInferring) {
      setInferringState(false);
    }
  }, [modelInfo, isInferring, setInferringState]);

  return null;
}