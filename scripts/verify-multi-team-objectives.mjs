import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['Permite comparar varios objetivos en el escenario activo', route.includes('Comparador de objetivos para varios equipos')],
  ['Los equipos seleccionados comparten el mismo puesto objetivo', route.includes('Puesto común para comparar objetivos') && route.includes('comparisonPosition')],
  ['La selección está limitada a cinco equipos', route.includes('comparisonTeamIds.length >= 5') && route.includes('disabled={!checked && comparisonTeamIds.length >= 5}')],
  ['La tabla compara puntos, máximo y clubes que superan el máximo', route.includes('Máximo teórico') && route.includes('Equipos que ya superan su máximo')],
  ['Solo explora partidos sin pronóstico completo', route.includes('pending.filter((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id))')],
  ['Compara victoria local, empate y victoria visitante', route.includes('home: 3, away: 0') && route.includes("label: 'Empate', home: 1, away: 1") && route.includes('home: 0, away: 3')],
  ['Actualiza puntos y máximo teórico para los dos equipos del partido', route.includes('projectedPoints.set(row.team.id, row.points + award)') && route.includes('row.maxPoints - 3 + award')],
  ['Evalúa si el resultado hipotético descarta objetivos por puntos', route.includes('projectedPoints.get(other.team.id)') && route.includes('>= Math.max(1, Number(comparisonPosition) || 1)')],
  ['Explica que se cambia un partido cada vez y no hay garantías', route.includes('se cambia un solo partido cada vez') && route.includes('no se guarda como resultado oficial')],
  ['Incluye estilos accesibles y adaptables', styles.includes('.multi-objective-team-picker') && styles.includes('.objective-badge.impossible') && styles.includes('@media (max-width: 600px) { .multi-objective-team-list')],
  ['La auditoría está conectada a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-multi-team-objectives.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de objetivos para varios equipos: ${checks.length}/${checks.length}`)
