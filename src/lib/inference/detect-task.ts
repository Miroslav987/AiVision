// src/lib/inference/detect-task.ts
import { ResolvedTask, TensorInfo } from '@/types/inference';

export interface TaskDetectionResult {
  task: ResolvedTask;
  confidence: number;
  explanation: string;
  numClasses?: number;
}

export function detectTaskFromShapes(outputs: TensorInfo[]): TaskDetectionResult {
  if (outputs.length === 0) {
    return { task: 'raw', confidence: 1.0, explanation: 'Нет информации о выходах' };
  }

  const shape = outputs[0].shape;

  // Проверяем, что все элементы массива — положительные числа
  const isAllPositiveNumbers = shape.every(
    (dim): dim is number => typeof dim === 'number' && dim > 0
  );

  if (!isAllPositiveNumbers) {
    return {
      task: 'raw',
      confidence: 1.0,
      explanation: `Форма [${shape.join(', ')}] содержит нечисловые или нулевые оси, определён как сырой вывод.`
    };
  }

  const dims = shape as number[];

  // YOLOv8/YOLO11: [1, 4 + classes, anchors]
  if (dims.length === 3 && dims[0] === 1) {
    const d1 = dims[1];
    const d2 = dims[2];

    if (d2 > d1 && d1 >= 5) {
      return { 
        task: 'yolov8', 
        confidence: 0.9, 
        explanation: `Форма [${dims.join(', ')}] похожа на YOLOv8 (features=${d1}, anchors=${d2}).`,
        numClasses: d1 - 4
      };
    }

    // YOLOv5: [1, anchors, 5 + classes]
    if (d1 > d2 && d2 >= 6) {
      return { 
        task: 'yolov5', 
        confidence: 0.9, 
        explanation: `Форма [${dims.join(', ')}] похожа на YOLOv5 (anchors=${d1}, features=${d2}).`,
        numClasses: d2 - 5
      };
    }
  }

  // Классификация: [1, classes]
  if (dims.length === 2 && dims[0] === 1) {
    return {
      task: 'classification',
      confidence: 0.8,
      explanation: `Форма [${dims.join(', ')}] типична для классификации (classes=${dims[1]}).`,
      numClasses: dims[1]
    };
  }

  return {
    task: 'raw',
    confidence: 1.0,
    explanation: `Форма [${shape.join(', ')}] не распознана. Будет выведен сырой результат.`
  };
}