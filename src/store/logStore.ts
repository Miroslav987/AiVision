// src/store/logStore.ts
import { create } from 'zustand';
import { AnalysisEvent } from '@/types/inference';

const MAX_LOGS = 1000;

interface LogState {
  events: AnalysisEvent[];
  addEvent: (event: Omit<AnalysisEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  events: [],
  
  addEvent: (eventData) => set((state) => {
    const newEvent: AnalysisEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    const newEvents = [...state.events, newEvent];
    if (newEvents.length > MAX_LOGS) {
      newEvents.splice(0, newEvents.length - MAX_LOGS);
    }
    
    return { events: newEvents };
  }),
  
  clearEvents: () => set({ events: [] })
}));

export function eventsToCsv(events: AnalysisEvent[]): string {
  if (events.length === 0) return '';
  
  const header = ['Time', 'Type', 'Message', 'Details'].join(',');
  const rows = events.map(e => {
    const time = new Date(e.timestamp).toISOString();
    const type = e.type;
    const msg = `"${e.message.replace(/"/g, '""')}"`;
    const details = e.details ? `"${JSON.stringify(e.details).replace(/"/g, '""')}"` : '""';
    return `${time},${type},${msg},${details}`;
  });
  
  return [header, ...rows].join('\n');
}