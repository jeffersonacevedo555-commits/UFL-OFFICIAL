import fs from 'node:fs'
import assert from 'node:assert/strict'

const api = fs.readFileSync('netlify/functions/tournament.mts', 'utf8')
const ui = fs.readFileSync('src/routes/index.tsx', 'utf8')
const schema = fs.readFileSync('db/schema.ts', 'utf8')
const checks = [
  ['acción de edición de jugador', api.includes("body.action === 'editPlayer'")],
  ['validación del nombre del jugador', api.includes("name: z.string().trim().min(2).max(60)")],
  ['validación de existencia del equipo', api.includes('El equipo seleccionado no existe.')],
  ['auditoría de edición de jugador', api.includes("entityType: 'player', entityId: data.id") && api.includes("action: 'updated'")],
  ['acción de actualización de plantilla por temporada', api.includes("body.action === 'updateSeasonRoster'")],
  ['verificación de asignación de plantilla existente', api.includes('El jugador no tiene una asignación de plantilla en esa temporada.')],
  ['rechazo de asignación duplicada sin cambios', api.includes('El jugador ya está asignado a ese equipo en esta temporada.')],
  ['auditoría de cambio de plantilla', api.includes("entityType: 'roster', entityId: before.id")],
  ['editor de jugadores en interfaz', ui.includes("action: 'editPlayer'") && ui.includes('Guardar cambios del jugador')],
  ['editor de plantilla por temporada', ui.includes("action: 'updateSeasonRoster'") && ui.includes('Asignación de plantilla por temporada')],
  ['esquema permite auditoría de player y roster', schema.includes("'match', 'roster', 'transfer', 'market_proposal', 'team', 'player'")],
]
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
  assert.ok(passed, name)
}
console.log(`Auditoría de administración de jugadores y plantillas: ${checks.length}/${checks.length}`)
