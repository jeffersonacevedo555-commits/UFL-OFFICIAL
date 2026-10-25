import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
let failures = 0;
const pass = (message) => console.log(`✓ ${message}`);
const fail = (message) => { failures += 1; console.error(`✗ ${message}`); };
const read = (path) => {
  try { return readFileSync(resolve(root, path), 'utf8'); }
  catch { return ''; }
};

console.log('UFL — AUDITORÍA DE SEGURIDAD PREVIA A PUBLICAR');
console.log('==============================================');

const config = read('netlify.toml');
const pkg = JSON.parse(read('package.json') || '{}');
const complete = read('scripts/verify-complete.mjs');
const release = pkg.scripts?.['verify:release'] ?? '';
const migrationsRoot = resolve(root, 'netlify/database/migrations');

if (/command\s*=\s*"(?:pnpm install [^"\n]*&&\s*)?pnpm run verify:complete"/i.test(config)) pass('Netlify exige la verificación completa antes del build');
else fail('Netlify no ejecuta verify:complete como comando de build');

if (/publish\s*=\s*"dist\/client"/i.test(config)) pass('El directorio publicado coincide con la salida esperada');
else fail('El directorio publicado no es dist/client');

if (/\['Compilación de producción',\s*'build',\s*true\]/.test(complete)) pass('La verificación completa incluye la compilación de producción');
else fail('verify:complete no incluye claramente la compilación de producción');

if (existsSync(resolve(root, 'pnpm-lock.yaml'))) pass('Existe pnpm-lock.yaml para una instalación reproducible');
else fail('Falta pnpm-lock.yaml; revisar el gestor de paquetes antes de publicar');

if (release.includes('verify-deployment-safety.mjs')) pass('La auditoría de publicación está integrada en verify:release');
else fail('La auditoría de publicación no está integrada en verify:release');

const ignore = read('.gitignore');
if (/^\.env\*?$/m.test(ignore) && /^\.netlify\/?$/m.test(ignore)) pass('Los archivos de entorno y el estado local de Netlify están excluidos');
else fail('Revisar .gitignore: debe excluir archivos .env y .netlify');

if (!existsSync(migrationsRoot)) {
  fail('No se encontró el directorio de migraciones');
} else {
  const entries = readdirSync(migrationsRoot, { withFileTypes: true });
  const migrations = entries
    .filter((entry) => entry.isDirectory() || (entry.isFile() && entry.name.endsWith('.sql')))
    .map((entry) => ({ name: entry.name, path: join(migrationsRoot, entry.name, entry.isDirectory() ? 'migration.sql' : '') }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let unsafe = [];
  let missing = [];
  for (const migration of migrations) {
    if (!/^\d+_[a-z0-9_-]+(?:\.sql)?$/.test(migration.name)) fail(`Nombre de migración inválido: ${migration.name}`);
    if (!existsSync(migration.path) || !statSync(migration.path).isFile()) {
      missing.push(migration.name);
      continue;
    }
    const sql = readFileSync(migration.path, 'utf8');
    if (/\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\s+\w+\s*;/i.test(sql)) unsafe.push(migration.name);
  }
  if (migrations.length && missing.length === 0) pass(`Las ${migrations.length} migraciones tienen sus archivos SQL`);
  else fail(`Migraciones sin SQL: ${missing.join(', ') || 'no se encontró ninguna migración'}`);
  if (unsafe.length === 0) pass('No se detectaron DROP TABLE, TRUNCATE ni DELETE FROM sin WHERE en migraciones');
  else fail(`Revisar operaciones potencialmente destructivas en: ${unsafe.join(', ')}`);
}

console.log('\nEsta auditoría es estática. No ejecuta SQL, no hace copias de seguridad y no verifica el estado real de la cuenta Netlify.');
if (failures) {
  console.error(`Resultado: ${failures} problema(s) que requieren revisión.`);
  process.exitCode = 1;
} else {
  console.log('Resultado: todas las comprobaciones estáticas de publicación pasaron.');
}
