// src/components/video/PlaybackControls.tsx
"use client";

import React from 'react';
import { Play, Pause, Square, ScanEye, Camera as CameraIcon } from 'lucide-react';
import { useVideoStore } from '@/store/videoStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';
import { useToastStore } from '@/store/toastStore';
import { saveSnapshot } from '@/lib/video/snapshot';

export function PlaybackControls() {
  const videoEl = useVideoStore((s) => s.videoEl);
  const isPlaying = useVideoStore((s) => s.isPlaying);
  const setIsPlaying = useVideoStore((s) => s.setIsPlaying);
  const sourceType = useVideoStore((s) => s.sourceType);
  
  const isInferring = useInferenceStore((s) => s.isInferring);
  const setInferringState = useInferenceStore((s) => s.setInferringState);
  const lastResult = useInferenceStore((s) => s.lastResult);
  const lastFrame = useInferenceStore((s) => s.lastFrame);

  const modelInfo = useModelStore((s) => s.modelInfo);
  const loadingModel = useModelStore((s) => s.loading);

  const addToast = useToastStore((s) => s.addToast);

  const handlePlayPause = async () => {
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.pause();
    } else {
      try {
        await videoEl.play();
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          addToast('error', `Не удалось начать воспроизведение: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
        }
      }
    }
  };

  const handleStop = () => {
    if (!videoEl) return;
    videoEl.pause();
    if (sourceType !== 'camera') { // Камеру не сбрасываем на 0
      videoEl.currentTime = 0;
    }
    setIsPlaying(false);
    setInferringState(false);
  };

  const toggleInference = () => {
    if (!modelInfo) {
      addToast('warning', 'Сначала загрузите модель в правой колонке!');
      return;
    }
    setInferringState(!isInferring);
  };

  const handleSnapshot = async () => {
    if (!videoEl) {
      addToast('error', 'Видео не готово для снимка');
      return;
    }
    const error = await saveSnapshot(videoEl, lastResult, lastFrame);
    if (error) {
      addToast('error', error);
    } else {
      addToast('success', 'Снимок успешно сохранен!');
    }
  };

  const inferenceDisabled = !modelInfo || loadingModel !== null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
        <button onClick={handlePlayPause} className="p-3 text-text-main hover:bg-bg-base transition-colors" title={isPlaying ? 'Пауза' : 'Воспроизведение'}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button onClick={handleStop} className="p-3 text-text-main hover:bg-bg-base transition-colors border-l border-border-subtle" title="Стоп">
          <Square size={18} />
        </button>
      </div>

      <button
        onClick={toggleInference}
        disabled={inferenceDisabled}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
          isInferring 
            ? 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20' 
            : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
        } ${inferenceDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ScanEye size={18} />
        {isInferring ? 'Стоп Анализ' : 'Старт Анализ'}
      </button>

      <button
        onClick={handleSnapshot}
        className="ml-auto flex items-center gap-2 px-4 py-3 bg-bg-surface border border-border-subtle rounded-lg text-text-main hover:border-accent transition-colors"
        title="Снимок кадра с разметкой"
      >
        <CameraIcon size={18} />
      </button>
    </div>
  );
}