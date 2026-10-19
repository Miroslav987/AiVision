import { InferenceEngine, EngineContext } from './engine';
import { ModelInfo } from '@/types/inference';

export class RemoteEngine implements InferenceEngine {
  async init(): Promise<void> {}
  async load(): Promise<ModelInfo> {
    throw new Error('Реализация RemoteEngine будет добавлена на этапе 7 (Сервер инференса).');
  }
  configure(): void {}
  async infer(): Promise<any> { throw new Error('Not implemented'); }
  async unload(): Promise<void> {}
  async dispose(): Promise<void> {}
}