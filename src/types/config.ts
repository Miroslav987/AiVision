export type Normalization = '0-1' | 'imagenet' | 'none' | { mean: number[]; std: number[] };

export interface PreprocessConfig {
  inputWidth: number;
  inputHeight: number;
  layout: 'NCHW' | 'NHWC';
  channels: 'RGB' | 'BGR';
  normalization: Normalization;
  letterbox: boolean;
}

export interface DecoderConfig {
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
  topK: number;
  classFilter: number[];
}