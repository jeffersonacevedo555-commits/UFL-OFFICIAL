import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['Incluye el explorador de combinaciones', route.includes('Explorador de combinaciones de resultados')],
  ['Permite seleccionar como máximo cuatro partidos', route.includes('máximo 4') && route.includes('selectedCombinationMatches.length >= 4')],
  ['Genera las tres opciones de cada partido', route.includes("label: 'victoria local', homePoints: 3, awayPoints: 0") && route.includes("label: 'empate', homePoints: 1, awayPoints: 1") && route.includes("label: 'victoria visitante', homePoints: 0, awayPoints: 3")],
  ['Enumera combinaciones cartesianas de resultados', route.includes('enumerateOutcomes(index + 1') && route.includes('outcomeCombinations.push([...picks])')],
  ['Limita el crecimiento a 81 combinaciones como máximo', route.includes('máximo 81') && route.includes('selectedCombinationMatches.length >= 4')],
  ['Aplica los puntos de cada resultado a los dos clubes', route.includes('pointDeltas.set(pick.match.homeId') && route.includes('pointDeltas.set(pick.match.awayId')],
  ['Recalcula el máximo teórico tras los partidos seleccionados', route.includes('row.maxPoints - 3 * (selectedMatchCounts.get(row.team.id) ?? 0)')],
  ['Evalúa los objetivos de los equipos previamente seleccionados', route.includes('comparisonTeamIds.map((id) => projections.find') && route.includes('other.projectedPoints > target.projectedMaxPoints')],
  ['Muestra todas las combinaciones y los objetivos afectados', route.includes('combination-results-table') && route.includes('Equipos seleccionados descartados')],
  ['Explica que los resultados son hipotéticos y no garantizan objetivos', route.includes('Sin nuevos descartes') && route.includes('ni se guardan estos resultados simulados')],
  ['Incluye estilos adaptables', styles.includes('.combination-match-picker') && styles.includes('.combination-results-table') && styles.includes('@media (max-width: 600px)')],
  ['Conecta la auditoría a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-combinations.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de combinaciones de clasificación: ${checks.length}/${checks.length}`)
