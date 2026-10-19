"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useVideoStore } from '@/store/videoStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';

function getClassColor(classId: number): string {
  const hue = (classId * 137.508) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export interface VideoStageRef {
  video: HTMLVideoElement | null;
  captureSnapshot: () => void;
}

export const VideoStage = forwardRef<VideoStageRef, {}>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Исправление 4: Селекторы Zustand
  const resolution = useVideoStore((s) => s.resolution);
  const lastResult = useInferenceStore((s) => s.lastResult);

  useImperativeHandle(ref, () => ({
    video: videoRef.current,
    captureSnapshot: () => {
      // ... логика снапшота без изменений ...
      if (!videoRef.current || !lastResult) return;
      const v = videoRef.current;
      const oc = document.createElement('canvas');
      oc.width = v.videoWidth;
      oc.height = v.videoHeight;
      const ctx = oc.getContext('2d')!;
      ctx.drawImage(v, 0, 0, oc.width, oc.height);
      if (lastResult.type === 'detection') {
        ctx.lineWidth = 3; ctx.font = '16px sans-serif'; ctx.textBaseline = 'top';
        for (const d of lastResult.data) {
          const color = getClassColor(d.classId);
          ctx.strokeStyle = color; ctx.fillStyle = color;
          ctx.strokeRect(d.box.x, d.box.y, d.box.w, d.box.h);
          const text = `${d.className} ${(d.confidence * 100).toFixed(0)}%`;
          const tw = ctx.measureText(text).width;
          ctx.fillRect(d.box.x, Math.max(d.box.y - 24, 0), tw + 8, 24);
          ctx.fillStyle = '#ffffff'; ctx.fillText(text, d.box.x + 4, Math.max(d.box.y - 20, 4));
        }
      }
      const url = oc.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = `visiondesk-snapshot-${Date.now()}.png`;
      a.click(); URL.revokeObjectURL(url);
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!canvas || !container || !video || !resolution) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { clientWidth: cW, clientHeight: cH } = container;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = cW * dpr;
      canvas.height = cH * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cW, cH);

      if (!lastResult) return;

      const scale = Math.min(cW / resolution.width, cH / resolution.height);
      const offsetX = (cW - resolution.width * scale) / 2;
      const offsetY = (cH - resolution.height * scale) / 2;

      if (lastResult.type === 'detection') {
        ctx.lineWidth = 2; ctx.font = '12px system-ui, sans-serif'; ctx.textBaseline = 'top';
        for (const d of lastResult.data) {
          const color = getClassColor(d.classId);
          ctx.strokeStyle = color; ctx.fillStyle = color;
          const x = offsetX + d.box.x * scale; const y = offsetY + d.box.y * scale;
          const w = d.box.w * scale; const h = d.box.h * scale;
          ctx.strokeRect(x, y, w, h);
          const label = `${d.className} ${d.confidence.toFixed(2)}`;
          const tw = ctx.measureText(label).width;
          ctx.fillRect(x, Math.max(y - 18, 0), tw + 8, 18);
          ctx.fillStyle = '#fff'; ctx.fillText(label, x + 4, Math.max(y - 16, 2));
        }
      }
      if (lastResult.type === 'classification') {
        const padding = 16;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(padding, padding, 200, 10 + lastResult.data.length * 24);
        ctx.font = '14px system-ui, sans-serif';
        lastResult.data.forEach((cls, i) => {
          ctx.fillStyle = getClassColor(cls.classId);
          ctx.fillText(`${cls.className}: ${(cls.confidence*100).toFixed(1)}%`, padding + 10, padding + 10 + i * 24);
        });
      }
    };

    render();
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [lastResult, resolution]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      <video ref={videoRef} className="absolute w-full h-full object-contain pointer-events-none" muted playsInline />
      <canvas ref={canvasRef} className="absolute w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }} />
    </div>
  );
});
VideoStage.displayName = 'VideoStage';