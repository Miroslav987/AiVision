// src/components/analysis/LiveCharts.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useInferenceStore, ChartPoint } from '@/store/inferenceStore';

export function LiveCharts() {
  const [data, setData] = useState<ChartPoint[]>([]);

  // Троттлинг: обновляем график не чаще 2 раз в секунду, чтобы не блокировать UI
  useEffect(() => {
    const interval = setInterval(() => {
      setData(useInferenceStore.getState().history);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-text-muted">Запустите анализ, чтобы увидеть графики</div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 min-h-0">
        <div className="text-xs text-text-muted mb-2 font-medium">Задержка инференса (мс)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2b303b" vertical={false} />
            <XAxis dataKey="timestamp" hide />
            <YAxis width={30} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #2b303b', borderRadius: '8px' }} 
              itemStyle={{ color: '#f8fafc' }} 
              labelStyle={{ display: 'none' }} 
              isAnimationActive={false} 
            />
            <Line type="stepAfter" dataKey="inferenceMs" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-h-0">
        <div className="text-xs text-text-muted mb-2 font-medium">Объектов в кадре</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2b303b" vertical={false} />
            <XAxis dataKey="timestamp" hide />
            <YAxis width={30} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #2b303b', borderRadius: '8px' }} 
              itemStyle={{ color: '#f8fafc' }} 
              labelStyle={{ display: 'none' }} 
              isAnimationActive={false} 
            />
            <Line type="stepAfter" dataKey="objects" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}