// src/lib/inference/engines/onnx.ts
import * as ort from 'onnxruntime-web';
import { InferenceEngine, EngineContext, EngineOutput, errorMessage } from './engine';
import { ModelInfo, EngineConfig, Labels, TensorInfo, DataType } from '@/types/inference';
import { PreprocessConfig } from '@/types/config';
import { ImagePreprocessor } from '../preprocess';
import { decodeOutputs } from '../postprocess/decode';

ort.env.wasm.wasmPaths = '/ort/';

export class OnnxEngine implements InferenceEngine {
  private session: ort.InferenceSession | null = null;
  private ctx: EngineContext | null = null;
  private preprocessor = new ImagePreprocessor();
  private modelInfo: ModelInfo | null = null;

  async load(ctx: EngineContext, onProgress: (progress: number, message: string) => void): Promise<ModelInfo> {
    this.ctx = ctx;
    const start = performance.now();

    ort.env.wasm.numThreads = typeof self !== 'undefined' && self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 1)
      : 1;

    if (!ctx.files || ctx.files.length === 0) {
      throw new Error('Нет файла модели');
    }

    const file = ctx.files[0];
    const bytes = new Uint8Array(await file.arrayBuffer());

    let ep = 'wasm';
    let backendNote: string | undefined;

    if (ctx.config.preferredBackend === 'webgpu') {
      if (!('gpu' in navigator)) {
        backendNote = 'WebGPU не запустился (нет поддержки navigator.gpu), используется WASM';
      } else {
        try {
          this.session = await ort.InferenceSession.create(bytes, {
            executionProviders: ['webgpu'],
            graphOptimizationLevel: 'all'
          });
          ep = 'webgpu';
        } catch (e) {
          backendNote = `WebGPU не запустился (${errorMessage(e)}), используется WASM`;
        }
      }
    }

    if (ep === 'wasm') {
      try {
        this.session = await ort.InferenceSession.create(bytes, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
      } catch (e) {
        throw new Error(`Ошибка загрузки WASM-сессии: ${errorMessage(e)}`);
      }
    }

    try {
      const inputName = this.session!.inputNames[0];
      const meta = this.session!.inputMetadata[0];

      if (meta && meta.isTensor && meta.type !== 'float32') {
        throw new Error(`Вход модели имеет тип ${meta.type}, поддерживается только float32`);
      }

      let fixedInput: Pick<PreprocessConfig, 'inputWidth' | 'inputHeight' | 'layout'> | undefined;
      const shape = meta?.isTensor ? meta.shape : undefined;

      if (Array.isArray(shape) && shape.length === 4 && shape.every(d => typeof d === 'number' && d > 0)) {
        const dims = shape as number[];
        if (dims[1] === 3) {
          fixedInput = { layout: 'NCHW', inputHeight: dims[2], inputWidth: dims[3] };
        } else if (dims[3] === 3) {
          fixedInput = { layout: 'NHWC', inputHeight: dims[1], inputWidth: dims[2] };
        }
      }

      if (fixedInput) {
        this.ctx.config.preprocess = { ...this.ctx.config.preprocess, ...fixedInput };
      }

      const inputDims = fixedInput
        ? (fixedInput.layout === 'NCHW' ? [1, 3, fixedInput.inputHeight, fixedInput.inputWidth] : [1, fixedInput.inputHeight, fixedInput.inputWidth, 3])
        : [1, 3, this.ctx.config.preprocess.inputHeight, this.ctx.config.preprocess.inputWidth];

      const dummyData = new Float32Array(inputDims.reduce((a, b) => a * b, 1));
      const dummyTensor = new ort.Tensor('float32', dummyData, inputDims);

      let dummyResult: Record<string, ort.Tensor>;
      try {
        dummyResult = await this.session!.run({ [inputName]: dummyTensor });
      } catch (e) {
        throw new Error(`Ошибка прогона модели (${errorMessage(e)}). Проверьте размер входа и раскладку.`);
      } finally {
        dummyTensor.dispose();
      }

      const outputsInfo: TensorInfo[] = this.session!.outputNames.map(name => {
        const t = dummyResult[name];
        return { name, shape: [...t.dims], type: t.type as DataType };
      });

      const inputsInfo: TensorInfo[] = [
        { 
          name: inputName, 
          shape: meta?.isTensor ? [...meta.shape] : [], 
          type: meta?.isTensor ? meta.type as DataType : 'unknown' 
        }
      ];

      Object.values(dummyResult).forEach(t => t.dispose());

      this.modelInfo = {
        id: crypto.randomUUID(),
        name: file.name,
        format: 'onnx',
        sizeBytes: file.size,
        loadTimeMs: performance.now() - start,
        backend: ep as any,
        backendNote,
        inputs: inputsInfo,
        outputs: outputsInfo,
        fixedInput
      };

      return this.modelInfo;
    } catch (e) {
      await this.dispose();
      throw e;
    }
  }
  
  configure(config: EngineConfig, labels?: Labels): void {
    if (this.ctx) {
      this.ctx.config = config;
      if (this.modelInfo?.fixedInput) {
        this.ctx.config.preprocess = { ...this.ctx.config.preprocess, ...this.modelInfo.fixedInput };
      }
      if (labels) {
        this.ctx.labels = labels;
      }
    }
  }

  async infer(bitmap: ImageBitmap): Promise<EngineOutput> {
    if (!this.session || !this.ctx || !this.modelInfo) {
      throw new Error('Сессия не инициализирована');
    }

    const timings = { preprocessMs: 0, inferenceMs: 0, postprocessMs: 0 };
    
    // Preprocess
    let start = performance.now();
    const prepResult = this.preprocessor.process(bitmap, this.ctx.config.preprocess);
    const tensor = new ort.Tensor('float32', prepResult.tensorData, prepResult.dims);
    timings.preprocessMs = performance.now() - start;

    // Inference
    start = performance.now();
    let results: ort.InferenceSession.ReturnType;
    try {
      results = await this.session!.run({ [this.session!.inputNames[0]]: tensor });
    } finally {
      tensor.dispose();
    }
    timings.inferenceMs = performance.now() - start;

    // Postprocess
    start = performance.now();
    const outDict: Record<string, { dims: readonly number[]; type: string; data: ArrayLike<number | bigint> }> = {};
    for (const [k, v] of Object.entries(results)) {
      outDict[k] = { dims: v.dims, type: v.type, data: v.data as ArrayLike<number | bigint> };
    }

    let inferenceResult;
    try {
      inferenceResult = decodeOutputs(
        this.ctx.config,
        outDict,
        this.session!.outputNames[0],
        prepResult.transform,
        this.ctx.labels
      );
    } finally {
      Object.values(results).forEach(t => t.dispose());
    }
    timings.postprocessMs = performance.now() - start;

    return { result: inferenceResult, timings };
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.ctx = null;
    this.modelInfo = null;
  }
}