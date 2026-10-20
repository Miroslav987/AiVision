import { RawTensorResult } from '@/types/inference';

export function extractRawTensors(
  tensors: Record<string, { dims: readonly number[]; type: string; data: ArrayLike<number | bigint> }>
): Record<string, RawTensorResult> {
  const result: Record<string, RawTensorResult> = {};

  for (const [name, tensor] of Object.entries(tensors)) {
    const total = tensor.data.length;
    const sliceLen = Math.min(total, 64);
    const values = new Array<number>(sliceLen);

    for (let i = 0; i < sliceLen; i++) {
      values[i] = Number(tensor.data[i]);
    }

    result[name] = {
      shape: Array.from(tensor.dims),
      values,
      total,
      type: tensor.type
    };
  }

  return result;
}