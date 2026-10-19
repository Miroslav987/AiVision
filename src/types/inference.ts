import { DecoderConfig, PreprocessConfig } from "./config";

export type ModelFormat = 'onnx' | 'tfjs-graph' | 'tfjs-layers' | 'tflite' | 'unsupported';
export type EngineBackend = 'webgpu' | 'wasm' | 'webgl' | 'remote' | 'cpu';
export type TaskType = 'yolov8' | 'yolov5' | 'classification' | 'raw' | 'auto';
export type DataType = 'float32' | 'int32' | 'int64' | 'uint8' | 'unknown';

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
  inputs: TensorInfo[];
  outputs: TensorInfo[];
  labels?: Record<number, string>;
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
  box: BoundingBox;
}

export interface ClassificationResult {
  classId: number;
  className: string;
  confidence: number;
}

export interface RawTensorResult {
  shape: number[];
  values: Float32Array | Int32Array;
}

export type InferenceResult = 
  | { type: 'detection'; data: Detection[] }
  | { type: 'classification'; data: ClassificationResult[] }
  | { type: 'raw'; data: Record<string, RawTensorResult> };

export interface InferenceTimings {
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
}

export interface AnalysisEvent {
  id: string;
  timestamp: number;
  type: 'class_appeared' | 'class_disappeared' | 'limit_exceeded' | 'error';
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