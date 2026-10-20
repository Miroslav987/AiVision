// src/lib/inference/postprocess/decode.ts
import { EngineConfig, InferenceResult, Labels } from '@/types/inference';
import { FrameTransform } from '../geometry';
import { decodeYOLOv8 } from './yolov8';
import { decodeYOLOv5 } from './yolov5';
import { decodeClassification } from './classification';
import { extractRawTensors } from './raw';

export function toFloat32(data: ArrayLike<number | bigint>): Float32Array {
  if (data instanceof Float32Array) {
    return data;
  }

  const res = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    res[i] = Number(data[i]);
  }
  
  return res;
}

export function decodeOutputs(
  config: EngineConfig,
  outputs: Record<string, { dims: readonly number[]; type: string; data: ArrayLike<number | bigint> }>,
  firstName: string,
  t: FrameTransform,
  labels?: Labels
): InferenceResult {
  const first = outputs[firstName];
  
  switch (config.task) {
    case 'yolov8':
      return { type: 'detection', data: decodeYOLOv8(toFloat32(first.data), first.dims, t, config.decoder, labels) };
    case 'yolov5':
      return { type: 'detection', data: decodeYOLOv5(toFloat32(first.data), first.dims, t, config.decoder, labels) };
    case 'classification':
      return { type: 'classification', data: decodeClassification(toFloat32(first.data), config.decoder, labels) };
    case 'raw':
      return { type: 'raw', data: extractRawTensors(outputs) };
  }
}