import { Detection } from '@/types/inference';
import { PreprocessResult } from '../preprocess';
import { DecoderConfig } from '@/types/config';
import { nonMaxSuppression } from './nms';

/**
 * Декодер для YOLOv8/YOLO11.
 * Ожидаемый вход: [1, 4 + classes, anchors]
 */
export function decodeYOLOv8(
  output: Float32Array,
  shape: number[],
  prep: PreprocessResult,
  config: DecoderConfig,
  labels?: Record<number, string>
): Detection[] {
  // Shape: [batch, features, anchors]
  const [, features, anchors] = shape;
  const numClasses = features - 4;
  const detections: Detection[] = [];

  for (let a = 0; a < anchors; a++) {
    // Находим максимальный класс
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
    if (config.classFilter.length > 0 && !config.classFilter.includes(classId)) continue;

    // Координаты в системе модели (cx, cy, w, h)
    const cx = output[0 * anchors + a];
    const cy = output[1 * anchors + a];
    const w  = output[2 * anchors + a];
    const h  = output[3 * anchors + a];

    // Перевод в пиксели оригинального кадра с учетом letterbox
    const origX = ((cx - w / 2) - prep.padX) / prep.scale;
    const origY = ((cy - h / 2) - prep.padY) / prep.scale;
    const origW = w / prep.scale;
    const origH = h / prep.scale;

    detections.push({
      classId,
      className: labels?.[classId] || `Class ${classId}`,
      confidence: maxConf,
      box: { x: origX, y: origY, w: origW, h: origH }
    });
  }

  return nonMaxSuppression(detections, config.iouThreshold, config.maxDetections);
}