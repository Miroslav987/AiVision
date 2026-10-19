import { ModelConfig, ModelInfo, InferenceResult, InferenceTimings } from '@/types/inference';

export interface InferenceEngine {
  /** Инициализация движка (загрузка WASM backend и т.д.) */
  init(): Promise<void>;
  
  /** Загрузка весов и прогрев */
  load(
    modelData: ArrayBuffer | string, // Buffer для файлов, URL для TF.js json
    config: ModelConfig,
    onProgress: (p: number, msg: string) => void
  ): Promise<ModelInfo>;
  
  /** Обновление параметров на лету (NMS, пороги) без перезагрузки сессии */
  configure(config: ModelConfig): void;
  
  /** Инференс. Движок сам освобождает внутренние тензоры! */
  infer(bitmap: ImageBitmap): Promise<{ result: InferenceResult; timings: InferenceTimings }>;
  
  /** Выгрузка текущей модели (освобождение памяти) */
  unload(): Promise<void>;
  
  /** Полное уничтожение движка */
  dispose(): Promise<void>;
}