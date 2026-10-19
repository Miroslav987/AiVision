"use client";
import React, { useRef, useState, useEffect } from 'react';
import { useLogStore } from '@/store/logStore';
import { Download } from 'lucide-react';

export function EventLog() {
  const { events, clearEvents, exportCsv } = useLogStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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

  const handleExport = () => {
    const csv = exportCsv();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visiondesk-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="text-sm font-medium text-text-muted">События ({events.length})</div>
        <div className="flex gap-2">
          <button onClick={clearEvents} className="text-xs px-2 py-1 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors">Очистить</button>
          <button onClick={handleExport} className="text-xs px-2 py-1 flex items-center gap-1 bg-bg-base border border-border-subtle rounded hover:border-accent transition-colors"><Download size={12}/> CSV</button>
        </div>
      </div>
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-bg-base border border-border-subtle rounded-lg p-2 font-mono text-xs text-text-muted space-y-1"
      >
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-50">Журнал пуст</div>
        ) : (
          events.slice().reverse().map((e) => (
            <div key={e.id} className="flex gap-3 py-1 border-b border-border-subtle/50 last:border-0 hover:bg-bg-surface px-1 rounded">
              <span className="opacity-50 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span className={`shrink-0 ${e.type === 'error' ? 'text-danger' : e.type === 'limit_exceeded' ? 'text-warning' : 'text-accent'}`}>[{e.type}]</span>
              <span className="text-text-main break-all">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}