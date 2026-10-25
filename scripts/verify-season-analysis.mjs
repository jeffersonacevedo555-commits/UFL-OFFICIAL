import fs from 'node:fs'
import assert from 'node:assert/strict'

const route = fs.readFileSync('src/routes/index.tsx', 'utf8')
const styles = fs.readFileSync('src/styles.css', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const checks = [
  ['La pestaña Análisis de temporadas está registrada', route.includes("'Análisis de temporadas'")],
  ['La ruta renderiza SeasonAnalysisPanel', route.includes(`<SeasonAnalysisPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />`)],
  ['El panel define filtros por equipo, temporada y competición', route.includes('Equipo del análisis histórico') && route.includes('Temporada del análisis histórico') && route.includes('Competición del análisis histórico')],
  ['Solo usa partidos con ambos marcadores guardados', route.includes('match.homeScore !== null && match.awayScore !== null')],
  ['Calcula puntos y diferencia de goles por temporada', route.includes('pointsPerMatch') && route.includes('difference: goalsFor - goalsAgainst')],
  ['La posición solo se muestra para Liga', route.includes("competitionFilter === 'liga' ? row.rank ?? '—' : '—'")],
  ['Incluye evolución acumulada por ronda', route.includes('Evolución acumulada por ronda') && route.includes('cumulativePoints') && route.includes('cumulativeDifference')],
  ['Incluye estilos adaptables para móvil', styles.includes('.season-analysis-filters') && styles.includes('@media (max-width: 600px) { .season-analysis-filters')],
  ['La auditoría se integra en verify:release', packageJson.scripts['verify:release'].includes('node scripts/verify-season-analysis.mjs')],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FALLO'} ${label}`)
  assert.ok(ok, label)
}
console.log(`Auditoría de análisis de temporadas: ${checks.length}/${checks.length}`)
