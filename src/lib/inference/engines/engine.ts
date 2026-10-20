// src/lib/inference/engines/engine.ts
import { ModelInfo, InferenceResult, InferenceTimings, ModelFormat, ModelConfig } from '@/types/inference';

export interface EngineContext {
  modelUrl: string;
  format: ModelFormat;
  config: ModelConfig;
  labels?: Record<number, string>;
}

export interface InferenceEngine {
  init(): Promise<void>;
  load(ctx: EngineContext, onProgress: (p: number, msg: string) => void): Promise<ModelInfo>;
  configure(config: ModelConfig): void;
  infer(bitmap: ImageBitmap): Promise<{ result: InferenceResult; timings: InferenceTimings }>;
  unload(): Promise<void>;
  dispose(): Promise<void>;
}