import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);
const warn = (message) => console.warn(`⚠ ${message}`);
const read = (file) => {
  try { return readFileSync(resolve(root, file), 'utf8'); }
  catch { return ''; }
};

console.log('UFL — DIAGNÓSTICO DEL ENTORNO DE DESARROLLO');
console.log('============================================');

let pkg;
try {
  pkg = JSON.parse(read('package.json'));
  pass('package.json existe y contiene JSON válido');
} catch {
  fail('No se puede leer package.json');
  process.exit(1);
}

const lockfiles = [
  ['pnpm', 'pnpm-lock.yaml'],
  ['npm', 'package-lock.json'],
  ['yarn', 'yarn.lock'],
  ['bun', 'bun.lockb'],
  ['bun', 'bun.lock'],
].filter(([, file]) => existsSync(resolve(root, file)));

if (lockfiles.length === 1) {
  pass(`Archivo de bloqueo identificado: ${lockfiles[0][1]} (${lockfiles[0][0]})`);
} else if (lockfiles.length === 0) {
  fail('No se encontró archivo de bloqueo de dependencias. No instales paquetes hasta revisar el proyecto.');
} else {
  fail(`Hay varios archivos de bloqueo (${lockfiles.map(([, file]) => file).join(', ')}). Elige un único gestor para evitar instalaciones inconsistentes.`);
}

const lockManager = lockfiles.length === 1 ? lockfiles[0][0] : null;
const userAgent = process.env.npm_config_user_agent ?? '';
const callerManager = userAgent.startsWith('pnpm/') ? 'pnpm'
  : userAgent.startsWith('npm/') ? 'npm'
    : userAgent.startsWith('yarn/') ? 'yarn'
      : userAgent.startsWith('bun/') ? 'bun' : null;
if (callerManager && lockManager && callerManager !== lockManager) {
  warn(`El comando actual se ejecuta con ${callerManager}, pero el archivo de bloqueo pertenece a ${lockManager}. Para instalaciones reproducibles, usa ${lockManager}.`);
} else if (lockManager) {
  pass(`Gestor recomendado para instalar dependencias: ${lockManager}`);
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
const nodeMinor = Number(process.versions.node.split('.')[1]);
const nodePatch = Number(process.versions.node.split('.')[2]);
const nodeOk = (nodeMajor === 22 && (nodeMinor > 13 || (nodeMinor === 13 && nodePatch >= 0))) || nodeMajor === 24 || nodeMajor >= 26;
if (nodeOk) pass(`Node.js ${process.versions.node} cumple el requisito del proyecto`);
else fail(`Node.js ${process.versions.node} no cumple el requisito declarado: ${pkg.engines?.node ?? 'versión compatible'}`);

const requiredScripts = ['verify:release', 'verify:complete', 'test', 'typecheck', 'lint', 'build'];
for (const script of requiredScripts) {
  if (pkg.scripts?.[script]) pass(`Script disponible: ${script}`);
  else fail(`Falta el script requerido: ${script}`);
}

if (existsSync(resolve(root, 'node_modules'))) {
  pass('Existe node_modules; las dependencias podrían estar instaladas (las pruebas deben confirmarlo)');
} else {
  warn('No existe node_modules. Vitest, TypeScript, ESLint y Vite no podrán ejecutarse hasta instalar dependencias.');
}

const environmentFiles = [];
const inspectDirs = [root, resolve(root, 'netlify')];
for (const dir of inspectDirs) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (/^\.env(?:\..+)?$/.test(name) && name !== '.env.example') environmentFiles.push(name);
  }
}
if (environmentFiles.length) {
  warn(`Hay archivos de entorno locales (${[...new Set(environmentFiles)].join(', ')}). No se leen ni muestran sus contenidos; no compartas esos archivos.`);
} else {
  pass('No se detectaron archivos .env comunes en la raíz ni en netlify/');
}

if (process.exitCode) {
  console.error('\nDiagnóstico terminado con elementos que deben corregirse.');
} else {
  console.log('\nDiagnóstico de entorno completado. Esto no equivale a ejecutar las pruebas ni a compilar la aplicación.');
}
