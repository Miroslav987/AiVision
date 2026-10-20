// src/components/analysis/RawOutputViewer.tsx
"use client";
import React from 'react';
import { useModelStore } from '@/store/modelStore';
import { useInferenceStore } from '@/store/inferenceStore';
import { InferenceResult } from '@/types/inference';

export function RawOutputViewer() {
  const modelInfo = useModelStore((s) => s.modelInfo);
  const lastResult = useInferenceStore((s) => s.lastResult);

  const rawOutputs = lastResult?.type === 'raw' ? lastResult.data : null;

  if (!modelInfo) {
    return <div className="h-full flex items-center justify-center text-sm text-text-muted">Модель не загружена</div>;
  }

  if (!rawOutputs) {
    return <div className="h-full flex items-center justify-center text-sm text-text-muted">Значения видны, когда в настройках выбрана задача "Сырой вывод" и запущен анализ.</div>;
  }

  return (
    <div className="overflow-auto h-full text-xs font-mono">
      <table className="w-full text-left table-auto">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 px-1">Выход</th>
            <th className="py-2 px-1">Тип</th>
            <th className="py-2 px-1">Форма</th>
            <th className="py-2 px-1">Первые значения</th>
          </tr>
        </thead>
        <tbody>
          {modelInfo.outputs.map((output, idx) => {
            const rawData = rawOutputs[output.name];
            return (
              <tr key={output.name} className="border-b border-border-subtle/50 last:border-0">
                <td className="py-2 px-1 text-text-main">{output.name}</td>
                <td className="py-2 px-1 text-text-muted">{output.type}</td>
                <td className="py-2 px-1 text-text-main">{rawData?.shape.join('x') || output.shape.join('x')}</td>
                <td className="py-2 px-1 text-text-muted max-w-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  {rawData?.values.map(v => v.toFixed(4)).join(', ')}
                  {rawData && rawData.total > rawData.values.length ? `... (всего ${rawData.total})` : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}