import { readFileSync } from 'node:fs'
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1 }
const pass = (message) => console.log(`✓ ${message}`)
const ui = readFileSync('src/routes/index.tsx', 'utf8')
const css = readFileSync('src/styles.css', 'utf8')
const checks = [
  [/\bJugadores\b/.test(ui) && /view === 'Jugadores'/.test(ui), 'la navegación incluye la sección Jugadores'],
  [/function PlayerProfilesPanel\(/.test(ui), 'existe el panel de fichas individuales'],
  [/Buscar jugador/.test(ui) && /type="search"/.test(ui), 'la ficha permite buscar por nombre'],
  [/seasonRoster\.find\(\(row\) => row\.playerId === activePlayer\.id && row\.seasonId === selectedSeasonId\)/.test(ui), 'el equipo visible corresponde a la temporada seleccionada'],
  [/playerSeasonAssignments/.test(ui) && /Plantillas por temporada/.test(ui), 'la ficha muestra las asignaciones por temporada'],
  [/transferHistory\.filter\(\(row\) => row\.playerId === activePlayer\.id\)/.test(ui), 'el historial se filtra por jugador'],
  [/seasonName\(transfer\.seasonId\)/.test(ui), 'cada traspaso indica la temporada'],
  [/player-profiles-layout/.test(css) && /@media \(max-width: 760px\)/.test(css), 'el diseño de fichas incluye adaptación móvil'],
  [/data\.marketTransferHistory/.test(ui) && /data\.playerSeasonRosters/.test(ui), 'la interfaz consume los datos ya disponibles en la API'],
  [!/DROP TABLE|TRUNCATE/i.test(ui), 'la fase no contiene operaciones destructivas de datos'],
]
for (const [ok, message] of checks) { if (ok) pass(message); else fail(message) }
console.log(`\nAuditoría estática de fichas: ${checks.filter(([ok]) => ok).length}/${checks.length}. No sustituye pruebas de navegador ni de integración.`)
