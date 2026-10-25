/** Funciones puras para calcular premios del Salón de la Fama.
 * Reciben únicamente datos de una temporada concreta; no consultan ni modifican la base de datos.
 */
export type LeagueStanding = {
  teamId: number
  points: number
  goalDifference: number
  goalsFor: number
  played: number
}

export type SeasonMatch = {
  competition: string
  round: string
  homeId: number
  awayId: number
  homeScore: number | null
  awayScore: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
}

export type GoalStat = { playerId: number; playerName: string; goals: number }

/** La tabla debe venir ordenada por el criterio oficial de clasificación.
 * Si la temporada no está completa o hay empate en los tres criterios disponibles, no asigna campeón.
 */
export function leaguePodium(
  standings: LeagueStanding[],
  expectedMatchesPerTeam = 23,
): { championId: number; runnerUpId: number } | null {
  if (standings.length !== 24 || standings.some((team) =>
    !Number.isInteger(team.teamId) ||
    !Number.isInteger(team.points) || team.points < 0 ||
    !Number.isInteger(team.goalDifference) ||
    !Number.isInteger(team.goalsFor) || team.goalsFor < 0 ||
    team.played !== expectedMatchesPerTeam
  )) return null
  if (new Set(standings.map((team) => team.teamId)).size !== standings.length) return null
  const sorted = [...standings].sort((a, b) =>
    b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
  )
  const tied = (a: LeagueStanding, b: LeagueStanding) =>
    a.points === b.points && a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor
  if (tied(sorted[0]!, sorted[1]!) || tied(sorted[1]!, sorted[2]!)) return null
  return { championId: sorted[0]!.teamId, runnerUpId: sorted[1]!.teamId }
}

/** Resuelve un campeón de final a ida y vuelta solo si ambos marcadores están completos.
 * Si el global empata, exige penaltis registrados en el partido de vuelta.
 */
export function twoLegChampion(matches: SeasonMatch[], competition: string): number | null {
  const finals = matches.filter((m) => m.competition === competition && m.round.startsWith('Final · '))
  const first = finals.find((m) => m.round === 'Final · Ida')
  const second = finals.find((m) => m.round === 'Final · Vuelta')
  if (!first || !second || first.homeScore === null || first.awayScore === null || second.homeScore === null || second.awayScore === null) return null
  if (first.homeId !== second.awayId || first.awayId !== second.homeId) return null
  const totals = new Map<number, number>([
    [first.homeId, first.homeScore + second.awayScore],
    [first.awayId, first.awayScore + second.homeScore],
  ])
  const [a, b] = [...totals.entries()].sort((x, y) => y[1] - x[1])
  if (a![1] !== b![1]) return a![0]
  if (second.homePenaltyScore == null || second.awayPenaltyScore == null || second.homePenaltyScore === second.awayPenaltyScore) return null
  return second.homePenaltyScore > second.awayPenaltyScore ? second.homeId : second.awayId
}

/** Bota de Oro: más goles. Empates compartidos, ordenados por nombre e ID para mostrar de forma estable.
 * Ignora registros con identificador, goles o nombre inválidos; «Sin nombre» es el marcador de posición
 * reservado para jugadores sin nombre real y nunca puede ganar un premio.
 */
export function goldenBoot(stats: GoalStat[]): GoalStat[] {
  const totals = new Map<number, GoalStat>()
  for (const stat of stats) {
    const name = stat.playerName.trim()
    if (!Number.isInteger(stat.playerId) || stat.playerId <= 0 || !Number.isInteger(stat.goals) || stat.goals < 0 || !name || name.toLowerCase() === 'sin nombre') continue
    const current = totals.get(stat.playerId)
    if (current) current.goals += stat.goals
    else totals.set(stat.playerId, { ...stat })
  }
  const ranked = [...totals.values()].filter((player) => player.goals > 0)
  if (!ranked.length) return []
  const maxGoals = Math.max(...ranked.map((player) => player.goals))
  return ranked.filter((player) => player.goals === maxGoals).sort((a, b) => a.playerName.localeCompare(b.playerName) || a.playerId - b.playerId)
}


/**
 * Mezcla un nuevo cálculo con el palmarés previo. Los premios automáticos solo
 * se sustituyen cuando el cálculo actual pudo resolverlos; un resultado
 * incompleto no borra una instantánea histórica ya guardada.
 */
export function mergeCalculatedAwards(
  previous: Record<string, unknown>,
  calculated: Record<string, unknown>,
  automaticKeys: string[],
): Record<string, unknown> {
  const merged = { ...previous }
  for (const key of automaticKeys) {
    if (Object.prototype.hasOwnProperty.call(calculated, key)) merged[key] = calculated[key]
  }
  for (const [key, value] of Object.entries(calculated)) {
    if (!automaticKeys.includes(key)) merged[key] = value
  }
  return merged
}
