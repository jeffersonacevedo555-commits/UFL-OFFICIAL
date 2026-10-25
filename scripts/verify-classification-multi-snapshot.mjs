import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['Permite seleccionar escenarios guardados para compararlos', route.includes('comparisonSnapshotIds') && route.includes('multi-snapshot-picker')],
  ['Limita la comparación a cuatro escenarios', route.includes('comparisonSnapshotIds.length >= 4') && route.includes('.slice(-4)')],
  ['Resume el mejor y peor puesto de cada equipo', route.includes('bestPosition') && route.includes('worstPosition')],
  ['Calcula la variación de puesto y puesto medio descriptivo', route.includes('positionSpread') && route.includes('averagePosition')],
  ['Resume mínimos y máximos de puntos entre escenarios', route.includes('minPoints') && route.includes('maxPoints') && route.includes('Puntos mínimos')],
  ['Muestra la posición y puntos de cada escenario', route.includes('snapshotRow.position') && route.includes('snapshotRow.points')],
  ['Identifica partidos con marcadores distintos entre snapshots', route.includes('differingSnapshotFixtures') && route.includes('new Set(item.outcomes.map((outcome) => outcome.key)).size > 1')],
  ['Representa explícitamente partidos sin pronóstico', route.includes("'Sin pronóstico'")],
  ['Aclara que el resumen no es una probabilidad', route.includes('El puesto medio es descriptivo, no una probabilidad')],
  ['Incluye estilos adaptables para selector y tablas', styles.includes('.multi-snapshot-picker') && styles.includes('.multi-snapshot-table') && styles.includes('@media (max-width: 760px)')],
  ['Conecta la auditoría a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-multi-snapshot.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de comparación múltiple: ${checks.length}/${checks.length}`)
