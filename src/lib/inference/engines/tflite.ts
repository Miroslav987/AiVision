import { InferenceEngine, EngineContext } from './engine';

export class TfliteEngine implements InferenceEngine {
  async init(): Promise<void> {}
  async load(): Promise<any> {
    throw new Error('Поддержка TFLite отключена в браузере из-за нестабильности WebGPU в Web Workers. Пожалуйста, конвертируйте модель в ONNX.');
  }
  configure(): void {}
  async infer(): Promise<any> { throw new Error('Not implemented'); }
  async unload(): Promise<void> {}
  async dispose(): Promise<void> {}
}