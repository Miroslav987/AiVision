// src/lib/inference/engines/engine.ts
import { InferenceResult, InferenceTimings, ModelFormat, EngineConfig, Labels, ModelInfo } from '@/types/inference';

export interface EngineContext {
  files: File[];
  format: ModelFormat;
  config: EngineConfig;
  labels?: Labels;
}

export interface EngineOutput {
  result: InferenceResult;
  timings: InferenceTimings;
}

export interface InferenceEngine {
  load(ctx: EngineContext, onProgress: (progress: number, message: string) => void): Promise<ModelInfo>;
  configure(config: EngineConfig, labels?: Labels): void;
  infer(bitmap: ImageBitmap): Promise<EngineOutput>;
  dispose(): Promise<void>;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}