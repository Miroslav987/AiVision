import { ModelInfo, InferenceResult, InferenceTimings, ModelFormat, ModelConfig } from './inference';

export type WorkerRequest = 
  | { type: 'init'; requestId: string }
  | { type: 'load'; requestId: string; modelUrl: string; format: ModelFormat; config: ModelConfig; labels?: Record<number, string> }
  | { type: 'configure'; requestId: string; config: ModelConfig }
  | { type: 'infer'; requestId: string; bitmap: ImageBitmap }
  | { type: 'unload'; requestId: string }
  | { type: 'dispose'; requestId: string };

export type WorkerResponse = 
  | { type: 'ready'; requestId: string }
  | { type: 'progress'; requestId: string; progress: number; message: string }
  | { type: 'loaded'; requestId: string; info: ModelInfo }
  | { type: 'configured'; requestId: string }
  | { type: 'result'; requestId: string; result: InferenceResult; timings: InferenceTimings }
  | { type: 'unloaded'; requestId: string }
  | { type: 'error'; requestId: string; message: string; errorDetail?: unknown };