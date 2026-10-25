import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['La pestaña Escenarios de clasificación está registrada', route.includes("'Escenarios de clasificación'")],
  ['La pestaña renderiza y reinicia el simulador al cambiar temporada global', route.includes(`<ClassificationScenarioPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />`)],
  ['El simulador filtra por temporada y Liga', route.includes('match.seasonId === seasonId && match.competition === \'liga\'')],
  ['Separa partidos finalizados, pendientes y marcadores incompletos', route.includes('const completed = seasonMatches.filter') && route.includes('const pending = seasonMatches.filter((match) => match.homeScore === null && match.awayScore === null)') && route.includes('const incomplete = seasonMatches.filter')],
  ['Exige pronósticos completos antes de simular un partido', route.includes('validScore(prediction.home) && validScore(prediction.away)')],
  ['Limita los goles válidos al rango de 0 a 20', route.includes('Number(value) <= 20')],
  ['Calcula puntos, goles y diferencia de la tabla proyectada', route.includes('home.points += 3') && route.includes('b.goalsFor - b.goalsAgainst')],
  ['Identifica los valores como simulaciones no oficiales', route.includes('SIMULACIÓN · NO OFICIAL') && route.includes('Nada se guarda como resultado oficial')],
  ['Permite borrar los pronósticos locales', route.includes('Borrar escenario {activeScenario}') && route.includes('Borrar ambos') && route.includes('setPredictionsByScenario({ A: {}, B: {} })')],
  ['Incluye estilos adaptables para las tarjetas de partidos', styles.includes('.scenario-fixtures') && styles.includes('@media (max-width: 600px) { .scenario-fixture-score')],
  ['La auditoría está conectada a verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-classification-scenarios.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de escenarios de clasificación: ${checks.length}/${checks.length}`)
