// src/components/dev/DevPanel.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { useInferenceStore } from '@/store/inferenceStore';
import { resetGlobalInferenceClient } from '@/lib/inference/clientSingleton';
import { ActivitySquare, RefreshCw } from 'lucide-react';

export function DevPanel() {
  const timings = useInferenceStore((s) => s.timings);
  const [memory, setMemory] = useState<string>('N/A');

  useEffect(() => {
    const interval = setInterval(() => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      if (perf.memory) {
        setMemory(`${Math.round(perf.memory.usedJSHeapSize / 1048576)} MB`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    resetGlobalInferenceClient();
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 backdrop-blur border border-border-subtle p-3 rounded-lg text-xs font-mono text-text-muted shadow-xl w-64">
      <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2">
        <span className="flex items-center gap-1 text-accent font-bold"><ActivitySquare size={14}/> DevTools</span>
        <button onClick={handleReset} title="Сбросить Worker" className="hover:text-text-main"><RefreshCw size={14}/></button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between"><span>Main Heap:</span> <span className="text-text-main">{memory}</span></div>
        <div className="flex justify-between"><span>Preprocess:</span> <span className="text-text-main">{timings?.preprocessMs.toFixed(1) || 0} ms</span></div>
        <div className="flex justify-between"><span>Engine:</span> <span className="text-text-main">{timings?.inferenceMs.toFixed(1) || 0} ms</span></div>
        <div className="flex justify-between"><span>Postprocess:</span> <span className="text-text-main">{timings?.postprocessMs.toFixed(1) || 0} ms</span></div>
      </div>
    </div>
  );
}