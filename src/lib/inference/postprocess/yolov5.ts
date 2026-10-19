import { Detection } from '@/types/inference';
import { PreprocessResult } from '../preprocess';
import { DecoderConfig } from '@/types/config';
import { nonMaxSuppression } from './nms';

/**
 * Декодер для YOLOv5.
 * Ожидаемый вход: [1, anchors, 5 + classes]
 */
export function decodeYOLOv5(
  output: Float32Array,
  shape: number[],
  prep: PreprocessResult,
  config: DecoderConfig,
  labels?: Record<number, string>
): Detection[] {
  const anchors = shape[1];
  const features = shape[2];
  const numClasses = features - 5;
  const detections: Detection[] = [];

  for (let a = 0; a < anchors; a++) {
    const offset = a * features;
    const objConf = output[offset + 4];
    
    if (objConf < config.confidenceThreshold) continue;

    let maxClassConf = 0;
    let classId = -1;
    
    for (let c = 0; c < numClasses; c++) {
      const conf = output[offset + 5 + c];
      if (conf > maxClassConf) {
        maxClassConf = conf;
        classId = c;
      }
    }

    const score = objConf * maxClassConf;
    if (score < config.confidenceThreshold) continue;
    if (config.classFilter.length > 0 && !config.classFilter.includes(classId)) continue;

    const cx = output[offset + 0];
    const cy = output[offset + 1];
    const w  = output[offset + 2];
    const h  = output[offset + 3];

    const origX = ((cx - w / 2) - prep.padX) / prep.scale;
    const origY = ((cy - h / 2) - prep.padY) / prep.scale;
    const origW = w / prep.scale;
    const origH = h / prep.scale;

    detections.push({
      classId,
      className: labels?.[classId] || `Class ${classId}`,
      confidence: score,
      box: { x: origX, y: origY, w: origW, h: origH }
    });
  }

  return nonMaxSuppression(detections, config.iouThreshold, config.maxDetections);
}