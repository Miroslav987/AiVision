"use client";
import React from 'react';
import { useModelStore } from '@/store/modelStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { Activity, Database } from 'lucide-react';

export function Header() {
  const modelInfo = useModelStore((s) => s.modelInfo);
  const isInferring = useInferenceStore((s) => s.isInferring);
  const fpsInference = useInferenceStore((s) => s.fpsInference);

  const statusColor = isInferring ? 'bg-success' : 'bg-text-muted';
  const statusText = isInferring ? 'Анализ запущен' : 'Ожидание';

  return (
    <header className="h-14 border-b border-border-subtle bg-bg-surface flex items-center px-4 shrink-0 gap-4">
      <h1 className="text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
        <Activity className="text-accent" /> VisionDesk
      </h1>
      
      <div className="ml-auto flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-base border border-border-subtle rounded-full">
          <Database size={14} className="text-text-muted" />
          <span className="font-medium text-text-main max-w-[150px] truncate">
            {modelInfo ? modelInfo.name : 'Модель не загружена'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} shadow-[0_0_8px_currentColor] opacity-80`} />
          <span className="text-text-muted font-medium w-28">{statusText}</span>
        </div>
        <div className="font-mono tabular-nums text-text-main bg-bg-base px-2 py-1 rounded border border-border-subtle">
          {fpsInference} FPS
        </div>
      </div>
    </header>
  );
}