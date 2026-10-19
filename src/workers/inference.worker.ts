import { WorkerRequest, WorkerResponse } from '@/types/worker';
import { InferenceEngine } from '@/lib/inference/engines/engine';
import { OnnxEngine } from '@/lib/inference/engines/onnx';
import { TfjsEngine } from '@/lib/inference/engines/tfjs';
import { TfliteEngine } from '@/lib/inference/engines/tflite';
import { RemoteEngine } from '@/lib/inference/engines/remote';

let activeEngine: InferenceEngine | null = null;
let isBusy = false;
let isInitializing = false; // Исправление 2: Флаг глобальной блокировки при смене движка

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  
  try {
    switch (req.type) {
      case 'init':
        send({ type: 'ready', requestId: req.requestId });
        break;

      case 'load':
        isInitializing = true;
        if (activeEngine) {
          await activeEngine.unload();
          activeEngine = null;
        }
        
        let newEngine: InferenceEngine;
        switch(req.format) {
          case 'onnx': newEngine = new OnnxEngine(); break;
          case 'tfjs-graph':
          case 'tfjs-layers': newEngine = new TfjsEngine(); break;
          case 'tflite': newEngine = new TfliteEngine(); break;
          default: throw new Error(`Формат ${req.format} не поддерживается`);
        }
        
        await newEngine.init();
        const info = await newEngine.load(
          { modelUrl: req.modelUrl, format: req.format, config: req.config, labels: req.labels },
          (progress, message) => send({ type: 'progress', requestId: req.requestId, progress, message })
        );
        activeEngine = newEngine;
        isInitializing = false;
        send({ type: 'loaded', requestId: req.requestId, info });
        break;

      case 'configure':
        if (activeEngine) activeEngine.configure(req.config);
        send({ type: 'configured', requestId: req.requestId });
        break;

      case 'infer':
        // Исправление 2: Сбрасываем кадр, если модель грузится
        if (isBusy || isInitializing || !activeEngine) {
          req.bitmap.close();
          return;
        }
        isBusy = true;
        try {
          const { result, timings } = await activeEngine.infer(req.bitmap);
          send({ type: 'result', requestId: req.requestId, result, timings });
        } finally {
          req.bitmap.close();
          isBusy = false;
        }
        break;

      case 'unload':
        isInitializing = true;
        if (activeEngine) {
          await activeEngine.unload();
          activeEngine = null;
        }
        isInitializing = false;
        send({ type: 'unloaded', requestId: req.requestId });
        break;

      case 'dispose':
        isInitializing = true;
        if (activeEngine) await activeEngine.dispose();
        self.close();
        break;
    }
  } catch (error) {
    isInitializing = false;
    isBusy = false;
    send({ 
      type: 'error', 
      requestId: req.requestId, 
      message: error instanceof Error ? error.message : 'Неизвестная ошибка воркера',
      errorDetail: error 
    });
  }
};

function send(msg: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(msg, transfer);
}