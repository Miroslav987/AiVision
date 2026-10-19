import { create } from 'zustand';
import { InferenceResult, InferenceTimings } from '@/types/inference';

export interface ChartPoint {
  timestamp: number; // Unix Epoch в секундах
  fpsInference: number;
  inferenceMs: number;
  objectCounts: Record<string, number>;
}

interface InferenceState {
  isInferring: boolean;
  fpsVideo: number;
  fpsInference: number;
  lastResult: InferenceResult | null;
  timings: InferenceTimings | null;
  history: ChartPoint[]; // Буфер на 60 элементов (посекундная агрегация)
  
  setInferringState: (isInferring: boolean) => void;
  setFpsVideo: (fps: number) => void;
  addResult: (result: InferenceResult, timings: InferenceTimings, fpsInf: number) => void;
}

const HISTORY_MAX_SECONDS = 60;

export const useInferenceStore = create<InferenceState>((set) => ({
  isInferring: false,
  fpsVideo: 0,
  fpsInference: 0,
  lastResult: null,
  timings: null,
  history: [],

  setInferringState: (isInferring) => set({ isInferring }),
  setFpsVideo: (fps) => set({ fpsVideo: fps }),
  
  addResult: (result, timings, fpsInf) => set((state) => {
    const currentSecond = Math.floor(Date.now() / 1000);
    const newHistory = [...state.history];
    const lastPoint = newHistory[newHistory.length - 1];

    const objectCounts: Record<string, number> = {};
    if (result.type === 'detection') {
      result.data.forEach((d) => {
        objectCounts[d.className] = (objectCounts[d.className] || 0) + 1;
      });
    }

    if (lastPoint && lastPoint.timestamp === currentSecond) {
      // Обновляем текущую секунду (усредняем метрики или берем последние)
      lastPoint.fpsInference = fpsInf;
      lastPoint.inferenceMs = timings.inferenceMs;
      lastPoint.objectCounts = objectCounts;
    } else {
      // Добавляем новую секунду
      newHistory.push({
        timestamp: currentSecond,
        fpsInference: fpsInf,
        inferenceMs: timings.inferenceMs,
        objectCounts,
      });
      // Соблюдаем размер буфера
      if (newHistory.length > HISTORY_MAX_SECONDS) {
        newHistory.shift();
      }
    }

    return {
      fpsInference: fpsInf,
      lastResult: result,
      timings,
      history: newHistory,
    };
  }),
}));