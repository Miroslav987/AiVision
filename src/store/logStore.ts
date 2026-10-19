import { create } from 'zustand';
import { AnalysisEvent } from '@/types/inference';

const MAX_LOGS = 1000;

interface LogState {
  events: AnalysisEvent[];
  addEvent: (event: Omit<AnalysisEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
  exportCsv: () => string;
}

export const useLogStore = create<LogState>((set, get) => ({
  events: [],
  
  addEvent: (eventData) => set((state) => {
    const newEvent: AnalysisEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    const newEvents = [newEvent, ...state.events];
    if (newEvents.length > MAX_LOGS) {
      newEvents.pop();
    }
    
    return { events: newEvents };
  }),
  
  clearEvents: () => set({ events: [] }),
  
  exportCsv: () => {
    const { events } = get();
    if (events.length === 0) return '';
    
    const header = ['Time', 'Type', 'Message', 'Details'].join(',');
    const rows = events.map(e => {
      const time = new Date(e.timestamp).toISOString();
      const details = e.details ? JSON.stringify(e.details).replace(/"/g, '""') : '';
      return `${time},${e.type},"${e.message}","${details}"`;
    });
    
    return [header, ...rows].join('\n');
  }
}));