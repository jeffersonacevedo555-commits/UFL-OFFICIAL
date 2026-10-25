export type Team = { id: number; name: string; manager: string; crestImage?: string | null }
export type Season = { id: number; name: string; isCurrent: boolean; createdAt?: string }
export type Match = {
  id: number
  seasonId: number
  competition: string
  round: string
  homeId: number
  awayId: number
  homeScore: number | null
  awayScore: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
  scheduledAt: string | null
}

/** Aísla los partidos de una temporada para evitar mezclar tablas históricas. */
export function matchesForSeason(matches: Match[], seasonId: number | null): Match[] {
  return seasonId === null ? matches : matches.filter((match) => match.seasonId === seasonId)
}
export const competitions = [
  {
    id: 'liga',
    name: 'Liga',
    label: 'La competición principal',
    color: 'lime',
    count: '24 equipos',
  },
  {
    id: 'champions',
    name: 'Champions',
    label: 'La élite de la liga',
    color: 'blue',
    count: 'Puestos 1–12',
  },
  {
    id: 'europa',
    name: 'Europa League',
    label: 'Otra oportunidad de gloria',
    color: 'orange',
    count: 'Puestos 13–24',
  },
  {
    id: 'copa',
    name: 'Copa',
    label: 'Eliminación directa',
    color: 'pink',
    count: 'Top 16 · temporada anterior',
  },
  {
    id: 'supercopa_liga',
    name: 'Supercopa de la Liga',
    label: 'Campeón y subcampeón de Liga y Copa',
    color: 'blue',
    count: '3 eliminatorias · ida y vuelta',
  },
  {
    id: 'supercopa_europa',
    name: 'Supercopa de Europa',
    label: 'Campeones continentales',
    color: 'orange',
    count: 'Final · ida y vuelta',
  },
]
export function standings(teams: Team[], matches: Match[]) {
  const rows = teams.map((t) => ({
    ...t,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
    form: [] as string[],
  }))
  for (const m of matches.filter(
    (m) =>
      m.competition === 'liga' && m.homeScore !== null && m.awayScore !== null,
  )) {
    const h = rows.find((t) => t.id === m.homeId),
      a = rows.find((t) => t.id === m.awayId)
    if (!h || !a) continue
    const hs = m.homeScore!,
      as = m.awayScore!
    h.played++
    a.played++
    h.gf += hs
    h.ga += as
    a.gf += as
    a.ga += hs
    if (hs > as) {
      h.won++
      a.lost++
      h.points += 3
      h.form.push('G')
      a.form.push('P')
    } else if (hs < as) {
      a.won++
      h.lost++
      a.points += 3
      a.form.push('G')
      h.form.push('P')
    } else {
      h.drawn++
      a.drawn++
      h.points++
      a.points++
      h.form.push('E')
      a.form.push('E')
    }
  }
  // Primera clasificación por puntos y diferencia de goles global.
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      (b.gf - b.ga) - (a.gf - a.ga),
  )

  // Para equipos empatados en puntos y diferencia de goles, se calcula
  // una mini-tabla de enfrentamientos directos entre los equipos del grupo.
  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = `${row.points}:${row.gf - row.ga}`
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  const groupHeadToHead = new Map<number, number>()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const ids = new Set(group.map((team) => team.id))
    const totals = new Map<number, number>(
      group.map((team) => [team.id, 0] as [number, number]),
    )
    for (const match of matches) {
      if (
        match.competition !== 'liga' ||
        match.homeScore === null ||
        match.awayScore === null ||
        !ids.has(match.homeId) ||
        !ids.has(match.awayId)
      ) continue
      if (match.homeScore > match.awayScore) {
        totals.set(match.homeId, (totals.get(match.homeId) ?? 0) + 3)
      } else if (match.homeScore < match.awayScore) {
        totals.set(match.awayId, (totals.get(match.awayId) ?? 0) + 3)
      } else {
        totals.set(match.homeId, (totals.get(match.homeId) ?? 0) + 1)
        totals.set(match.awayId, (totals.get(match.awayId) ?? 0) + 1)
      }
    }
    for (const [id, points] of totals) groupHeadToHead.set(id, points)
  }
  return rows.sort((a, b) => {
    const points = b.points - a.points
    if (points) return points
    const goalDifference = (b.gf - b.ga) - (a.gf - a.ga)
    if (goalDifference) return goalDifference
    const headToHead = (groupHeadToHead.get(b.id) ?? 0) - (groupHeadToHead.get(a.id) ?? 0)
    if (headToHead) return headToHead
    // Si los criterios deportivos no separan a los equipos, mantenemos un
    // orden estable por ID. La resolución manual acordada aún requiere una
    // opción explícita de administración y no debe simularse con el nombre.
    return b.gf - a.gf || a.ga - b.ga || a.id - b.id
  })
}


/** Indica si queda un empate deportivo irresuelto en la tabla final. */
export function hasUnresolvedStandingsTie(teams: Team[], matches: Match[]): boolean {
  const table = standings(teams, matches)
  for (let i = 0; i < table.length; i++) {
    for (let j = i + 1; j < table.length; j++) {
      const a = table[i]!
      const b = table[j]!
      if (
        a.points !== b.points ||
        a.gf - a.ga !== b.gf - b.ga ||
        a.gf !== b.gf ||
        a.ga !== b.ga
      ) continue
      const groupIds = new Set(
        table
          .filter((row) => row.points === a.points && row.gf - row.ga === a.gf - a.ga)
          .map((row) => row.id),
      )
      const headToHeadPoints = (teamId: number) => {
        let points = 0
        for (const match of matches) {
          if (
            match.competition !== 'liga' ||
            match.homeScore === null ||
            match.awayScore === null ||
            !groupIds.has(match.homeId) ||
            !groupIds.has(match.awayId) ||
            (match.homeId !== teamId && match.awayId !== teamId)
          ) continue
          if (match.homeScore === match.awayScore) points++
          else if (
            (match.homeId === teamId && match.homeScore > match.awayScore) ||
            (match.awayId === teamId && match.awayScore > match.homeScore)
          ) points += 3
        }
        return points
      }
      if (headToHeadPoints(a.id) === headToHeadPoints(b.id)) return true
    }
  }
  return false
}

export type MatchFixture = Pick<
  Match,
  'competition' | 'round' | 'homeId' | 'awayId' | 'homeScore' | 'awayScore' | 'scheduledAt'
>

/** Crea los dos partidos de una eliminatoria, invirtiendo la localía. */
export function createTwoLegTie(
  competition: string,
  round: string,
  firstLegHomeId: number,
  firstLegAwayId: number,
): [MatchFixture, MatchFixture] {
  if (firstLegHomeId === firstLegAwayId) {
    throw new Error('Una eliminatoria necesita dos equipos diferentes.')
  }
  const fixture = (homeId: number, awayId: number, leg: string): MatchFixture => ({
    competition,
    round: `${round} · ${leg}`,
    homeId,
    awayId,
    homeScore: null,
    awayScore: null,
    scheduledAt: null,
  })
  return [
    fixture(firstLegHomeId, firstLegAwayId, 'Ida'),
    fixture(firstLegAwayId, firstLegHomeId, 'Vuelta'),
  ]
}

export type KnockoutLegResult = {
  homeId: number
  awayId: number
  homeScore: number | null
  awayScore: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
}

export type TwoLegDecision = {
  winnerId: number
  firstTeamAggregate: number
  secondTeamAggregate: number
  decidedBy: 'aggregate' | 'penalties'
}

/** Evita que editar una ida deje una tanda de penaltis inválida en la vuelta. */
export function assertPenaltyDecisionStillValidAfterFirstLegEdit(
  firstLegHomeScore: number | null,
  firstLegAwayScore: number | null,
  secondLeg: Pick<Match, 'homeScore' | 'awayScore' | 'homePenaltyScore' | 'awayPenaltyScore'>,
): void {
  const hasPenalties = secondLeg.homePenaltyScore != null || secondLeg.awayPenaltyScore != null
  if (!hasPenalties) return
  if (
    firstLegHomeScore == null || firstLegAwayScore == null ||
    secondLeg.homeScore == null || secondLeg.awayScore == null ||
    secondLeg.homePenaltyScore == null || secondLeg.awayPenaltyScore == null ||
    secondLeg.homePenaltyScore === secondLeg.awayPenaltyScore
  ) {
    throw new Error('La vuelta tiene penaltis registrados. Completa los marcadores y conserva una tanda válida antes de cambiar la ida.')
  }
  const aggregateHome = firstLegHomeScore + secondLeg.awayScore
  const aggregateAway = firstLegAwayScore + secondLeg.homeScore
  if (aggregateHome !== aggregateAway) {
    throw new Error('Cambiar la ida invalidaría los penaltis registrados en la vuelta. Elimina primero la tanda de penaltis de la vuelta.')
  }
}

/**
 * Resuelve una eliminatoria de ida y vuelta. Si el global queda empatado,
 * exige una tanda de penaltis registrada en el partido de vuelta.
 */
export function resolveTwoLegTie(
  firstLeg: KnockoutLegResult,
  secondLeg: KnockoutLegResult,
): TwoLegDecision {
  if (firstLeg.homeId === firstLeg.awayId ||
      secondLeg.homeId !== firstLeg.awayId ||
      secondLeg.awayId !== firstLeg.homeId) {
    throw new Error('Los partidos no forman una eliminatoria válida de ida y vuelta.')
  }
  if ([firstLeg.homeScore, firstLeg.awayScore, secondLeg.homeScore, secondLeg.awayScore].some((score) => score === null || !Number.isInteger(score) || score < 0)) {
    throw new Error('La eliminatoria necesita los cuatro marcadores de ida y vuelta.')
  }
  const firstTeamAggregate = firstLeg.homeScore! + secondLeg.awayScore!
  const secondTeamAggregate = firstLeg.awayScore! + secondLeg.homeScore!
  const homePens = secondLeg.homePenaltyScore
  const awayPens = secondLeg.awayPenaltyScore
  if (firstTeamAggregate !== secondTeamAggregate) {
    if (homePens != null || awayPens != null) {
      throw new Error('No se pueden registrar penaltis si el marcador global no está empatado.')
    }
    return {
      winnerId: firstTeamAggregate > secondTeamAggregate ? firstLeg.homeId : firstLeg.awayId,
      firstTeamAggregate,
      secondTeamAggregate,
      decidedBy: 'aggregate',
    }
  }
  if (homePens == null || awayPens == null ||
      !Number.isInteger(homePens) || !Number.isInteger(awayPens) ||
      homePens < 0 || awayPens < 0 || homePens === awayPens) {
    throw new Error('El global está empatado: registra una tanda de penaltis con un ganador para resolver la eliminatoria.')
  }
  return {
    winnerId: homePens > awayPens ? secondLeg.homeId : secondLeg.awayId,
    firstTeamAggregate,
    secondTeamAggregate,
    decidedBy: 'penalties',
  }
}

/** Genera la siguiente ronda de Copa a partir de la ronda anterior ya finalizada. */
export function generateNextCupRound(cupMatches: Match[]): MatchFixture[] {
  const stages = [
    { current: 'Octavos de final', next: 'Cuartos de final', matchCount: 16 },
    { current: 'Cuartos de final', next: 'Semifinal', matchCount: 8 },
    { current: 'Semifinal', next: 'Final', matchCount: 4 },
  ] as const
  const existingRounds = new Set(cupMatches.map((match) => match.round.replace(/ · (Ida|Vuelta)$/, '')))
  const stage = [...stages].reverse().find((candidate) => existingRounds.has(candidate.current))
  if (!stage) {
    throw new Error('Primero genera los octavos de final de Copa.')
  }
  if (stage.current === 'Semifinal' && existingRounds.has('Final')) {
    throw new Error('La final de Copa ya existe.')
  }
  if (existingRounds.has(stage.next)) {
    throw new Error(`La ronda ${stage.next.toLowerCase()} de Copa ya existe.`)
  }
  const stageMatches = cupMatches.filter((match) => match.round.startsWith(`${stage.current} · `))
  if (stageMatches.length !== stage.matchCount) {
    throw new Error(`La ronda ${stage.current.toLowerCase()} debe tener ${stage.matchCount} partidos.`)
  }
  const firstLegs = stageMatches.filter((match) => match.round === `${stage.current} · Ida`).sort((a, b) => a.id - b.id)
  const secondLegs = stageMatches.filter((match) => match.round === `${stage.current} · Vuelta`)
  if (firstLegs.length * 2 !== stage.matchCount || secondLegs.length !== firstLegs.length) {
    throw new Error(`La ronda ${stage.current.toLowerCase()} debe tener ida y vuelta para cada cruce.`)
  }

  // Refuse to advance a manually edited or corrupted bracket: every club may
  // appear in only one tie in a round, and every return leg must pair uniquely.
  const participatingTeams = new Set<number>()
  const firstLegPairs = new Set<string>()
  for (const firstLeg of firstLegs) {
    if (firstLeg.homeId === firstLeg.awayId) {
      throw new Error(`La ronda ${stage.current.toLowerCase()} contiene un cruce con el mismo equipo.`)
    }
    const pair = [firstLeg.homeId, firstLeg.awayId].sort((a, b) => a - b).join(':')
    if (firstLegPairs.has(pair) || participatingTeams.has(firstLeg.homeId) || participatingTeams.has(firstLeg.awayId)) {
      throw new Error(`La ronda ${stage.current.toLowerCase()} contiene equipos o cruces duplicados.`)
    }
    firstLegPairs.add(pair)
    participatingTeams.add(firstLeg.homeId)
    participatingTeams.add(firstLeg.awayId)
  }
  const usedSecondLegs = new Set<number>()
  const winners: number[] = []
  for (const firstLeg of firstLegs) {
    const matchingSecondLegs = secondLegs.filter((match) => match.homeId === firstLeg.awayId && match.awayId === firstLeg.homeId)
    const secondLeg = matchingSecondLegs[0]
    if (matchingSecondLegs.length !== 1 || !secondLeg || usedSecondLegs.has(secondLeg.id) || firstLeg.homeScore === null || firstLeg.awayScore === null || secondLeg.homeScore === null || secondLeg.awayScore === null) {
      throw new Error(`Completa los resultados de ida y vuelta de ${stage.current.toLowerCase()} y verifica que cada cruce tenga una sola vuelta.`)
    }
    usedSecondLegs.add(secondLeg.id)
    winners.push(resolveTwoLegTie(firstLeg, secondLeg).winnerId)
  }
  if (usedSecondLegs.size !== secondLegs.length) {
    throw new Error(`La ronda ${stage.current.toLowerCase()} contiene una vuelta sin partido de ida correspondiente.`)
  }
  const expectedWinners = stage.matchCount / 2
  if (winners.length !== expectedWinners || new Set(winners).size !== winners.length) {
    throw new Error('No se pudo determinar una lista válida de clasificados de Copa.')
  }
  // Mantiene el cuadro original: los cruces que comparten lado del cuadro
  // se enfrentan entre sí, en lugar de volver a emparejar por orden de guardado.
  const nextRoundPairs: Record<string, Array<[number, number]>> = {
    'Cuartos de final': [[0, 7], [3, 4], [1, 6], [2, 5]],
    Semifinal: [[0, 1], [2, 3]],
    Final: [[0, 1]],
  }
  const pairings = nextRoundPairs[stage.next]
  if (!pairings || pairings.length * 2 !== winners.length) {
    throw new Error('No se pudo conservar el cuadro previsto para la siguiente ronda de Copa.')
  }
  const fixtures: MatchFixture[] = []
  for (const [firstIndex, secondIndex] of pairings) {
    const firstWinner = winners[firstIndex]
    const secondWinner = winners[secondIndex]
    if (firstWinner === undefined || secondWinner === undefined || firstWinner === secondWinner) {
      throw new Error('El cuadro de Copa contiene clasificados inválidos o duplicados.')
    }
    fixtures.push(...createTwoLegTie('copa', stage.next, firstWinner, secondWinner))
  }
  return fixtures
}

/**
 * Genera los octavos de Copa con los puestos 1–16 de la temporada anterior.
 * La lista debe llegar ordenada de mejor a peor y contener los 24 equipos.
 */
export function generateCupOpeningRound(
  previousSeasonOrderedTeamIds: number[],
): MatchFixture[] {
  if (previousSeasonOrderedTeamIds.length !== 24) {
    throw new Error('La Copa necesita la clasificación completa de 24 equipos de la temporada anterior.')
  }
  if (new Set(previousSeasonOrderedTeamIds).size !== 24) {
    throw new Error('La clasificación contiene equipos duplicados.')
  }
  const qualified = previousSeasonOrderedTeamIds.slice(0, 16)
  const fixtures: MatchFixture[] = []
  for (let index = 0; index < 8; index++) {
    const highSeed = qualified[index]!
    const lowSeed = qualified[15 - index]!
    fixtures.push(...createTwoLegTie('copa', 'Octavos de final', highSeed, lowSeed))
  }
  return fixtures
}

export type SupercopaLigaCandidates = {
  /** Campeón de Liga y siguientes puestos elegibles, en orden. */
  leagueChampion: number[]
  /** Subcampeón de Copa y, después, tercer puesto y siguientes. */
  cupRunnerUp: number[]
  /** Subcampeón de Liga y siguientes puestos elegibles, en orden. */
  leagueRunnerUp: number[]
  /** Campeón de Copa y, después, tercer puesto y siguientes. */
  cupChampion: number[]
}

export type SupercopaLigaEntrants = {
  leagueChampion: number
  cupRunnerUp: number
  leagueRunnerUp: number
  cupChampion: number
}

/**
 * Resuelve las cuatro plazas de la Supercopa de Liga sin duplicar equipos.
 * Cada lista de candidatos debe respetar el orden de sustitución de su competición
 * (por ejemplo: titular, tercer puesto, cuarto puesto...).
 */
export function resolveSupercopaLigaEntrants(
  candidates: SupercopaLigaCandidates,
): SupercopaLigaEntrants {
  const slots: (keyof SupercopaLigaCandidates)[] = [
    'leagueChampion',
    'cupRunnerUp',
    'leagueRunnerUp',
    'cupChampion',
  ]
  const used = new Set<number>()
  const result = {} as SupercopaLigaEntrants
  for (const slot of slots) {
    const choices = candidates[slot]
    if (!choices.length || choices.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new Error(`La lista de candidatos de ${slot} no es válida.`)
    }
    const selected = choices.find((id) => !used.has(id))
    if (selected === undefined) {
      throw new Error(`No hay suficientes equipos distintos para cubrir la plaza ${slot} de la Supercopa de Liga.`)
    }
    used.add(selected)
    result[slot] = selected
  }
  return result
}

/**
 * Construye las listas de candidatos de la Supercopa de Liga a partir de la
 * clasificación final de Liga (ordenada) y los finalistas de Copa. Las plazas de
 * Copa repetidas se cubren desde el tercer puesto de Liga, de modo que campeón y
 * subcampeón de Liga conservan siempre sus propias plazas.
 */
export function supercopaLigaCandidates(
  leagueOrderedTeamIds: number[],
  cupChampionId: number,
  cupRunnerUpId: number,
): SupercopaLigaCandidates {
  return {
    leagueChampion: leagueOrderedTeamIds,
    cupRunnerUp: [cupRunnerUpId, ...leagueOrderedTeamIds.slice(2)],
    leagueRunnerUp: leagueOrderedTeamIds.slice(1),
    cupChampion: [cupChampionId, ...leagueOrderedTeamIds.slice(2)],
  }
}

/** Genera las dos semifinales de la Supercopa de Liga, ambas a ida y vuelta. */
export function generateSupercopaLigaSemifinals(
  candidates: SupercopaLigaCandidates,
): MatchFixture[] {
  const entrants = resolveSupercopaLigaEntrants(candidates)
  return [
    ...createTwoLegTie(
      'supercopa_liga',
      'Semifinal 1',
      entrants.leagueChampion,
      entrants.cupRunnerUp,
    ),
    ...createTwoLegTie(
      'supercopa_liga',
      'Semifinal 2',
      entrants.leagueRunnerUp,
      entrants.cupChampion,
    ),
  ]
}

/** Genera la final de Supercopa de Liga cuando ya se conocen los semifinalistas ganadores. */
export function generateSupercopaLigaFinal(
  semifinalOneWinnerId: number,
  semifinalTwoWinnerId: number,
): MatchFixture[] {
  return createTwoLegTie(
    'supercopa_liga',
    'Final',
    semifinalOneWinnerId,
    semifinalTwoWinnerId,
  )
}

/** Final de Supercopa de Europa: campeón de Champions contra campeón de Europa League. */
export function generateSupercopaEuropaFinal(
  championsWinnerId: number,
  europaWinnerId: number,
): MatchFixture[] {
  return createTwoLegTie(
    'supercopa_europa',
    'Final',
    championsWinnerId,
    europaWinnerId,
  )
}

export type Player = { id: number; teamId: number; name: string; photoImage?: string | null }
export type News = {
  id: number
  title: string
  body: string
  imageKey?: string | null
  createdAt: string
  updatedAt: string
}
export type MatchStat = {
  matchId: number
  playerId: number
  goals: number
  assists: number
  mvp: number
  appeared?: boolean
  minutes?: number
}

export function playerStandings(
  players: Player[],
  matches: Match[],
  stats: MatchStat[],
  competition: string,
) {
  const completed = new Set(
    matches
      .filter(
        (m) =>
          m.competition === competition &&
          m.homeScore !== null &&
          m.awayScore !== null,
      )
      .map((m) => m.id),
  )
  const totals = new Map(
    players.map((p) => [p.id, { ...p, goals: 0, assists: 0, mvp: 0 }]),
  )
  for (const stat of stats) {
    const player = totals.get(stat.playerId)
    if (!player || !completed.has(stat.matchId)) continue
    player.goals += stat.goals
    player.assists += stat.assists
    player.mvp += stat.mvp
  }
  return [...totals.values()]
}
