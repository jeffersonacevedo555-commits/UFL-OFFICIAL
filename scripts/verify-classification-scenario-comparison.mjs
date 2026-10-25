import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['El simulador mantiene dos escenarios independientes', route.includes("useState<'A' | 'B'>('A')") && route.includes("useState<Record<'A' | 'B', Record<number")],
  ['Permite cambiar entre A y B', route.includes('Editar escenario:') && route.includes('Escenario A') && route.includes('Escenario B')],
  ['Cada escenario genera una tabla por separado', route.includes('const scenarioA = buildTable(predictionsByScenario.A)') && route.includes('const scenarioB = buildTable(predictionsByScenario.B)')],
  ['Compara posiciones y puntos de A frente a B', route.includes('Comparación de escenarios A y B') && route.includes('Δ puntos (B−A)')],
  ['Calcula máximo de puntos usando partidos sin pronóstico', route.includes('const maxPoints = row.points + remainingForTeam * 3')],
  ['Identifica rangos de puntos solapados como aviso de posible cambio de orden', route.includes('orderMayChange = scenarioRanges.some') && route.includes('¿Puede variar el orden?')],
  ['Solo incluye pronósticos completos válidos', route.includes('validScore(prediction.home) && validScore(prediction.away)')],
  ['La simulación está identificada como no oficial', route.includes('SIMULACIÓN · NO OFICIAL') && route.includes('no se envían al servidor')],
  ['Se pueden borrar escenarios por separado y juntos', route.includes('Borrar escenario {activeScenario}') && route.includes('Borrar ambos')],
  ['Incluye estilos adaptables para el selector de escenarios', styles.includes('.scenario-switcher') && styles.includes('@media (max-width: 600px) { .scenario-switcher')],
  ['La auditoría se conecta a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-scenario-comparison.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de comparación de escenarios: ${checks.length}/${checks.length}`)
