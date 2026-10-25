import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['El panel ofrece objetivos de clasificación en el escenario activo', route.includes('Objetivos de clasificación · escenario {activeScenario}')],
  ['Se puede seleccionar el equipo objetivo', route.includes('Equipo para el objetivo de clasificación') && route.includes('setObjectiveTeamId')],
  ['Se puede seleccionar un puesto objetivo, incluido campeón', route.includes('Puesto objetivo de clasificación') && route.includes('Campeón')],
  ['El máximo teórico suma tres puntos por partido pendiente sin pronóstico', route.includes('const maxPoints = row.points + remainingForTeam * 3')],
  ['Descarta el objetivo solo si suficientes equipos ya superan el máximo', route.includes('const impossible = blockers.length >= goalPosition') && route.includes('row.points > target.maxPoints')],
  ['Muestra los equipos que superan el máximo del objetivo', route.includes('Equipos por encima de su máximo') && route.includes('Diferencia sobre el máximo')],
  ['Aclara que no es garantía y depende del escenario', route.includes('no garantiza que pueda alcanzar ese puesto') && route.includes('no modifica la clasificación oficial')],
  ['Explica límites por desempates y marcadores incompletos', route.includes('No se consideran desempates') && route.includes('marcador incompleto')],
  ['Incluye estilos adaptables y estados del veredicto', styles.includes('.objective-verdict') && styles.includes('.objective-impossible') && styles.includes('@media (max-width: 600px) { .objective-filters')],
  ['La auditoría está conectada a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-objectives.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de objetivos de clasificación: ${checks.length}/${checks.length}`)
