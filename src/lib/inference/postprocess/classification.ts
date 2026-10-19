import { ClassificationResult } from '@/types/inference';
import { DecoderConfig } from '@/types/config';

export function decodeClassification(
  output: Float32Array,
  config: DecoderConfig,
  labels?: Record<number, string>
): ClassificationResult[] {
  const probs: ClassificationResult[] = [];
  
  // Применяем Softmax (предполагая, что выход - логиты, если сумма != 1, хотя для надежности лучше сделать)
  const maxLogit = Math.max(...Array.from(output));
  let sum = 0;
  const exps = new Float32Array(output.length);
  
  for (let i = 0; i < output.length; i++) {
    exps[i] = Math.exp(output[i] - maxLogit);
    sum += exps[i];
  }

  for (let i = 0; i < output.length; i++) {
    probs.push({
      classId: i,
      className: labels?.[i] || `Class ${i}`,
      confidence: exps[i] / sum
    });
  }

  return probs
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, config.topK);
}