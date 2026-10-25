import fs from 'node:fs'
const schema = fs.readFileSync('db/schema.ts', 'utf8')
const api = fs.readFileSync('netlify/functions/tournament.mts', 'utf8')
const editor = fs.readFileSync('src/components/player-statistics.tsx', 'utf8')
const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const migration = fs.readFileSync('netlify/database/migrations/20261023050000_player_appearances/migration.sql', 'utf8')
const checks = [
  ['La tabla guarda participación explícita', /appeared: boolean\('appeared'\)/.test(schema)],
  ['La tabla guarda minutos', /minutes: integer\(\)/.test(schema)],
  ['Minutos limitados en base de datos', /t\.minutes} BETWEEN 0 AND 120/.test(schema) && /CHECK \(minutes BETWEEN 0 AND 120\)/.test(migration)],
  ['Migración añade campos sin borrar historial', /ADD COLUMN appeared/.test(migration) && /ADD COLUMN minutes/.test(migration)],
  ['API valida participación y minutos', /appeared: z\.boolean\(\)/.test(api) && /minutes: z\.number\(\)\.int\(\)\.min\(0\)\.max\(120\)/.test(api)],
  ['Editor permite marcar participación', /name={`appeared-\$\{p\.id\}`}/.test(editor)],
  ['Editor permite registrar minutos', /name={`minutes-\$\{p\.id\}`}/.test(editor)],
  ['Guarda filas con participación aunque no haya goles', /s\.appeared \|\| s\.goals \|\| s\.assists/.test(editor)],
  ['Ficha calcula apariciones explícitas', /stat\.appeared === true/.test(route)],
  ['Ficha suma minutos registrados', /acc\.minutes \+ \(stat\.minutes \?\? 0\)/.test(route)],
  ['Explica que los datos históricos no se inventan', /no se convierten automáticamente en apariciones/.test(route)],
]
let failed = 0
for (const [label, passed] of checks) { console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failed++ }
console.log(`\nResultado: ${checks.length - failed}/${checks.length} comprobaciones estáticas`)
if (failed) process.exitCode = 1
