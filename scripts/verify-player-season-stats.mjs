import fs from 'node:fs'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const css = fs.readFileSync('src/styles.css', 'utf8')
const checks = [
  ['El panel recibe partidos', /<PlayerProfilesPanel[\s\S]*?matches=\{data\.matches\}/.test(route)],
  ['El panel recibe estadísticas', /<PlayerProfilesPanel[\s\S]*?stats=\{data\.stats\}/.test(route)],
  ['Solo partidos finalizados', /match\.homeScore !== null && match\.awayScore !== null/.test(route)],
  ['Filtrado por temporada seleccionada', /match\.seasonId === selectedSeasonId/.test(route)],
  ['Filtrado opcional por competición', /statsCompetition === 'all' \|\| match\.competition === statsCompetition/.test(route)],
  ['Estadísticas vinculadas al jugador', /stat\.playerId === activePlayer\.id/.test(route)],
  ['Goles, asistencias y MVP agregados', /goals: acc\.goals \+ stat\.goals/.test(route) && /assists: acc\.assists \+ stat\.assists/.test(route) && /mvp: acc\.mvp \+ stat\.mvp/.test(route)],
  ['Incluye filtro de todas las competiciones y opciones existentes', /value="all">Todas las competiciones/.test(route) && /competitions\.map\(\(item\)/.test(route)],
  ['Desglosa estadísticas por competición', /playerStats\.filter\(\(stat\) => competitionMatches\.has\(stat\.matchId\)\)/.test(route)],
  ['Aclara que registros no equivalen a apariciones', /no equivale necesariamente a apariciones/.test(route)],
  ['Diseño adaptable para las tarjetas estadísticas', /player-stat-cards/.test(css) && /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(css)],
]
let failed = 0
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
  if (!passed) failed++
}
console.log(`\nResultado: ${checks.length - failed}/${checks.length} comprobaciones estáticas`)
if (failed) process.exitCode = 1
