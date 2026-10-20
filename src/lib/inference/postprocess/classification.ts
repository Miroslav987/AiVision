import { ClassificationResult, Labels } from '@/types/inference';
import { DecoderConfig } from '@/types/config';

export function decodeClassification(
  output: Float32Array,
  config: DecoderConfig,
  labels?: Labels
): ClassificationResult[] {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < output.length; i++) {
    const v = output[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  let probs: Float32Array;

  // Проверка: если сумма близка к 1 и все в [0, 1], считаем, что это уже вероятности (Softmax или Sigmoid применены в графе)
  if (Math.abs(sum - 1.0) < 1e-3 && min >= 0 && max <= 1) {
    probs = output;
  } else {
    probs = new Float32Array(output.length);
    let expSum = 0;
    for (let i = 0; i < output.length; i++) {
      const e = Math.exp(output[i] - max); // стабильный softmax
      probs[i] = e;
      expSum += e;
    }
    for (let i = 0; i < output.length; i++) {
      probs[i] /= expSum;
    }
  }

  const results: ClassificationResult[] = [];
  for (let i = 0; i < probs.length; i++) {
    results.push({
      classId: i,
      className: labels?.[i] ?? `Class ${i}`,
      confidence: probs[i]
    });
  }

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, config.topK);
}