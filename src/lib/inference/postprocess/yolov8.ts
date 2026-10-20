// src/lib/inference/postprocess/yolov8.ts
import { Detection, Labels } from '@/types/inference';
import { DecoderConfig } from '@/types/config';
import { nonMaxSuppression } from './nms';
import { FrameTransform, modelBoxToFrame } from '../geometry';

export function decodeYOLOv8(
  output: Float32Array,
  shape: readonly number[],
  t: FrameTransform,
  config: DecoderConfig,
  labels?: Labels
): Detection[] {
  if (shape.length !== 3) {
    throw new Error(`Неожиданная форма тензора для YOLOv8: [${shape.join(', ')}]. Ожидалось [1, 4+C, N].`);
  }

  const [, features, anchors] = shape;
  const numClasses = features - 4;
  
  if (numClasses < 1) {
    throw new Error(`Некорректное число классов: ${numClasses} (форма [${shape.join(', ')}]).`);
  }

  const detections: Detection[] = [];
  const classFilterSet = config.classFilter.length > 0 ? new Set(config.classFilter) : null;

  for (let a = 0; a < anchors; a++) {
    let maxConf = 0;
    let classId = -1;

    for (let c = 0; c < numClasses; c++) {
      const conf = output[(4 + c) * anchors + a];
      if (conf > maxConf) {
        maxConf = conf;
        classId = c;
      }
    }

    if (maxConf < config.confidenceThreshold) continue;
    if (classFilterSet && !classFilterSet.has(classId)) continue;

    const cx = output[0 * anchors + a];
    const cy = output[1 * anchors + a];
    const w = output[2 * anchors + a];
    const h = output[3 * anchors + a];

    const frameBox = modelBoxToFrame(cx, cy, w, h, t);

    detections.push({
      classId,
      className: labels?.[classId] ?? `Class ${classId}`,
      confidence: maxConf,
      box: frameBox
    });
  }

  return nonMaxSuppression(detections, config.iouThreshold, config.maxDetections);
}