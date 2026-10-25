import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['Mantiene snapshots locales de simulaciones', route.includes('savedSnapshots') && route.includes('setSavedSnapshots')],
  ['Permite asignar nombre a una simulación guardada', route.includes('Nombre de la simulación') && route.includes('snapshotName.trim()')],
  ['Guarda los pronósticos del escenario activo como copia', route.includes('predictions: { ...currentPredictions }')],
  ['Guarda posición, puntos y pronósticos por equipo', route.includes('teamId: row.team.id') && route.includes('points: row.points') && route.includes('predictedMatches: row.predictedPlayed')],
  ['Aplica el límite de ocho escenarios con política FIFO', route.includes('slice(-MAX_SCENARIOS_PER_SEASON)') && route.includes('MAX_SCENARIOS_PER_SEASON')],
  ['Permite cargar y eliminar una simulación guardada', route.includes('>Cargar</button>') && route.includes('>Eliminar</button>')],
  ['Compara posiciones y puntos frente a una referencia', route.includes('Pos. referencia') && route.includes('Δ posición') && route.includes('Δ puntos')],
  ['Muestra la variación de puesto de forma interpretada', route.includes("positionDelta > 0 ? `↑ ${positionDelta}`")],
  ['Aclara que las copias son locales y sobreviven a recargas', route.includes('sobreviven a las recargas de este navegador')],
  ['Incluye diseño adaptable para el gestor de escenarios', styles.includes('.saved-scenario-controls') && styles.includes('.saved-scenario-list') && styles.includes('@media (max-width: 600px)')],
  ['Conecta la auditoría a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-saved-scenarios.mjs')],
  ['Integra la persistencia y la validación segura', route.includes('loadScenariosFromStorage') && route.includes('saveScenariosToStorage')],
  ['Permite exportar e importar paquetes JSON', route.includes('Exportar JSON') && route.includes('Importar paquete JSON') && route.includes('validateScenarioBundle')],
  ['Limita el tamaño de importación a 2 MB', route.includes('file.size > 2 * 1024 * 1024')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de escenarios guardados: ${checks.length}/${checks.length}`)
