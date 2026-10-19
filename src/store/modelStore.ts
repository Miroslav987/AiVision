import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModelConfig, ModelInfo } from '@/types/inference';

export const DEFAULT_CONFIG: ModelConfig = {
  task: 'auto',
  preprocess: {
    inputWidth: 640,
    inputHeight: 640,
    layout: 'NCHW',
    channels: 'RGB',
    normalization: '0-1',
    letterbox: true,
  },
  decoder: {
    confidenceThreshold: 0.25,
    iouThreshold: 0.45,
    maxDetections: 100,
    topK: 5,
    classFilter: [],
  },
  maxFps: 30,
  preferredBackend: 'webgpu',
};

interface ModelState {
  activeModelId: string | null;
  modelInfo: ModelInfo | null;
  config: ModelConfig;
  
  setActiveModel: (id: string | null, info: ModelInfo | null) => void;
  setConfig: (updater: (prev: ModelConfig) => ModelConfig) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      activeModelId: null,
      modelInfo: null,
      config: DEFAULT_CONFIG,
      
      setActiveModel: (id, info) => set({ activeModelId: id, modelInfo: info }),
      setConfig: (updater) => set((state) => ({ config: updater(state.config) })),
    }),
    {
      name: 'visiondesk-model-settings',
      partialize: (state) => ({ config: state.config }), // Сохраняем в localStorage только настройки
    }
  )
);