"use client";
import React, { useState } from 'react';
import { MetricsGrid } from './MetricsGrid';
import { LiveCharts } from './LiveCharts';
import { EventLog } from './EventLog';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function AnalysisTabs({ videoNode }: { videoNode: React.ReactNode }) {
  const [tab, setTab] = useState<'video' | 'charts' | 'log' | 'raw'>('video');

  return (
    <div className="h-full flex flex-col gap-4">
      {/* На десктопе видео всегда видно, на мобильных скрывается вкладками. */}
      <div className={`shrink-0 lg:h-[55%] ${tab === 'video' ? 'block' : 'hidden lg:block'}`}>
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
              (tab === t && window.innerWidth < 1024) || (t === tab && t !== 'video') 
                ? 'bg-bg-base text-text-main shadow-sm' 
                : 'text-text-muted hover:text-text-main'
            } ${t === 'video' ? 'lg:hidden' : ''}`}
          >
            {t === 'video' ? 'Видео' : t === 'charts' ? 'Графики' : t === 'log' ? 'Журнал' : 'Сырой вывод'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-bg-surface border border-border-subtle rounded-xl p-4">
        {tab === 'charts' && <ErrorBoundary title="Графики"><LiveCharts /></ErrorBoundary>}
        {tab === 'log' && <ErrorBoundary title="Журнал"><EventLog /></ErrorBoundary>}
        {tab === 'raw' && <div className="text-sm text-text-muted h-full flex items-center justify-center">Сырой вывод доступен, если задача = raw (раздел в разработке)</div>}
      </div>
    </div>
  );
}