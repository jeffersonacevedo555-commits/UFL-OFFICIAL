import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);
const read = (file) => {
  try { return readFileSync(resolve(root, file), 'utf8'); }
  catch { return ''; }
};

console.log('UFL — AUDITORÍA PREVIA DE NETLIFY');
console.log('=================================');

const netlify = read('netlify.toml');
for (const [pattern, description] of [
  [/command\s*=\s*"(?:pnpm install [^"\n]*&&\s*)?pnpm run verify:complete"/i, 'Netlify ejecuta las verificaciones completas antes de publicar'],
  [/publish\s*=\s*"dist\/client"/i, 'Netlify publica el directorio de salida esperado'],
]) {
  if (pattern.test(netlify)) pass(description);
  else fail(`Configuración de Netlify incorrecta: ${description}`);
}

const packageJson = JSON.parse(read('package.json') || '{}');
for (const [script, description] of [
  ['build', 'existe el comando de compilación'],
  ['verify:release', 'existe el conjunto de auditorías previas'],
  ['verify:complete', 'existe el verificador completo'],
  ['verify:environment', 'existe el diagnóstico del entorno'],
  ['verify:deployment-safety', 'existe la auditoría de seguridad de publicación'],
]) {
  if (packageJson.scripts?.[script]) pass(`package.json: ${description}`);
  else fail(`package.json: falta el script ${script}`);
}

const migrationsDir = resolve(root, 'netlify/database/migrations');
const migrationEntries = existsSync(migrationsDir) ? readdirSync(migrationsDir, { withFileTypes: true }) : [];
const migrationDirs = migrationEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const migrationFiles = migrationEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.sql')).map((entry) => entry.name).sort();
const migrations = [
  ...migrationDirs.map((name) => ({ name, file: join(migrationsDir, name, 'migration.sql') })),
  ...migrationFiles.map((name) => ({ name, file: join(migrationsDir, name) })),
].sort((a, b) => a.name.localeCompare(b.name));

if (migrations.length > 0) pass(`Se encontraron ${migrations.length} migraciones de Netlify`);
else fail('No se encontraron migraciones en netlify/database/migrations');

let previousName = '';
for (const migration of migrations) {
  if (!/^\d+_[a-z0-9_-]+(?:\.sql)?$/.test(migration.name)) {
    fail(`Nombre de migración no válido: ${migration.name}`);
    continue;
  }
  if (previousName && migration.name.localeCompare(previousName) < 0) fail(`Orden lexicográfico inesperado: ${migration.name}`);
  previousName = migration.name;
  if (!existsSync(migration.file) || !statSync(migration.file).isFile()) {
    fail(`Falta el SQL de la migración ${migration.name}`);
    continue;
  }
  if (!readFileSync(migration.file, 'utf8').trim()) fail(`La migración ${migration.name} está vacía`);
}
if (migrations.length && process.exitCode !== 1) pass('Nombres y archivos SQL de migraciones tienen formato válido');

const gitignore = read('.gitignore');
if (/^\.env(?:\*|$)/m.test(gitignore) && /^\.netlify\/?$/m.test(gitignore)) {
  pass('El .gitignore excluye archivos de entorno y estado local de Netlify');
} else {
  fail('Revisa .gitignore: debe excluir .env, variantes de entorno y .netlify');
}

const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
const presentEnvFiles = envFiles.filter((file) => existsSync(resolve(root, file)));
if (presentEnvFiles.length === 0) pass('No se encontraron archivos .env comunes en la raíz del paquete');
else console.warn(`⚠ Hay archivos de entorno locales: ${presentEnvFiles.join(', ')}. No los compartas ni los subas al repositorio.`);

if (process.exitCode) {
  console.error('\nLa auditoría encontró elementos que deben revisarse antes de publicar.');
} else {
  console.log('\nAuditoría estática de Netlify completada. No realiza despliegues ni valida credenciales o estado real de la cuenta.');
}
