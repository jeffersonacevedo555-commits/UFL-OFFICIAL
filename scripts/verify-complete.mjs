import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const nodeMajor = Number(process.versions.node.split('.')[0]);
const nodeMinor = Number(process.versions.node.split('.')[1]);
const nodePatch = Number(process.versions.node.split('.')[2]);
const nodeVersionOk =
  (nodeMajor === 22 && (nodeMinor > 13 || (nodeMinor === 13 && nodePatch >= 0))) ||
  nodeMajor === 24 ||
  nodeMajor >= 26;
const userAgent = process.env.npm_config_user_agent ?? '';
const lockfileManager = existsSync(resolve(root, 'pnpm-lock.yaml')) ? 'pnpm'
  : existsSync(resolve(root, 'package-lock.json')) ? 'npm'
    : existsSync(resolve(root, 'yarn.lock')) ? 'yarn'
      : existsSync(resolve(root, 'bun.lock')) || existsSync(resolve(root, 'bun.lockb')) ? 'bun' : null;
const invokedManager = userAgent.startsWith('pnpm/') ? 'pnpm'
  : userAgent.startsWith('npm/') ? 'npm'
    : userAgent.startsWith('yarn/') ? 'yarn'
      : userAgent.startsWith('bun/') ? 'bun' : null;
const packageManager = invokedManager ?? lockfileManager ?? 'npm';
const packageManagerCommand = process.platform === 'win32' && packageManager === 'npm' ? 'npm.cmd' : packageManager;

console.log('\nUFL — VERIFICACIÓN COMPLETA PREVIA A PUBLICAR');
console.log('==============================================');
console.log(`Node.js detectado: ${process.versions.node}`);
console.log(`Proyecto: ${packageJson.name}`);
console.log(`Gestor de ejecución: ${packageManager}`);
console.log(`Gestor indicado por el archivo de bloqueo: ${lockfileManager ?? 'no identificado'}`);
if (invokedManager && lockfileManager && invokedManager !== lockfileManager) {
  console.warn(`AVISO: se ejecutó con ${invokedManager}, pero el proyecto usa el archivo de bloqueo de ${lockfileManager}. Para instalaciones reproducibles, usa ${lockfileManager}.`);
}
console.log('Este proceso NO publica la web ni modifica la base de datos.');

const results = [];
if (nodeVersionOk) {
  console.log('✓ La versión de Node.js cumple el requisito declarado.');
  results.push({ name: 'Versión de Node.js', ok: true });
} else {
  console.error(`✗ Se requiere Node.js ${packageJson.engines?.node ?? 'compatible con el proyecto'}.`);
  results.push({ name: 'Versión de Node.js', ok: false });
}

const dependenciesInstalled = existsSync(resolve(root, 'node_modules'));
const checks = [
  ['Auditorías estáticas del proyecto', 'verify:release', false],
  ['Pruebas automatizadas (Vitest)', 'test', true],
  ['Chequeo TypeScript', 'typecheck', true],
  ['Lint', 'lint', true],
  ['Compilación de producción', 'build', true],
];

for (const [label, script, needsDependencies] of checks) {
  console.log(`\n\n--- ${label} ---`);
  if (needsDependencies && !dependenciesInstalled) {
    const detail = 'dependencias locales no instaladas (falta la carpeta node_modules)';
    console.warn(`⚠ ${label} — pendiente: ${detail}`);
    results.push({ name: label, ok: false, skipped: true, detail });
    continue;
  }
  if (!packageJson.scripts?.[script]) {
    console.error(`✗ No existe el script npm "${script}".`);
    results.push({ name: label, ok: false, detail: 'script no definido' });
    continue;
  }
  let run;
  if (script === 'verify:release' && !dependenciesInstalled) {
    // Las auditorías estáticas solo requieren Node.js; no deben quedar bloqueadas
    // por la ausencia de pnpm/node_modules en el equipo que genera el diagnóstico.
    const staticChecks = [
      ['scripts/verify-environment.mjs'],
      ['--experimental-strip-types', 'scripts/verify-tournament.mjs'],
      ['scripts/verify-migrations.mjs'],
      ['scripts/verify-concurrency.mjs'],
      ['scripts/verify-market.mjs'],
      ['scripts/verify-season-rosters.mjs'],
      ['scripts/verify-netlify.mjs'],
      ['scripts/verify-deployment-safety.mjs'],
    ];
    let staticOk = true;
    for (const args of staticChecks) {
      const check = spawnSync(process.execPath, args, {
        cwd: root,
        env: process.env,
        stdio: 'inherit',
      });
      if (check.status !== 0) staticOk = false;
    }
    run = { status: staticOk ? 0 : 1, error: null, signal: null };
  } else {
    run = spawnSync(packageManagerCommand, ['run', script], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }
  const ok = run.status === 0;
  results.push({
    name: label,
    ok,
    detail: ok ? '' : run.error?.message ?? (run.signal ? `interrumpido (${run.signal})` : `código ${run.status}`),
  });
  if (ok) console.log(`✓ ${label}`);
  else console.error(`✗ ${label} — ${results.at(-1).detail}`);
}

const failed = results.filter((result) => !result.ok);
const reportDir = resolve(root, 'reports');
const reportJson = resolve(reportDir, 'verification-latest.json');
const reportMarkdown = resolve(reportDir, 'verification-latest.md');
const report = {
  project: packageJson.name,
  checkedAt: new Date().toISOString(),
  nodeVersion: process.versions.node,
  packageManager,
  lockfileManager,
  note: 'Este informe registra comprobaciones ejecutadas o pendientes; no publica la web ni ejecuta migraciones PostgreSQL.',
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok && !result.skipped).length,
    pending: results.filter((result) => result.skipped).length,
  },
  results,
};
mkdirSync(reportDir, { recursive: true });
writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const markdown = [
  '# UFL — Informe de verificación',
  '',
  `- Fecha UTC: ${report.checkedAt}`,
  `- Node.js: ${report.nodeVersion}`,
  `- Gestor detectado: ${report.packageManager}`,
  `- Correctas: ${report.summary.passed}/${report.summary.total}`,
  `- Fallidas: ${report.summary.failed}`,
  `- Pendientes por entorno: ${report.summary.pending}`,
  '',
  '> Este informe no publica la web ni sustituye una prueba de migraciones en una base PostgreSQL de prueba.',
  '',
  '| Comprobación | Estado | Detalle |',
  '|---|---|---|',
  ...results.map((result) => `| ${result.name.replaceAll('|', '\\|')} | ${result.ok ? 'Correcta' : result.skipped ? 'Pendiente' : 'Fallida'} | ${(result.detail || '').replaceAll('|', '\\|')} |`),
  '',
].join('\n');
writeFileSync(reportMarkdown, markdown, 'utf8');
console.log(`\nInforme guardado en: ${reportMarkdown}`);
console.log(`Informe JSON guardado en: ${reportJson}`);
console.log('\n\nRESUMEN');
console.log('=======');
for (const result of results) {
  const symbol = result.ok ? '✓' : result.skipped ? '⚠' : '✗';
  console.log(`${symbol} ${result.name}${result.detail ? `: ${result.detail}` : ''}`);
}
const skipped = results.filter((result) => result.skipped);
console.log(`\nResultado: ${results.length - failed.length}/${results.length} etapas correctas; ${skipped.length} pendientes por entorno.`);
if (failed.length) {
  const installCommand = lockfileManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : lockfileManager === 'yarn' ? 'yarn install --immutable' : lockfileManager === 'bun' ? 'bun install --frozen-lockfile' : 'npm ci';
  console.error(`\nNO PUBLICAR TODAVÍA. Instala las dependencias con: ${installCommand} (requiere conexión) y vuelve a ejecutar: ${lockfileManager ?? 'npm'} run verify:complete`);
  console.error('Esta verificación tampoco sustituye una prueba de migraciones en una base PostgreSQL de prueba.');
  process.exitCode = 1;
} else {
  console.log('\nLas comprobaciones de código pasaron. Aún debes validar las migraciones en una base PostgreSQL de prueba antes de publicar.');
}
