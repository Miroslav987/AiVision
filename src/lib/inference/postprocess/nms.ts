import { Detection, BoundingBox } from '@/types/inference';

export function iou(a: BoundingBox, b: BoundingBox): number {
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.w, b.x + b.w);
  const yB = Math.min(a.y + a.h, b.y + b.h);

  const interW = Math.max(0, xB - xA);
  const interH = Math.max(0, yB - yA);
  const intersection = interW * interH;

  if (intersection === 0) return 0;

  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - intersection;

  return intersection / union;
}

export function nonMaxSuppression(
  detections: Detection[],
  iouThreshold: number,
  maxDetections: number
): Detection[] {
  if (detections.length === 0) return [];

  // Создаем копию для сортировки
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const selected: Detection[] = [];

  for (const current of sorted) {
    if (selected.length >= maxDetections) break;

    let shouldSelect = true;

    for (const prior of selected) {
      // Class-aware NMS
      if (current.classId !== prior.classId) continue;

      if (iou(current.box, prior.box) > iouThreshold) {
        shouldSelect = false;
        break;
      }
    }

    if (shouldSelect) {
      selected.push(current);
    }
  }

  return selected;
}