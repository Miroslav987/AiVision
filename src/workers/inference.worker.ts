// src/workers/inference.worker.ts
import { WorkerRequest, WorkerResponse } from '@/types/worker';
import { InferenceEngine } from '@/lib/inference/engines/engine';
import { OnnxEngine } from '@/lib/inference/engines/onnx';
import { UnsupportedEngine } from '@/lib/inference/engines/unsupported';

let engine: InferenceEngine | null = null;
let switching = false;
let inflight: Promise<any> | null = null;
let queue: Promise<void> = Promise.resolve();

function send(msg: WorkerResponse, transfer: Transferable[] = []) {
  (self as unknown as { postMessage(m: WorkerResponse, t: Transferable[]): void }).postMessage(msg, transfer);
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  
  if (req.type === 'infer') {
    if (switching || !engine || inflight !== null) {
      req.bitmap.close();
      const reason = switching ? 'loading' : (!engine ? 'no-model' : 'busy');
      send({ type: 'skipped', requestId: req.requestId, reason });
      return;
    }
    const frame = { width: req.bitmap.width, height: req.bitmap.height };
    inflight = engine.infer(req.bitmap)
      .then(out => {
        send({ type: 'result', requestId: req.requestId, result: out.result, timings: out.timings, frame });
      })
      .catch(err => {
        send({ type: 'error', requestId: req.requestId, message: err instanceof Error ? err.message : String(err) });
      })
      .finally(() => {
        req.bitmap.close();
        inflight = null;
      });
    return;
  }

  queue = queue.then(() => handleControl(req)).catch(() => {});
};

async function handleControl(req: WorkerRequest): Promise<void> {
  try {
    switch (req.type) {
      case 'load': {
        switching = true;
        if (inflight) await inflight.catch(() => {});
        if (engine) await engine.dispose();
        
        let newEngine: InferenceEngine;
        if (req.format === 'onnx') {
          newEngine = new OnnxEngine();
        } else {
          newEngine = new UnsupportedEngine(`Формат ${req.format} пока не поддерживается, конвертируйте модель в ONNX`);
        }
        
        try {
          const info = await newEngine.load(
            { files: req.files, format: req.format, config: req.config, labels: req.labels },
            (progress, message) => send({ type: 'progress', requestId: req.requestId, progress, message })
          );
          engine = newEngine;
          send({ type: 'loaded', requestId: req.requestId, info });
        } catch (e) {
          await newEngine.dispose();
          throw e;
        } finally {
          switching = false;
        }
        break;
      }
      case 'configure': {
        if (engine) engine.configure(req.config, req.labels);
        send({ type: 'configured', requestId: req.requestId });
        break;
      }
      case 'unload': {
        switching = true;
        if (inflight) await inflight.catch(() => {});
        if (engine) await engine.dispose();
        engine = null;
        send({ type: 'unloaded', requestId: req.requestId });
        switching = false;
        break;
      }
      case 'dispose': {
        switching = true;
        if (inflight) await inflight.catch(() => {});
        if (engine) await engine.dispose();
        self.close();
        break;
      }
    }
  } catch (e) {
    send({ type: 'error', requestId: req.requestId, message: e instanceof Error ? e.message : String(e) });
    if (req.type === 'load' || req.type === 'unload' || req.type === 'dispose') {
      switching = false;
    }
  }
}