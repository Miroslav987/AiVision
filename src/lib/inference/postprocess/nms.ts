import { Detection } from '@/types/inference';

/**
 * Class-aware Non-Maximum Suppression.
 * Использует смещение координат на основе ID класса, чтобы не считать IoU между разными классами.
 */
export function nonMaxSuppression(
  detections: Detection[],
  iouThreshold: number,
  maxDetections: number
): Detection[] {
  if (detections.length === 0) return [];

  // Сортируем по уверенности (от большего к меньшему)
  detections.sort((a, b) => b.confidence - a.confidence);

  const selected: Detection[] = [];
  const maxClassOffset = 4096; // Смещение для сепарации классов

  for (const current of detections) {
    if (selected.length >= maxDetections) break;

    let shouldSelect = true;
    const cOffset = current.classId * maxClassOffset;
    const cBox = current.box;

    for (const prior of selected) {
      if (current.classId !== prior.classId) continue; // Оптимизация (или offset-подход)

      const pBox = prior.box;
      
      // Вычисление Intersection over Union (IoU)
      const xA = Math.max(cBox.x, pBox.x);
      const yA = Math.max(cBox.y, pBox.y);
      const xB = Math.min(cBox.x + cBox.w, pBox.x + pBox.w);
      const yB = Math.min(cBox.y + cBox.h, pBox.y + pBox.h);

      const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
      if (interArea === 0) continue;

      const cArea = cBox.w * cBox.h;
      const pArea = pBox.w * pBox.h;
      const unionArea = cArea + pArea - interArea;
      const iou = interArea / unionArea;

      if (iou > iouThreshold) {
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