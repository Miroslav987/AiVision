import { describe, it, expect } from 'vitest';
import { nonMaxSuppression } from './postprocess/nms';
import { detectTaskFromShapes } from './detect-task';
import { Detection } from '@/types/inference';

describe('Inference NMS', () => {
  it('should remove overlapping boxes of same class', () => {
    const detections: Detection[] = [
      { classId: 0, className: 'car', confidence: 0.9, box: { x: 10, y: 10, w: 100, h: 100 } },
      // Сильно пересекается с первым, confidence ниже - должен удалиться
      { classId: 0, className: 'car', confidence: 0.8, box: { x: 15, y: 15, w: 90, h: 90 } },
      // Другой класс, пересекается - НЕ должен удалиться
      { classId: 1, className: 'person', confidence: 0.85, box: { x: 12, y: 12, w: 95, h: 95 } },
      // Далеко, тот же класс - НЕ должен удалиться
      { classId: 0, className: 'car', confidence: 0.7, box: { x: 200, y: 200, w: 50, h: 50 } }
    ];

    const result = nonMaxSuppression(detections, 0.45, 100);
    expect(result.length).toBe(3);
    expect(result.find(d => d.confidence === 0.8)).toBeUndefined();
  });
});

describe('Task Detection', () => {
  it('should detect YOLOv8', () => {
    const res = detectTaskFromShapes([{ name: 'output0', shape: [1, 84, 8400], type: 'float32' }]);
    expect(res.task).toBe('yolov8');
  });

  it('should detect YOLOv5', () => {
    const res = detectTaskFromShapes([{ name: 'output', shape: [1, 25200, 85], type: 'float32' }]);
    expect(res.task).toBe('yolov5');
  });

  it('should detect Classification', () => {
    const res = detectTaskFromShapes([{ name: 'output', shape: [1, 1000], type: 'float32' }]);
    expect(res.task).toBe('classification');
  });
});