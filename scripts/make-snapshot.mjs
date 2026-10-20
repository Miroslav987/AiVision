// Собирает текущее состояние проекта в snapshot.txt для Gemini в AI Studio:
// все исходники + результаты typecheck, lint и test.
// Запуск из корня проекта:  node scripts/make-snapshot.mjs
// Быстрый вариант без проверок: node scripts/make-snapshot.mjs --no-checks
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const OUT = 'snapshot.txt';
const ROOT_FILES = ['package.json', 'next.config.ts', 'tsconfig.json', 'vitest.config.ts', 'eslint.config.mjs', '.gitignore'];
const SCAN_DIRS = ['src', 'scripts', 'server', 'config', 'infra', 'docs'];
const EXT = /\.(ts|tsx|mjs|js|css|json|py|yaml|yml|toml|md)$|^(requirements.*\.txt|Dockerfile|\.env\.example)$/;
// Файлы с паролями камер и секретами в снапшот НЕ попадают
const SKIP_FILES = new Set(['mediamtx.yml', '.env', '.env.local', 'snapshot.txt']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'public', '.venv', 'venv', '__pycache__', '.pytest_cache', 'data', 'runs', 'weights']);
const MAX_CHECK_OUTPUT = 12000;

if (!existsSync(join(root, 'package.json'))) {
  console.error('Запустите скрипт из корня проекта (там, где package.json)');
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, acc); }
    else if (EXT.test(name) && !SKIP_FILES.has(name)) acc.push(p);
  }
  return acc;
}

const files = [
  ...ROOT_FILES.filter((f) => existsSync(join(root, f))).map((f) => join(root, f)),
  ...SCAN_DIRS.filter((d) => existsSync(join(root, d))).flatMap((d) => walk(join(root, d)).sort()),
];
const rel = (p) => relative(root, p).split(sep).join('/');

function run(label, cmd) {
  const r = spawnSync(cmd, { shell: true, cwd: root, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  let out = `${r.stdout ?? ''}${r.stderr ?? ''}`
    .replace(/\u001b\[[0-9;]*m/g, '')                 // убрать цвета терминала
    .split(root.split(sep).join('/')).join('.')        // абсолютные пути → относительные
    .split(root).join('.');
  if (out.length > MAX_CHECK_OUTPUT) out = out.slice(0, MAX_CHECK_OUTPUT) + `\n…(обрезано, всего ${out.length} символов)`;
  const status = r.status === 0 ? 'OK' : `ОШИБКИ (код ${r.status})`;
  console.log(`  ${label}: ${status}`);
  return `### ${label} — ${status}\n$ ${cmd}\n${out.trim() || '(пустой вывод)'}\n`;
}

const parts = [];
parts.push(`# SNAPSHOT ПРОЕКТА VisionDesk — ${new Date().toISOString()}`);
parts.push('Это ТЕКУЩЕЕ состояние проекта, включая ручные правки. Опирайся только на него.');
parts.push(`\n## СПИСОК ФАЙЛОВ (${files.length})\n` + files.map((f) => {
  const size = statSync(f).size;
  return `- ${rel(f)}${size === 0 ? '  (ПУСТОЙ ФАЙЛ)' : ''}`;
}).join('\n'));

parts.push('\n## СОДЕРЖИМОЕ ФАЙЛОВ');
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  parts.push(`\n===== FILE: ${rel(f)} =====\n${text}${text.endsWith('\n') ? '' : '\n'}===== END: ${rel(f)} =====`);
}

if (!process.argv.includes('--no-checks')) {
  console.log('Запускаю проверки (это может занять минуту)…');
  parts.push('\n## РЕЗУЛЬТАТЫ ПРОВЕРОК');
  parts.push(run('typecheck', 'npx tsc --noEmit --pretty false'));
  parts.push(run('lint', 'npx eslint . --ignore-pattern "public/**"'));
  parts.push(run('test', 'npx vitest run'));
  if (existsSync(join(root, 'server'))) parts.push(run('pytest (server)', 'python -m pytest -q server'));
}

writeFileSync(join(root, OUT), parts.join('\n'), 'utf8');
const kb = (statSync(join(root, OUT)).size / 1024).toFixed(0);
console.log(`Готово: ${OUT} (${kb} КБ, ${files.length} файлов). Прикрепите его к сообщению в AI Studio.`);
