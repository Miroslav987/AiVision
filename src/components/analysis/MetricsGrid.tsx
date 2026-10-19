"use client";
import React from 'react';
import { useInferenceStore } from '@/store/inferenceStore';
import { useModelStore } from '@/store/modelStore';

export function MetricsGrid() {
  const { fpsVideo, fpsInference, timings, lastResult } = useInferenceStore();
  const { modelInfo } = useModelStore();

  const totalLatency = timings ? timings.preprocessMs + timings.inferenceMs + timings.postprocessMs : 0;
  
  const getLatencyColor = (ms: number) => {
    if (ms === 0) return 'text-text-muted';
    if (ms < 30) return 'text-success';
    if (ms < 100) return 'text-warning';
    return 'text-danger';
  };

  const objCount = lastResult?.type === 'detection' ? lastResult.data.length : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard title="FPS (Видео / Инференс)" value={`${fpsVideo} / ${fpsInference}`} />
      <MetricCard title="Задержка (Итого)" value={`${totalLatency.toFixed(1)} мс`} valueColor={getLatencyColor(totalLatency)} />
      <MetricCard title="Объектов в кадре" value={objCount.toString()} />
      <MetricCard title="Активный движок" value={modelInfo ? modelInfo.backend.toUpperCase() : '—'} />
    </div>
  );
}

function MetricCard({ title, value, valueColor = 'text-text-main' }: { title: string, value: string, valueColor?: string }) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 flex flex-col justify-center">
      <div className="text-xs text-text-muted font-medium mb-1">{title}</div>
      <div className={`text-xl font-mono tabular-nums tracking-tight ${valueColor}`}>{value}</div>
    </div>
  );
}