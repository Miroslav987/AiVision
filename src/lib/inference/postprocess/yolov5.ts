// src/lib/inference/postprocess/yolov5.ts
import { Detection, Labels } from '@/types/inference';
import { DecoderConfig } from '@/types/config';
import { FrameTransform, modelBoxToFrame } from '../geometry';
import { nonMaxSuppression } from './nms';

export function decodeYOLOv5(
  output: Float32Array,
  shape: readonly number[],
  t: FrameTransform,
  config: DecoderConfig,
  labels?: Labels
): Detection[] {
  if (shape.length !== 3) {
    throw new Error(`Неожиданная форма тензора для YOLOv5: [${shape.join(', ')}]. Ожидалось [1, N, 5+C].`);
  }

  const [, anchors, features] = shape;
  const numClasses = features - 5;

  if (numClasses < 1) {
    throw new Error(`Некорректное число классов: ${numClasses} (форма [${shape.join(', ')}]).`);
  }

  const detections: Detection[] = [];
  const classFilterSet = config.classFilter.length > 0 ? new Set(config.classFilter) : null;

  for (let a = 0; a < anchors; a++) {
    const baseIdx = a * features;
    const objectness = output[baseIdx + 4];

    if (objectness < config.confidenceThreshold) continue;

    let maxClassProb = 0;
    let classId = -1;

    for (let c = 0; c < numClasses; c++) {
      const prob = output[baseIdx + 5 + c];
      if (prob > maxClassProb) {
        maxClassProb = prob;
        classId = c;
      }
    }

    const score = objectness * maxClassProb;

    if (score < config.confidenceThreshold) continue;
    if (classFilterSet && !classFilterSet.has(classId)) continue;

    const cx = output[baseIdx + 0];
    const cy = output[baseIdx + 1];
    const w = output[baseIdx + 2];
    const h = output[baseIdx + 3];

    const frameBox = modelBoxToFrame(cx, cy, w, h, t);

    detections.push({
      classId,
      className: labels?.[classId] ?? `Class ${classId}`,
      confidence: score,
      box: frameBox
    });
  }

  return nonMaxSuppression(detections, config.iouThreshold, config.maxDetections);
}