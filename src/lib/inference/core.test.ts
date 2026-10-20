// src/lib/inference/core.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeFrameTransform, modelBoxToFrame } from './geometry';
import { decodeYOLOv8 } from './postprocess/yolov8';
import { decodeYOLOv5 } from './postprocess/yolov5';
import { nonMaxSuppression } from './postprocess/nms';
import { decodeClassification } from './postprocess/classification';
import { parseLabels, COCO_LABELS } from './labels';
import { ClassPresenceTracker } from './presence';
import { detectTaskFromShapes } from './detect-task';
import { Detection } from '@/types/inference';

describe('Geometry', () => {
  it('letterbox', () => {
    const t = computeFrameTransform(1280, 720, 640, 640, true);
    expect(t.scaleX).toBe(0.5);
    expect(t.scaleY).toBe(0.5);
    expect(t.padX).toBe(0);
    expect(t.padY).toBe(140);

    // cx=300, cy=315, w=200, h=150
    const frameBox = modelBoxToFrame(300, 315, 200, 150, t);
    expect(frameBox.x).toBe(400);
    expect(frameBox.y).toBe(200);
    expect(frameBox.w).toBe(400);
    expect(frameBox.h).toBe(300);
  });

  it('no letterbox', () => {
    const t = computeFrameTransform(1280, 720, 640, 640, false);
    expect(t.scaleX).toBe(640 / 1280);
    expect(t.scaleY).toBe(640 / 720);
    expect(t.padX).toBe(0);
    expect(t.padY).toBe(0);
  });
});

describe('YOLOv8 Decode', () => {
  it('extracts detections correctly', () => {
    const t = computeFrameTransform(1280, 720, 640, 640, true);
    // tensor [1, 84, 8400]
    const output = new Float32Array(84 * 8400);
    const a = 0; // anchor 0
    output[0 * 8400 + a] = 300; // cx
    output[1 * 8400 + a] = 315; // cy
    output[2 * 8400 + a] = 200; // w
    output[3 * 8400 + a] = 150; // h
    output[(4 + 0) * 8400 + a] = 0.9; // class 0 conf

    const config = { confidenceThreshold: 0.5, iouThreshold: 0.45, maxDetections: 100, classFilter: [], topK: 5 };
    const dets = decodeYOLOv8(output, [1, 84, 8400], t, config);

    expect(dets.length).toBe(1);
    expect(dets[0].classId).toBe(0);
    expect(dets[0].confidence).toBeCloseTo(0.9);
    expect(dets[0].box.x).toBeCloseTo(400);
    expect(dets[0].box.y).toBeCloseTo(200);
    expect(dets[0].box.w).toBeCloseTo(400);
    expect(dets[0].box.h).toBeCloseTo(300);
  });
});

describe('YOLOv5 Decode', () => {
  it('extracts detections correctly', () => {
    const t = computeFrameTransform(1280, 720, 640, 640, true);
    // tensor [1, 10, 85] (10 anchors, 85 features)
    const output = new Float32Array(10 * 85);
    const a = 0;
    const baseIdx = a * 85;
    output[baseIdx + 0] = 300; // cx
    output[baseIdx + 1] = 315; // cy
    output[baseIdx + 2] = 200; // w
    output[baseIdx + 3] = 150; // h
    output[baseIdx + 4] = 0.9; // objectness
    output[baseIdx + 5 + 2] = 1.0; // class 2 conf (score = 0.9 * 1.0 = 0.9)

    const config = { confidenceThreshold: 0.5, iouThreshold: 0.45, maxDetections: 100, classFilter: [], topK: 5 };
    const dets = decodeYOLOv5(output, [1, 10, 85], t, config);

    expect(dets.length).toBe(1);
    expect(dets[0].classId).toBe(2);
    expect(dets[0].confidence).toBeCloseTo(0.9);
  });
});

describe('NMS', () => {
  it('suppresses overlapping boxes of same class', () => {
    const dets: Detection[] = [
      { classId: 0, className: 'car', confidence: 0.9, box: { x: 10, y: 10, w: 100, h: 100 } },
      { classId: 0, className: 'car', confidence: 0.8, box: { x: 15, y: 15, w: 100, h: 100 } }, // overlapping
      { classId: 1, className: 'person', confidence: 0.85, box: { x: 12, y: 12, w: 100, h: 100 } }, // diff class
    ];
    // Clone array to check mutation
    const input = [...dets];
    
    const result = nonMaxSuppression(input, 0.45, 100);
    
    expect(result.length).toBe(2);
    expect(result.find(d => d.classId === 0)?.confidence).toBe(0.9);
    expect(result.find(d => d.classId === 1)).toBeDefined();
    // Verify input not mutated
    expect(input.length).toBe(3);
  });
});

describe('Classification', () => {
  it('converts logits to softmax probabilities', () => {
    const output = new Float32Array([1.0, 2.0, 3.0]);
    const config = { confidenceThreshold: 0, iouThreshold: 0, maxDetections: 0, classFilter: [], topK: 3 };
    const res = decodeClassification(output, config);
    
    expect(res.length).toBe(3);
    expect(res[0].classId).toBe(2); // index 2 has highest logit
    const sum = res.reduce((acc, r) => acc + r.confidence, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('keeps probabilities if already softmaxed', () => {
    const output = new Float32Array([0.1, 0.7, 0.2]); // sum = 1
    const config = { confidenceThreshold: 0, iouThreshold: 0, maxDetections: 0, classFilter: [], topK: 3 };
    const res = decodeClassification(output, config);
    expect(res[0].confidence).toBeCloseTo(0.7);
  });
});

describe('Labels Parser', () => {
  it('parses txt', () => {
    const res = parseLabels('cat\ndog\n\nbird', 'labels.txt');
    expect(res).toEqual({ 0: 'cat', 1: 'dog', 2: 'bird' });
  });

  it('parses json array', () => {
    const res = parseLabels('["cat", "dog"]', 'labels.json');
    expect(res).toEqual({ 0: 'cat', 1: 'dog' });
  });

  it('parses json object', () => {
    const res = parseLabels('{"10": "cat", "20": "dog"}', 'labels.json');
    expect(res).toEqual({ 10: 'cat', 20: 'dog' });
  });

  it('throws on empty or invalid', () => {
    expect(() => parseLabels('', 'labels.txt')).toThrow();
    expect(() => parseLabels('[]', 'labels.json')).toThrow();
    expect(() => parseLabels('{}', 'labels.json')).toThrow();
  });

  it('verifies COCO_LABELS', () => {
    expect(Object.keys(COCO_LABELS).length).toBe(80);
    expect(COCO_LABELS[0]).toBe('person');
    expect(COCO_LABELS[79]).toBe('toothbrush');
  });
});

describe('Presence Tracker', () => {
  it('tracks appearances and disappearances', () => {
    const tracker = new ClassPresenceTracker(100);
    const r1 = tracker.update({ type: 'detection', data: [{ classId: 0, className: 'car', confidence: 0.9, box: { x: 0, y: 0, w: 10, h: 10 } }] }, 1000);
    expect(r1.appeared).toEqual(['car']);
    expect(r1.disappeared).toEqual([]);

    const r2 = tracker.update({ type: 'detection', data: [] }, 1050); // empty, but within holdMs
    expect(r2.appeared).toEqual([]);
    expect(r2.disappeared).toEqual([]);

    const r3 = tracker.update({ type: 'detection', data: [] }, 1150); // past holdMs
    expect(r3.appeared).toEqual([]);
    expect(r3.disappeared).toEqual(['car']);
  });
});

describe('Task Detection', () => {
  it('detects YOLOv8', () => {
    const res = detectTaskFromShapes([{ name: 'out', shape: [1, 84, 8400], type: 'float32' }]);
    expect(res.task).toBe('yolov8');
    expect(res.numClasses).toBe(80);
  });

  it('detects YOLOv5', () => {
    const res = detectTaskFromShapes([{ name: 'out', shape: [1, 25200, 85], type: 'float32' }]);
    expect(res.task).toBe('yolov5');
    expect(res.numClasses).toBe(80);
  });

  it('detects Classification', () => {
    const res = detectTaskFromShapes([{ name: 'out', shape: [1, 1000], type: 'float32' }]);
    expect(res.task).toBe('classification');
    expect(res.numClasses).toBe(1000);
  });

  it('falls back to raw', () => {
    const res = detectTaskFromShapes([{ name: 'out', shape: [1, 3, 8, 8], type: 'float32' }]);
    expect(res.task).toBe('raw');
  });
});