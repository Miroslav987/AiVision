// src/components/model/ModelPanel.tsx
"use client";
import React from 'react';
import { ModelDropzone } from './ModelDropzone';
import { ModelSettings } from './ModelSettings';
import { useModelStore } from '@/store/modelStore';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { unloadModel } from '@/lib/inference/modelLoader';

export function ModelPanel() {
  const modelInfo = useModelStore((s) => s.modelInfo);
  const detected = useModelStore((s) => s.detected);
  const labelsSource = useModelStore((s) => s.labelsSource);
  const config = useModelStore((s) => s.config);

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visiondesk-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <ErrorBoundary title="Загрузка модели">
        <ModelDropzone />
      </ErrorBoundary>
      
      {modelInfo && (
        <ErrorBoundary title="Информация о модели">
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 shrink-0 flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-text-main truncate" title={modelInfo.name}>{modelInfo.name}</h3>
              <div className="text-xs text-text-muted">
                {(modelInfo.sizeBytes / 1048576).toFixed(1)} МБ • {(modelInfo.loadTimeMs).toFixed(0)} мс • <span className="uppercase text-text-main font-medium">{modelInfo.backend}</span>
              </div>
              {modelInfo.backendNote && <div className="text-xs text-warning mt-1 leading-tight">{modelInfo.backendNote}</div>}
              {detected && <div className="text-xs text-success mt-1 leading-tight">{detected.explanation}</div>}
              {labelsSource && <div className="text-xs text-text-muted mt-1 leading-tight">Метки: {labelsSource}</div>}
            </div>

            <div className="text-xs font-mono overflow-x-auto border border-border-subtle rounded-md">
              <table className="w-full text-left">
                <thead className="bg-bg-base text-text-muted">
                  <tr><th className="font-normal px-2 py-1">Имя</th><th className="font-normal px-2 py-1">Тип</th><th className="font-normal px-2 py-1">Форма</th></tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50">
                  {modelInfo.inputs.map(t => (
                    <tr key={t.name}>
                      <td className="px-2 py-1 text-accent">in: {t.name}</td><td className="px-2 py-1 opacity-70">{t.type}</td><td className="px-2 py-1">{t.shape.join('x') || '?'}</td>
                    </tr>
                  ))}
                  {modelInfo.outputs.map(t => (
                    <tr key={t.name}>
                      <td className="px-2 py-1 text-success">out: {t.name}</td><td className="px-2 py-1 opacity-70">{t.type}</td><td className="px-2 py-1">{t.shape.join('x') || '?'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button onClick={handleExportConfig} className="flex-1 text-xs px-2 py-1.5 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors">
                Экспорт конфига
              </button>
              <button onClick={unloadModel} className="flex-1 text-xs px-2 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded hover:bg-danger/20 transition-colors">
                Выгрузить
              </button>
            </div>
          </div>
        </ErrorBoundary>
      )}

      <div className="flex-1 min-h-0">
        <ErrorBoundary title="Настройки">
          <ModelSettings />
        </ErrorBoundary>
      </div>
    </div>
  );
}