import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const route = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const report = readFileSync(new URL('../CAMBIOS-FASE38-TRAYECTORIA-ESTADISTICA.md', import.meta.url), 'utf8')
const checks = [
  ['la ficha incluye la sección de trayectoria', route.includes('Trayectoria estadística')],
  ['el historial itera por todas las temporadas', route.includes('const careerRows = [...seasons]')],
  ['solo se cuentan partidos finalizados', route.includes('match.seasonId === season.id && match.homeScore !== null && match.awayScore !== null')],
  ['el historial filtra estadísticas por jugador', route.includes('stat.playerId === activePlayer.id && seasonMatchMap.has(stat.matchId)')],
  ['se calculan apariciones explícitas', route.includes('entry.appeared === true')],
  ['se acumulan minutos', route.includes('minutes: entries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0)')],
  ['se acumulan goles y asistencias', route.includes('goals: entries.reduce((sum, entry) => sum + entry.goals, 0)') && route.includes('assists: entries.reduce((sum, entry) => sum + entry.assists, 0)')],
  ['la tabla muestra cada temporada', route.includes('row.season.name')],
  ['hay estilos responsive para la trayectoria', styles.includes('.player-career-history') && styles.includes('@media (max-width: 640px)')],
  ['el informe documenta los límites de los datos históricos', report.includes('no se infieren presencias históricas')],
]
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
  assert.ok(passed, label)
}
console.log(`Trayectoria estadística: ${checks.length}/${checks.length} comprobaciones correctas.`)
