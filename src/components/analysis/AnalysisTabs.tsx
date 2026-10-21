// src/components/analysis/AnalysisTabs.tsx
"use client";
import React, { useState } from 'react';
import { MetricsGrid } from './MetricsGrid';
import { LiveCharts } from './LiveCharts';
import { EventLog } from './EventLog';
import { RawOutputViewer } from './RawOutputViewer'; // Импортируем новый компонент
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function AnalysisTabs({ videoNode }: { videoNode: React.ReactNode }) {
  const [tab, setTab] = useState<'video' | 'charts' | 'log' | 'raw'>('video');

  return (
    <div className="h-full flex flex-col gap-4">
      {/* На десктопе видео всегда видно, на мобильных скрывается вкладками. */}
      <div className={`${tab === 'video' ? 'block' : 'hidden'} lg:block h-[45vh] lg:h-auto lg:flex-[3] min-h-0 shrink-0`}>
        <ErrorBoundary title="Видеоплеер">{videoNode}</ErrorBoundary>
      </div>

      <ErrorBoundary title="Метрики">
        <MetricsGrid />
      </ErrorBoundary>

      <div className="flex bg-bg-surface p-1 rounded-lg border border-border-subtle shrink-0">
        {(['video', 'charts', 'log', 'raw'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
              tab === t
                ? 'bg-bg-base text-text-main shadow-sm'
                : t === 'charts' && tab === 'video'
                  ? 'text-text-muted lg:bg-bg-base lg:text-text-main lg:shadow-sm'
                  : 'text-text-muted hover:text-text-main'
            } ${t === 'video' ? 'lg:hidden' : ''}`}
          >
            {t === 'video' ? 'Видео' : t === 'charts' ? 'Графики' : t === 'log' ? 'Журнал' : 'Сырой вывод'}
          </button>
        ))}
      </div>

      <div className={`${tab === 'video' ? 'hidden lg:block' : 'block'} flex-[2] min-h-[220px] bg-bg-surface border border-border-subtle rounded-xl p-4`}>
        {/* На десктопе вкладки «Видео» нет — по умолчанию показываем графики */}
        {(tab === 'charts' || tab === 'video') && <ErrorBoundary title="Графики"><LiveCharts /></ErrorBoundary>}
        {tab === 'log' && <ErrorBoundary title="Журнал"><EventLog /></ErrorBoundary>}
        {tab === 'raw' && <ErrorBoundary title="Сырой вывод"><RawOutputViewer /></ErrorBoundary>}
      </div>
    </div>
  );
}