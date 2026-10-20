// src/types/worker.ts
import type {
  EngineConfig, FrameSize, InferenceResult, InferenceTimings, Labels, ModelFormat, ModelInfo,
} from './inference';

export type WorkerRequest =
  | { type: 'load'; requestId: string; files: File[]; format: ModelFormat; config: EngineConfig; labels?: Labels }
  | { type: 'configure'; requestId: string; config: EngineConfig; labels?: Labels }
  | { type: 'infer'; requestId: string; bitmap: ImageBitmap }
  | { type: 'unload'; requestId: string }
  | { type: 'dispose'; requestId: string };

export type WorkerResponse =
  | { type: 'progress'; requestId: string; progress: number; message: string }
  | { type: 'loaded'; requestId: string; info: ModelInfo }
  | { type: 'configured'; requestId: string }
  | { type: 'result'; requestId: string; result: InferenceResult; timings: InferenceTimings; frame: FrameSize }
  /** Кадр пропущен (идёт загрузка модели или модель не загружена) — это не ошибка. */
  | { type: 'skipped'; requestId: string; reason: 'busy' | 'loading' | 'no-model' }
  | { type: 'unloaded'; requestId: string }
  | { type: 'error'; requestId: string; message: string };

/** Omit, который корректно работает с union-типами. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;