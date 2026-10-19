import { RawTensorResult } from '@/types/inference';

export function extractRawTensors(tensors: Record<string, { shape: readonly number[]; data: Float32Array | Int32Array }>): Record<string, RawTensorResult> {
  const result: Record<string, RawTensorResult> = {};
  for (const [name, tensor] of Object.entries(tensors)) {
    // Копируем первые 100 значений, чтобы не забивать память UI
    const values = tensor.data.slice(0, Math.min(tensor.data.length, 100));
    result[name] = {
      shape: Array.from(tensor.shape),
      values: values
    };
  }
  return result;
}