// src/store/modelConfig.ts
import { ModelConfig, EngineConfig, ResolvedTask } from '@/types/inference';
import { TaskDetectionResult } from '@/lib/inference/detect-task';

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

export function migrateModelSettings(persisted: unknown): { config: ModelConfig } {
  if (!persisted || typeof persisted !== 'object') {
    return { config: DEFAULT_CONFIG };
  }
  
  const p = persisted as Record<string, any>;
  if (!p.config || typeof p.config !== 'object') {
    return { config: DEFAULT_CONFIG };
  }

  const mergedConfig: ModelConfig = {
    ...DEFAULT_CONFIG,
    ...p.config,
    task: 'auto', // ПРИНУДИТЕЛЬНО
    preprocess: { ...DEFAULT_CONFIG.preprocess, ...(p.config.preprocess || {}) },
    decoder: { ...DEFAULT_CONFIG.decoder, ...(p.config.decoder || {}) },
  };

  return { config: mergedConfig };
}

export function resolveEngineConfig(config: ModelConfig, detected: TaskDetectionResult | null): EngineConfig {
  const resolvedTask = config.task === 'auto' ? (detected?.task ?? 'raw') : config.task;
  return {
    ...config,
    task: resolvedTask as ResolvedTask
  };
}