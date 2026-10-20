// src/lib/inference/client.ts
import { WorkerRequest, WorkerResponse, DistributiveOmit } from '@/types/worker';
import { ModelConfig, ModelFormat, ModelInfo, InferenceResult, InferenceTimings } from '@/types/inference';

type PromiseResolvers = { resolve: (val: unknown) => void, reject: (err: unknown) => void, timeout?: ReturnType<typeof setTimeout> };

export class InferenceClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PromiseResolvers>();
  public onProgress?: (p: number, msg: string) => void;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    this.worker = new Worker(new URL('@/workers/inference.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(e: MessageEvent<WorkerResponse>) {
    const res = e.data;
    
    if (res.type === 'progress' && this.onProgress) {
      this.onProgress(res.progress, res.message);
      return;
    }

    const resolvers = this.pendingRequests.get(res.requestId);
    if (!resolvers) return;

    if (resolvers.timeout) clearTimeout(resolvers.timeout);
    this.pendingRequests.delete(res.requestId);

    if (res.type === 'error') {
      resolvers.reject(new Error(res.message));
    } else {
      resolvers.resolve(res);
    }
  }

  private send<T>(req: DistributiveOmit<WorkerRequest, 'requestId'>, transfer: Transferable[] = [], timeoutMs = 30000): Promise<T> {
    if (!this.worker) throw new Error('Worker не инициализирован');
    
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Таймаут запроса ${req.type}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.worker!.postMessage({ ...req, requestId } as WorkerRequest, transfer);
    });
  }

  async load(modelUrl: string, format: ModelFormat, config: ModelConfig, labels?: Record<number, string>): Promise<ModelInfo> {
    const res = await this.send<{info: ModelInfo}>({ type: 'load', modelUrl, format, config, labels }, [], 60000);
    return res.info;
  }

  async configure(config: ModelConfig): Promise<void> {
    await this.send({ type: 'configure', config }, [], 5000);
  }

  async infer(bitmap: ImageBitmap): Promise<{result: InferenceResult, timings: InferenceTimings}> {
    // Таймаут для инференса короткий - если висит, лучше отбросить
    return await this.send({ type: 'infer', bitmap }, [bitmap], 5000);
  }

  async unload(): Promise<void> {
    await this.send({ type: 'unload' });
  }

  dispose() {
    if (this.worker) {
      this.worker.postMessage({ type: 'dispose', requestId: 'sync' });
      this.worker.terminate();
      this.worker = null;
    }
  }
}