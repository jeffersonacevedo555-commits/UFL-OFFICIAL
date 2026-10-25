import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['Calcula los puntos ganados por los equipos seleccionados', route.includes('selectedPointsGained = comparisonTeamIds.reduce')],
  ['Ordena escenarios favorables por objetivos conservados', route.includes('rankedBestCombinations') && route.includes('a.eliminatedNames.length - b.eliminatedNames.length')],
  ['Prioriza puntos ganados como segundo criterio favorable', route.includes('b.selectedPointsGained - a.selectedPointsGained')],
  ['Ordena escenarios desfavorables por más objetivos descartados', route.includes('rankedWorstCombinations') && route.includes('b.eliminatedNames.length - a.eliminatedNames.length')],
  ['Limita los listados a cinco escenarios por lado', route.includes('.slice(0, 5)')],
  ['Muestra la tabla de escenarios favorables', route.includes('Escenarios más favorables') && route.includes('rankedBestCombinations.map')],
  ['Muestra la tabla de escenarios desfavorables', route.includes('Escenarios más desfavorables') && route.includes('rankedWorstCombinations.map')],
  ['Explica que el orden es heurístico y no una probabilidad', route.includes('clasificación heurística') && route.includes('no son probabilidades')],
  ['Conserva los resultados simulados en la interfaz', route.includes('ni se guardan estos resultados simulados')],
  ['Incluye estilos adaptables para ambos listados', styles.includes('.scenario-ranking-grid') && styles.includes('@media (max-width: 800px)')],
  ['Conecta la auditoría a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-scenario-ranking.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de rankings automáticos de escenarios: ${checks.length}/${checks.length}`)
