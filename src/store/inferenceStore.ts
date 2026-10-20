// src/store/inferenceStore.ts
import { create } from 'zustand';
import { InferenceResult, InferenceTimings, FrameSize } from '@/types/inference';

export interface ChartPoint {
  timestamp: number;
  inferenceMs: number;
  objects: number;
}

interface InferenceState {
  isInferring: boolean;
  fpsVideo: number;
  fpsInference: number;
  lastResult: InferenceResult | null;
  lastFrame: FrameSize | null;
  timings: InferenceTimings | null;
  history: ChartPoint[];
  
  setInferringState: (isInferring: boolean) => void;
  setFpsVideo: (fps: number) => void;
  addResult: (result: InferenceResult, timings: InferenceTimings, frame: FrameSize) => void;
  clearResults: () => void;
}

let inferenceTimestamps: number[] = [];
const HISTORY_MAX_SECONDS = 60;

export const useInferenceStore = create<InferenceState>((set) => ({
  isInferring: false,
  fpsVideo: 0,
  fpsInference: 0,
  lastResult: null,
  lastFrame: null,
  timings: null,
  history: [],

  setInferringState: (isInferring) => set({ isInferring }),
  setFpsVideo: (fps) => set({ fpsVideo: fps }),
  
  clearResults: () => {
    inferenceTimestamps = [];
    set({ lastResult: null, lastFrame: null, fpsInference: 0, history: [], timings: null });
  },

  addResult: (result, timings, frame) => set((state) => {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    
    // FPS Инференса (количество завершенных инференсов за последнюю секунду)
    inferenceTimestamps.push(now);
    inferenceTimestamps = inferenceTimestamps.filter(t => now - t <= 1000);
    const fpsInference = inferenceTimestamps.length;

    let objectsCount = 0;
    if (result.type === 'detection') {
      objectsCount = result.data.length;
    } else if (result.type === 'classification') {
      objectsCount = result.data.length > 0 ? 1 : 0;
    }

    const newHistory = [...state.history];
    const lastPoint = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;

    if (lastPoint && lastPoint.timestamp === currentSecond) {
      // Обновляем текущую секунду, не мутируя старый объект
      newHistory[newHistory.length - 1] = {
        ...lastPoint,
        inferenceMs: timings.inferenceMs,
        objects: objectsCount,
      };
    } else {
      newHistory.push({
        timestamp: currentSecond,
        inferenceMs: timings.inferenceMs,
        objects: objectsCount,
      });
      if (newHistory.length > HISTORY_MAX_SECONDS) {
        newHistory.shift();
      }
    }

    return {
      fpsInference,
      lastResult: result,
      lastFrame: frame,
      timings,
      history: newHistory,
    };
  }),
}));