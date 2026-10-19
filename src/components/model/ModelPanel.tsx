"use client";
import React from 'react';
import { ModelDropzone } from './ModelDropzone';
import { ModelSettings } from './ModelSettings';
import { useModelStore } from '@/store/modelStore';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function ModelPanel() {
  const { modelInfo } = useModelStore();

  return (
    <div className="h-full flex flex-col gap-4">
      <ErrorBoundary title="Загрузка модели">
        <ModelDropzone />
      </ErrorBoundary>
      
      {modelInfo && (
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 shrink-0">
          <h3 className="text-sm font-bold text-text-main mb-2">Загружена модель</h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-text-muted">
            <div>Формат: <span className="text-text-main">{modelInfo.format}</span></div>
            <div>Время загрузки: <span className="text-text-main">{modelInfo.loadTimeMs.toFixed(0)} мс</span></div>
            <div className="col-span-2">Вход: <span className="text-text-main">{JSON.stringify(modelInfo.inputs[0]?.shape)}</span></div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ErrorBoundary title="Настройки">
          <ModelSettings />
        </ErrorBoundary>
      </div>
    </div>
  );
}