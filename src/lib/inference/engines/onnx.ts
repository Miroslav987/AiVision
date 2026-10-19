import * as ort from 'onnxruntime-web';
import { InferenceEngine, EngineContext } from './engine';
import { ModelInfo, InferenceResult, InferenceTimings, TaskType, TensorInfo, ModelConfig } from '@/types/inference';
import { ImagePreprocessor } from '../preprocess';
import { decodeYOLOv8, decodeYOLOv5, decodeClassification, extractRawTensors } from '../postprocess';

// Устанавливаем путь к WASM (без бандлера)
ort.env.wasm.wasmPaths = '/ort/';

export class OnnxEngine implements InferenceEngine {
  private session: ort.InferenceSession | null = null;
  private ctx: EngineContext | null = null;
  private preprocessor = new ImagePreprocessor();
  private modelInfo: ModelInfo | null = null;

  async init(): Promise<void> {
    ort.env.wasm.numThreads = crossOriginIsolated ? navigator.hardwareConcurrency : 1;
  }

  async load(ctx: EngineContext, onProgress: (p: number, msg: string) => void): Promise<ModelInfo> {
    this.ctx = ctx;
    onProgress(10, 'Инициализация сессии ONNX...');

    const ep = ctx.config.preferredBackend === 'webgpu' ? 'webgpu' : 'wasm';
    
    try {
      this.session = await ort.InferenceSession.create(ctx.modelUrl, {
        executionProviders: [ep, 'wasm'],
        graphOptimizationLevel: 'all'
      });
    } catch (e) {
      throw new Error(`Ошибка загрузки ONNX: ${e instanceof Error ? e.message : String(e)}`);
    }

    onProgress(60, 'Сбор метаданных и прогрев...');
    
    // Сбор метаданных
    const inputNames = this.session.inputNames;
    const outputNames = this.session.outputNames;
    
    // Для динамических осей делаем dummy run
    const dummyData = new Float32Array(1 * 3 * ctx.config.preprocess.inputHeight * ctx.config.preprocess.inputWidth);
    const dummyTensor = new ort.Tensor('float32', dummyData, [1, 3, ctx.config.preprocess.inputHeight, ctx.config.preprocess.inputWidth]);
    
    const feeds: Record<string, ort.Tensor> = {};
    feeds[inputNames[0]] = dummyTensor;
    
    const startTime = performance.now();
    const results = await this.session.run(feeds);
    const loadTime = performance.now() - startTime;

    const outputsInfo: TensorInfo[] = outputNames.map(name => ({
      name,
      shape: results[name].dims,
      type: results[name].type as any
    }));

    // Очистка dummy тензоров
    dummyTensor.dispose();
    Object.values(results).forEach(t => t.dispose());

    this.modelInfo = {
      id: crypto.randomUUID(),
      name: ctx.modelUrl.split('/').pop() || 'model.onnx',
      format: 'onnx',
      sizeBytes: 0, // Недоступно напрямую через session
      loadTimeMs: loadTime,
      backend: ep,
      inputs: [{ name: inputNames[0], shape: dummyTensor.dims, type: 'float32' }],
      outputs: outputsInfo,
      labels: ctx.labels
    };

    onProgress(100, 'Готово');
    return this.modelInfo;
  }

  configure(config: ModelConfig): void {
    if (this.ctx) this.ctx.config = config;
  }

  async infer(bitmap: ImageBitmap): Promise<{ result: InferenceResult; timings: InferenceTimings }> {
    if (!this.session || !this.ctx || !this.modelInfo) throw new Error('Сессия не инициализирована');

    const timings = { preprocessMs: 0, inferenceMs: 0, postprocessMs: 0 };
    
    // Препроцессинг
    let start = performance.now();
    const prepResult = this.preprocessor.process(bitmap, this.ctx.config.preprocess);
    const tensor = new ort.Tensor('float32', prepResult.tensorData, [1, 3, this.ctx.config.preprocess.inputHeight, this.ctx.config.preprocess.inputWidth]);
    timings.preprocessMs = performance.now() - start;

    // Инференс
    start = performance.now();
    const feeds: Record<string, ort.Tensor> = {};
    feeds[this.session.inputNames[0]] = tensor;
    let results: ort.InferenceSession.ReturnType;
    try {
      results = await this.session.run(feeds);
    } finally {
      tensor.dispose();
    }
    timings.inferenceMs = performance.now() - start;

    // Постпроцессинг
    start = performance.now();
    let inferenceResult: InferenceResult;
    const task = this.ctx.config.task;
    const outTensors = Object.values(results);
    const firstOut = outTensors[0];
    const dataArray = firstOut.data as Float32Array;
    const shape = firstOut.dims;

    try {
      if (task === 'yolov8') {
        inferenceResult = { type: 'detection', data: decodeYOLOv8(dataArray, shape, prepResult, this.ctx.config.decoder, this.ctx.labels) };
      } else if (task === 'yolov5') {
        inferenceResult = { type: 'detection', data: decodeYOLOv5(dataArray, shape, prepResult, this.ctx.config.decoder, this.ctx.labels) };
      } else if (task === 'classification') {
        inferenceResult = { type: 'classification', data: decodeClassification(dataArray, this.ctx.config.decoder, this.ctx.labels) };
      } else {
        const rawDict: Record<string, {shape: number[], data: Float32Array}> = {};
        for (const [k, v] of Object.entries(results)) rawDict[k] = { shape: v.dims.slice(), data: v.data as Float32Array };
        inferenceResult = { type: 'raw', data: extractRawTensors(rawDict) };
      }
    } finally {
      outTensors.forEach(t => t.dispose());
    }
    timings.postprocessMs = performance.now() - start;

    return { result: inferenceResult, timings };
  }

  async unload(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.modelInfo = null;
  }

  async dispose(): Promise<void> {
    await this.unload();
  }
}