// src/lib/inference/clientSingleton.ts
import { InferenceClient } from './client';

let instance: InferenceClient | null = null;

export function getGlobalInferenceClient(): InferenceClient {
  if (typeof window === 'undefined') {
    throw new Error('InferenceClient можно использовать только в браузере');
  }
  if (!instance) {
    instance = new InferenceClient();
  }
  return instance;
}

export function resetGlobalInferenceClient(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}