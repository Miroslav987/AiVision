// src/components/analysis/MetricsGrid.tsx
"use client";
import React from 'react';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';

export function MetricsGrid() {
  const fpsVideo = useInferenceStore((s) => s.fpsVideo);
  const fpsInference = useInferenceStore((s) => s.fpsInference);
  const timings = useInferenceStore((s) => s.timings);
  const lastResult = useInferenceStore((s) => s.lastResult);
  const modelBackend = useModelStore((s) => s.modelInfo?.backend);


  const totalLatency = timings ? timings.preprocessMs + timings.inferenceMs + timings.postprocessMs : 0;
  
  const getLatencyColor = (ms: number) => {
    if (ms === 0) return 'text-text-muted';
    if (ms < 33) return 'text-success';
    if (ms < 100) return 'text-warning';
    return 'text-danger';
  };

  const objCount = lastResult?.type === 'detection' ? lastResult.data.length : 
                   lastResult?.type === 'classification' && lastResult.data.length > 0 ? 1 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard title="FPS (Видео / Анализ)" value={`${fpsVideo} / ${fpsInference}`} />
      <MetricCard 
        title="Задержка, мс (Пре / Инф / Пост)" 
        value={`${totalLatency.toFixed(1)} (${timings?.preprocessMs.toFixed(0) || 0} / ${timings?.inferenceMs.toFixed(0) || 0} / ${timings?.postprocessMs.toFixed(0) || 0})`} 
        valueColor={getLatencyColor(totalLatency)} 
      />
      <MetricCard title="Объектов в кадре" value={objCount.toString()} />
      <MetricCard title="Бэкенд" value={modelBackend ? modelBackend.toUpperCase() : '—'} />
    </div>
  );
}

function MetricCard({ title, value, valueColor = 'text-text-main' }: { title: string, value: string, valueColor?: string }) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 flex flex-col justify-center min-w-0">
      <div className="text-xs text-text-muted font-medium mb-1">{title}</div>
      <div className={`text-xl font-mono tabular-nums tracking-tight truncate ${valueColor}`} title={value}>{value}</div>
    </div>
  );
}