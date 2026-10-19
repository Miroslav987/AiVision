"use client";

import React from 'react';
import { Play, Pause, Square, ScanEye, Camera as CameraIcon } from 'lucide-react';
import { useVideoStore } from '@/store/videoStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';

interface PlaybackControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSnapshot: () => void;
}

export function PlaybackControls({ videoRef, onSnapshot }: PlaybackControlsProps) {
  const { isPlaying, setIsPlaying } = useVideoStore();
  const { isInferring, setInferringState } = useInferenceStore();
  const { activeModelId } = useModelStore();

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
  };

  const handleStop = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const toggleInference = () => {
    if (!activeModelId) {
      alert('Сначала загрузите модель в правой колонке!');
      return;
    }
    setInferringState(!isInferring);
  };

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
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
          isInferring 
            ? 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20' 
            : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
        }`}
      >
        <ScanEye size={18} />
        {isInferring ? 'Стоп Анализ' : 'Старт Анализ'}
      </button>

      <button
        onClick={onSnapshot}
        className="ml-auto flex items-center gap-2 px-4 py-3 bg-bg-surface border border-border-subtle rounded-lg text-text-main hover:border-accent transition-colors"
        title="Снимок кадра с разметкой"
      >
        <CameraIcon size={18} />
      </button>
    </div>
  );
}