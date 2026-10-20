export function toFloat32(data: ArrayLike<number | bigint>): Float32Array {
  if (data instanceof Float32Array) {
    return data;
  }

  const res = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    res[i] = Number(data[i]);
  }
  
  return res;
}