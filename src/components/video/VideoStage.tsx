// src/components/video/VideoStage.tsx
"use client";

import React, { useRef, useEffect } from 'react';
import { VideoOff } from 'lucide-react';
import { useVideoStore } from '@/store/videoStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { drawOverlay } from '@/lib/video/overlay';

export function VideoStage() {
  const setVideoEl = useVideoStore((s) => s.setVideoEl);
  const status = useVideoStore((s) => s.status);
  const videoEl = useVideoStore((s) => s.videoEl);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    let dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

    const draw = () => {
      const state = useInferenceStore.getState();
      drawOverlay(canvas, videoEl, state.lastResult, state.lastFrame);
    };

    draw(); // Рендер начального состояния

    const unsub = useInferenceStore.subscribe((s, prev) => {
      if (s.lastResult !== prev.lastResult) draw();
    });

    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);

    videoEl.addEventListener('resize', draw);
    videoEl.addEventListener('loadedmetadata', draw);

    const onDprChange = () => {
      draw();
      dprQuery.removeEventListener('change', onDprChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener('change', onDprChange);
    };
    dprQuery.addEventListener('change', onDprChange);

    return () => {
      unsub();
      ro.disconnect();
      videoEl.removeEventListener('resize', draw);
      videoEl.removeEventListener('loadedmetadata', draw);
      dprQuery.removeEventListener('change', onDprChange);
    };
  }, [videoEl]);

  return (
    <div className="relative w-full h-full min-h-[200px] bg-black rounded-xl overflow-hidden">
      <video 
        ref={setVideoEl} 
        className="absolute inset-0 w-full h-full object-contain" 
        muted 
        playsInline 
        autoPlay 
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none" 
      />
      {status !== 'ready' && status !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-base/80 backdrop-blur-sm z-10">
          <VideoOff size={48} className="text-text-muted mb-4" />
          <p className="text-sm font-medium text-text-main">
            {status === 'requesting' ? 'Подключение источника…' : 'Выберите источник видео выше'}
          </p>
        </div>
      )}
    </div>
  );
}