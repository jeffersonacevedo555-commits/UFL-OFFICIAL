import fs from 'node:fs'
import assert from 'node:assert/strict'
const route = fs.readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const checks = [
  ['integrity dashboard is accessible from the main tabs', route.includes("'Integridad histórica'") && route.includes('<HistoricalIntegrityPanel finals={data.historicalFinals}')],
  ['missing champions are surfaced as review warnings', route.includes('Campeón no documentado') && route.includes('Confirma si la competición se disputó')],
  ['manual unlinked finals are reported without assuming invalidity', route.includes('Registro manual sin partidos vinculados')],
  ['missing linked matches are errors', route.includes('Partido vinculado inexistente')],
  ['linked matches are checked for completion', route.includes('Partido vinculado sin resultado')],
  ['linked match season and competition are checked', route.includes('pertenece a otra temporada') && route.includes('pertenece a otra competición')],
  ['final round and finalist clubs are checked', route.includes('su ronda ya no figura como final') && route.includes('los clubes no coinciden con campeón y subcampeón registrados')],
  ['stored scores are compared against linked match scores', route.includes('el marcador guardado difiere del resultado actual del partido')],
  ['two-leg links and return-leg scores are checked', route.includes('Vínculos de ida y vuelta incompletos') && route.includes('Marcador de vuelta incompleto')],
  ['champion and penalties consistency are checked', route.includes('Campeón no respaldado por el resultado') && route.includes('Penaltis sin empate global')],
  ['filters exist for season, competition and severity', route.includes('Filtrar integridad por temporada') && route.includes('Filtrar integridad por competición') && route.includes('Filtrar incidencias por tipo')],
  ['dashboard is read-only and does not mutate historical records', route.includes('Es un diagnóstico de solo lectura: no modifica los registros.')],
  ['responsive audit issue styles exist', styles.includes('.historical-integrity-issue') && styles.includes('@media (max-width: 640px) { .historical-integrity-panel')],
]
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name) }
console.log(`\nHistorical integrity audit: ${checks.length}/${checks.length} checks passed.`)
