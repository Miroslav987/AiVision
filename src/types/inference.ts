import type { DecoderConfig, PreprocessConfig } from './config';

export type ModelFormat = 'onnx' | 'tfjs-graph' | 'tfjs-layers' | 'tflite' | 'unsupported';
export type EngineBackend = 'webgpu' | 'wasm' | 'webgl' | 'remote' | 'cpu';
/** Задача, которую выбирает пользователь. 'auto' — определить по формам выходов. */
export type TaskType = 'yolov8' | 'yolov5' | 'classification' | 'raw' | 'auto';
/** Задача, с которой реально работает декодер (без 'auto'). */
export type ResolvedTask = Exclude<TaskType, 'auto'>;
export type DataType = 'float32' | 'float16' | 'int32' | 'int64' | 'uint8' | 'unknown';
export type Labels = Record<number, string>;

export interface TensorInfo {
  name: string;
  shape: (number | string)[];
  type: DataType;
}

export interface ModelInfo {
  id: string;
  name: string;
  format: ModelFormat;
  sizeBytes: number;
  loadTimeMs: number;
  backend: EngineBackend;
  /** Если запрошенный бэкенд не поднялся — почему пришлось откатиться. */
  backendNote?: string;
  inputs: TensorInfo[];
  outputs: TensorInfo[];
  /** Размер и раскладка входа, если они жёстко зашиты в модель. */
  fixedInput?: Pick<PreprocessConfig, 'inputWidth' | 'inputHeight' | 'layout'>;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  /** Координаты в пикселях исходного кадра (frame.width × frame.height). */
  box: BoundingBox;
}

export interface ClassificationResult {
  classId: number;
  className: string;
  confidence: number;
}

export interface RawTensorResult {
  shape: number[];
  type: string;
  /** Первые N значений тензора. */
  values: number[];
  total: number;
}

export type InferenceResult =
  | { type: 'detection'; data: Detection[] }
  | { type: 'classification'; data: ClassificationResult[] }
  | { type: 'raw'; data: Record<string, RawTensorResult> };

export interface FrameSize {
  width: number;
  height: number;
}

export interface InferenceTimings {
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
}

export interface AnalysisEvent {
  id: string;
  timestamp: number;
  type: 'class_appeared' | 'class_disappeared' | 'limit_exceeded' | 'error' | 'info';
  message: string;
  details?: unknown;
}

export interface ModelConfig {
  task: TaskType;
  preprocess: PreprocessConfig;
  decoder: DecoderConfig;
  maxFps: number;
  preferredBackend: EngineBackend;
}

/** Конфигурация, которую получает движок: задача уже определена. */
export interface EngineConfig extends Omit<ModelConfig, 'task'> {
  task: ResolvedTask;
}