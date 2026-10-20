// src/components/analysis/EventLog.tsx
"use client";
import React, { useRef, useState, useEffect } from 'react';
import { useLogStore, eventsToCsv } from '@/store/logStore'; // Импортируем eventsToCsv
import { Download } from 'lucide-react';
import { AnalysisEvent } from '@/types/inference'; // Импортируем AnalysisEvent

export function EventLog() {
  const events = useLogStore((s) => s.events); // Селектор
  const clearEvents = useLogStore((s) => s.clearEvents); // Селектор
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<'all' | AnalysisEvent['type']>('all');

  // Автопрокрутка
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setAutoScroll(isAtBottom);
  };

  const filteredEvents = filterType === 'all'
    ? events
    : events.filter(e => e.type === filterType);

  const handleExportCsv = () => {
    const csv = eventsToCsv(events);
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visiondesk-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(events, null, 2);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visiondesk-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex gap-2 items-center">
          <div className="text-sm font-medium text-text-muted">События ({filteredEvents.length} из {events.length})</div>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as 'all' | AnalysisEvent['type'])}
            className="text-xs px-2 py-1 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors focus:outline-none"
          >
            <option value="all">Все</option>
            <option value="info">Инфо</option>
            <option value="error">Ошибки</option>
            <option value="class_appeared">Появился</option>
            <option value="class_disappeared">Исчез</option>
            <option value="limit_exceeded">Лимит</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={clearEvents} className="text-xs px-2 py-1 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors">Очистить</button>
          <button onClick={handleExportCsv} className="text-xs px-2 py-1 flex items-center gap-1 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors"><Download size={12}/> CSV</button>
          <button onClick={handleExportJson} className="text-xs px-2 py-1 flex items-center gap-1 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors"><Download size={12}/> JSON</button>
        </div>
      </div>
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-bg-base border border-border-subtle rounded-lg p-2 font-mono text-xs text-text-muted space-y-1"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-50">Журнал пуст</div>
        ) : (
          filteredEvents.map((e) => (
            <div key={e.id} className="flex gap-3 py-1 border-b border-border-subtle/50 last:border-0 hover:bg-bg-surface px-1 rounded">
              <span className="opacity-50 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span className={`shrink-0 ${e.type === 'error' ? 'text-danger' : e.type === 'limit_exceeded' ? 'text-warning' : (e.type === 'info' ? 'text-text-muted' : 'text-accent')}`}>[{e.type}]</span>
              <span className="text-text-main break-all">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}