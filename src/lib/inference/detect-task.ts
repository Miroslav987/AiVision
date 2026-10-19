import { TaskType, TensorInfo } from '@/types/inference';

export interface TaskDetectionResult {
  task: TaskType;
  confidence: number;
  explanation: string;
}

export function detectTaskFromShapes(outputs: TensorInfo[]): TaskDetectionResult {
  if (outputs.length === 0) return { task: 'raw', confidence: 1.0, explanation: 'Нет информации о выходах' };

  const firstOut = outputs[0];
  const shape = firstOut.shape;

  // YOLOv8: [1, 4 + classes, anchors] (e.g., [1, 84, 8400])
  if (shape.length === 3 && shape[0] === 1 && typeof shape[1] === 'number' && typeof shape[2] === 'number') {
    if (shape[2] > shape[1] && shape[1] >= 5) {
      return { 
        task: 'yolov8', 
        confidence: 0.9, 
        explanation: `Форма ${JSON.stringify(shape)} похожа на YOLOv8 (batch=1, features=${shape[1]}, anchors=${shape[2]}).` 
      };
    }
  }

  // YOLOv5: [1, anchors, 5 + classes] (e.g., [1, 25200, 85])
  if (shape.length === 3 && shape[0] === 1 && typeof shape[1] === 'number' && typeof shape[2] === 'number') {
    if (shape[1] > shape[2] && shape[2] >= 6) {
      return { 
        task: 'yolov5', 
        confidence: 0.9, 
        explanation: `Форма ${JSON.stringify(shape)} похожа на YOLOv5 (batch=1, anchors=${shape[1]}, features=${shape[2]}).` 
      };
    }
  }

  // Классификация: [1, classes]
  if (shape.length === 2 && shape[0] === 1 && typeof shape[1] === 'number') {
    return {
      task: 'classification',
      confidence: 0.8,
      explanation: `Двумерная форма ${JSON.stringify(shape)} типична для классификации (batch=1, classes=${shape[1]}).`
    };
  }

  return {
    task: 'raw',
    confidence: 1.0,
    explanation: `Форма ${JSON.stringify(shape)} не распознана. Будет выведен сырой результат тензоров.`
  };
}