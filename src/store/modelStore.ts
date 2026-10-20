// src/store/modelStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModelConfig, ModelInfo, Labels } from '@/types/inference';
import { TaskDetectionResult } from '@/lib/inference/detect-task';
import { DEFAULT_CONFIG, migrateModelSettings } from './modelConfig';

interface ModelState {
  modelInfo: ModelInfo | null;
  modelFiles: File[] | null;
  labels: Labels | undefined;
  labelsSource: string | null;
  detected: TaskDetectionResult | null;
  loading: { progress: number; message: string } | null;
  config: ModelConfig;
  
  setModel: (info: ModelInfo | null, files: File[] | null, detected: TaskDetectionResult | null) => void;
  clearModel: () => void;
  setLabels: (labels: Labels | undefined, source: string | null) => void;
  setLoading: (v: { progress: number; message: string } | null) => void;
  setConfig: (updater: (prev: ModelConfig) => ModelConfig) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      modelInfo: null,
      modelFiles: null,
      labels: undefined,
      labelsSource: null,
      detected: null,
      loading: null,
      config: DEFAULT_CONFIG,
      
      setModel: (info, files, detected) => set({ modelInfo: info, modelFiles: files, detected }),
      clearModel: () => set({ modelInfo: null, modelFiles: null, detected: null }),
      setLabels: (labels, source) => set({ labels, labelsSource: source }),
      setLoading: (loading) => set({ loading }),
      setConfig: (updater) => set((state) => ({ config: updater(state.config) })),
    }),
    {
      name: 'visiondesk-model-settings',
      version: 1,
      partialize: (state) => ({ config: state.config }),
      migrate: (persisted) => migrateModelSettings(persisted) as any,
    }
  )
);