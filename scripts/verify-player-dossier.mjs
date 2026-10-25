import fs from 'node:fs'
import assert from 'node:assert/strict'

const ui = fs.readFileSync('src/routes/index.tsx', 'utf8')
const css = fs.readFileSync('src/styles.css', 'utf8')
const checks = [
  ['el expediente recibe eventos de auditoría', ui.includes('adminAuditEvents={data.adminAuditEvents}')],
  ['filtro de eventos vinculados al jugador', ui.includes("snapshots.some((snapshot) => Number(snapshot.playerId) === activePlayer.id)")],
  ['incluye asignaciones históricas de plantilla', ui.includes('...playerSeasonAssignments.map((row)')],
  ['incluye traspasos oficiales', ui.includes('...playerTransfers.map((transfer)')],
  ['incluye auditoría de jugador, plantilla y mercado', ui.includes("['roster', 'transfer', 'market_proposal'].includes(event.entityType)")],
  ['ordena cronología por fecha descendente', ui.includes('new Date(b.date).getTime() - new Date(a.date).getTime()')],
  ['muestra fecha accesible con elemento time', ui.includes('<time dateTime={event.date}>')],
  ['incluye estado vacío para jugadores sin eventos', ui.includes('Sin eventos cronológicos')],
  ['advierte que eventos previos no se reconstruyen', ui.includes('Los cambios anteriores a la activación de la auditoría no se reconstruyen.')],
  ['estilos adaptables de cronología', css.includes('.player-timeline-heading') && css.includes('@media (max-width: 520px)')],
]
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
  assert.ok(passed, name)
}
console.log(`Auditoría de expediente de jugador: ${checks.length}/${checks.length}`)
