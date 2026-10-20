// src/lib/inference/client.ts
import { WorkerRequest, WorkerResponse, DistributiveOmit } from '@/types/worker';
import { ModelFormat, ModelInfo, EngineConfig, Labels } from '@/types/inference';

type PromiseResolvers = { resolve: (val: any) => void; reject: (err: Error) => void; timeout?: ReturnType<typeof setTimeout> };

export type InferResponse = Extract<WorkerResponse, { type: 'result' }>;

export class InferenceClient {
  private worker: Worker;
  private pending = new Map<string, PromiseResolvers>();
  public onProgress?: (p: number, msg: string) => void;

  constructor() {
    this.worker = new Worker(new URL('../../workers/inference.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = (e) => this.rejectAll(`Ошибка Worker: ${e.message}`);
  }

  private handleMessage(e: MessageEvent<WorkerResponse>) {
    const res = e.data;
    if (res.type === 'progress') {
      this.onProgress?.(res.progress, res.message);
      return;
    }

    const resolvers = this.pending.get(res.requestId);
    if (!resolvers) return;

    if (resolvers.timeout) clearTimeout(resolvers.timeout);
    this.pending.delete(res.requestId);

    if (res.type === 'error') {
      resolvers.reject(new Error(res.message));
    } else {
      resolvers.resolve(res);
    }
  }

  private rejectAll(msg: string) {
    const err = new Error(msg);
    for (const { reject, timeout } of this.pending.values()) {
      if (timeout) clearTimeout(timeout);
      reject(err);
    }
    this.pending.clear();
  }

  private request<T extends WorkerResponse>(
    req: DistributiveOmit<WorkerRequest, 'requestId'>,
    transfer: Transferable[],
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Таймаут запроса ${req.type}`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeout });
      this.worker.postMessage({ ...req, requestId } as WorkerRequest, transfer);
    });
  }

  async load(files: File[], format: ModelFormat, config: EngineConfig, labels?: Labels): Promise<ModelInfo> {
    const res = await this.request<Extract<WorkerResponse, { type: 'loaded' }>>(
      { type: 'load', files, format, config, labels },
      [],
      180000
    );
    return res.info;
  }

  async configure(config: EngineConfig, labels?: Labels): Promise<void> {
    await this.request({ type: 'configure', config, labels }, [], 10000);
  }

  async infer(bitmap: ImageBitmap): Promise<InferResponse | null> {
    const res = await this.request<Extract<WorkerResponse, { type: 'result' } | { type: 'skipped' }>>(
      { type: 'infer', bitmap },
      [bitmap],
      15000
    );
    return res.type === 'skipped' ? null : res;
  }

  async unload(): Promise<void> {
    await this.request({ type: 'unload' }, [], 30000);
  }

  dispose(): void {
    this.rejectAll('Worker уничтожен');
    this.worker.postMessage({ type: 'dispose', requestId: crypto.randomUUID() });
    this.worker.terminate();
  }
}