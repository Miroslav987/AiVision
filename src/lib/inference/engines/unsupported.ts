// src/lib/inference/engines/unsupported.ts
import { InferenceEngine, EngineContext, EngineOutput } from './engine';
import { ModelInfo, EngineConfig, Labels } from '@/types/inference';

export class UnsupportedEngine implements InferenceEngine {
  constructor(private reason: string) {}

  async load(ctx: EngineContext, onProgress: (progress: number, message: string) => void): Promise<ModelInfo> {
    throw new Error(this.reason);
  }

  configure(config: EngineConfig, labels?: Labels): void {
    // ничего не делает
  }

  async infer(bitmap: ImageBitmap): Promise<EngineOutput> {
    throw new Error(this.reason);
  }

  async dispose(): Promise<void> {
    // ничего не делает
  }
}