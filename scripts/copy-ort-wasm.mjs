// Копирует WASM-рантайм onnxruntime-web в public/ort. Запускается автоматически после npm install.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dst = join(root, 'public', 'ort');

if (!existsSync(src)) {
  console.warn('[copy-ort-wasm] onnxruntime-web не установлен, пропускаю');
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
const files = readdirSync(src).filter((f) => /^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(f));
for (const f of files) copyFileSync(join(src, f), join(dst, f));
console.log(`[copy-ort-wasm] скопировано ${files.length} файлов в public/ort`);