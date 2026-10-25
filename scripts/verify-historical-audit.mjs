import fs from 'node:fs'
import assert from 'node:assert/strict'
const schema = fs.readFileSync(new URL('../db/schema.ts', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../netlify/functions/tournament.mts', import.meta.url), 'utf8')
const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const migration = fs.readFileSync(new URL('../netlify/database/migrations/20261023062000_historical_final_audit/migration.sql', import.meta.url), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const checks = [
  ['schema defines historical audit events', schema.includes("'historical_final_audits'") && schema.includes('beforeSnapshot') && schema.includes('afterSnapshot')],
  ['audit reads are only returned to administrators', api.includes("readUser?.roles?.includes('admin')") && api.includes('historicalFinalAudits: auditRows')],
  ['final creation and update are logged transactionally', api.includes("action: beforeSnapshot ? 'updated' : 'created'") && api.includes('await tx.insert(historicalFinalAudits).values')],
  ['final deletion is logged before the row is deleted', api.indexOf("action: 'deleted'") < api.indexOf('await tx.delete(historicalFinals)')],
  ['audit events store actor and before/after snapshots', api.includes('actorEmail: user.email ?? null') && api.includes('beforeSnapshot') && api.includes('afterSnapshot: null')],
  ['audit tab is only offered to administrators', route.includes("...(isAdmin ? ['Auditoría administrativa'] : [])") && route.includes('view === \'Auditoría administrativa\' && isAdmin')],
  ['audit panel filters events and exports CSV', route.includes('Exportar CSV') && route.includes('Filtrar auditoría por acción') && route.includes('ufl-auditoria-administrativa.csv')],
  ['migration preserves events after a final is deleted', migration.includes('"final_id" integer NOT NULL') && !/DROP TABLE|TRUNCATE/i.test(migration)],
  ['release verification includes audit checks', packageJson.scripts['verify:release'].includes('verify-historical-audit.mjs')],
]
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name) }
console.log(`\nHistorical audit verification: ${checks.length}/${checks.length} checks passed.`)
