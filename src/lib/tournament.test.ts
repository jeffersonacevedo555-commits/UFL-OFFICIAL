import { describe, expect, it } from 'vitest'
import {
  assertPenaltyDecisionStillValidAfterFirstLegEdit,
  generateCupOpeningRound,
  generateNextCupRound,
  generateSupercopaEuropaFinal,
  generateSupercopaLigaFinal,
  generateSupercopaLigaSemifinals,
  resolveSupercopaLigaEntrants,
  resolveTwoLegTie,
  supercopaLigaCandidates,
  matchesForSeason,
  hasUnresolvedStandingsTie,
  standings,
  type Match,
  type Team,
} from './tournament'

const teams: Team[] = [
  { id: 1, name: 'Alpha', manager: 'A' },
  { id: 2, name: 'Bravo', manager: 'B' },
  { id: 3, name: 'Charlie', manager: 'C' },
  { id: 4, name: 'Delta', manager: 'D' },
]

function match(
  id: number,
  homeId: number,
  awayId: number,
  homeScore: number,
  awayScore: number,
): Match {
  return {
    id,
    seasonId: 1,
    competition: 'liga',
    round: String(id),
    homeId,
    awayId,
    homeScore,
    awayScore,
    scheduledAt: null,
  }
}

describe('progresión de Copa', () => {
  function cupMatch(id: number, round: string, homeId: number, awayId: number, homeScore: number | null, awayScore: number | null, homePenaltyScore: number | null = null, awayPenaltyScore: number | null = null): Match {
    return {
      id, seasonId: 2, competition: 'copa', round, homeId, awayId,
      homeScore, awayScore, homePenaltyScore, awayPenaltyScore, scheduledAt: null,
    }
  }

  it('genera cuartos de final con los ganadores de octavos a ida y vuelta', () => {
    const matches: Match[] = []
    for (let index = 0; index < 8; index++) {
      const high = index + 1
      const low = 16 - index
      matches.push(cupMatch(index * 2 + 1, 'Octavos de final · Ida', high, low, 1, 0))
      matches.push(cupMatch(index * 2 + 2, 'Octavos de final · Vuelta', low, high, 0, 0))
    }
    const next = generateNextCupRound(matches)
    expect(next).toHaveLength(8)
    expect(next.every((fixture) => fixture.round === 'Cuartos de final · Ida' || fixture.round === 'Cuartos de final · Vuelta')).toBe(true)
    // El cuadro se conserva: ganador 1–16 vs 8–9, 4–13 vs 5–12, 2–15 vs 7–10, 3–14 vs 6–11.
    expect(next.filter((fixture) => fixture.round.endsWith('Ida')).map((fixture) => [fixture.homeId, fixture.awayId])).toEqual([[1, 8], [4, 5], [2, 7], [3, 6]])
  })

  it('no avanza si una ida o vuelta no tiene resultado', () => {
    const matches = [
      cupMatch(1, 'Octavos de final · Ida', 1, 16, 1, 0),
      cupMatch(2, 'Octavos de final · Vuelta', 16, 1, null, null),
    ]
    expect(() => generateNextCupRound(matches)).toThrow(/debe tener 16 partidos/)
  })

  it('rechaza una ronda con el mismo equipo en dos cruces', () => {
    const matches: Match[] = []
    for (let index = 0; index < 8; index++) {
      const high = index + 1
      const low = 16 - index
      matches.push(cupMatch(index * 2 + 1, 'Octavos de final · Ida', high, low, 1, 0))
      matches.push(cupMatch(index * 2 + 2, 'Octavos de final · Vuelta', low, high, 0, 0))
    }
    matches[2]!.homeId = matches[0]!.homeId
    expect(() => generateNextCupRound(matches)).toThrow(/duplicados/i)
  })

  it('resuelve los empates globales mediante los penaltis de la vuelta', () => {
    const matches: Match[] = []
    for (let index = 0; index < 8; index++) {
      const high = index + 1
      const low = 16 - index
      matches.push(cupMatch(index * 2 + 1, 'Octavos de final · Ida', high, low, 1, 0))
      matches.push(cupMatch(index * 2 + 2, 'Octavos de final · Vuelta', low, high, index === 0 ? 1 : 0, 0, index === 0 ? 4 : null, index === 0 ? 3 : null))
    }
    const next = generateNextCupRound(matches)
    expect(next).toHaveLength(8)
    expect(next[0]?.homeId).toBe(16)
  })
})

describe('historial de temporadas', () => {
  it('separa los partidos por temporada sin alterar los registros originales', () => {
    const oldSeason = { ...match(1, 1, 2, 2, 0), seasonId: 1 }
    const newSeason = { ...match(2, 1, 2, 0, 1), seasonId: 2 }
    expect(matchesForSeason([oldSeason, newSeason], 1).map((m) => m.id)).toEqual([1])
    expect(matchesForSeason([oldSeason, newSeason], 2).map((m) => m.id)).toEqual([2])
    expect(matchesForSeason([oldSeason, newSeason], null)).toHaveLength(2)
  })
})

describe('clasificación UFL', () => {
  it('aplica enfrentamiento directo después de puntos y diferencia de goles', () => {
    const matches = [
      match(1, 1, 2, 1, 0), // Alpha vence a Bravo
      match(2, 3, 1, 1, 0), // Alpha pierde ante Charlie
      match(3, 2, 4, 1, 0), // Bravo vence a Delta
      match(4, 3, 4, 1, 0),
    ]
    const table = standings(teams, matches)
    expect(table.findIndex((team) => team.id === 1)).toBeLessThan(
      table.findIndex((team) => team.id === 2),
    )
  })


  it('mantiene un orden estable por ID cuando todos los criterios deportivos empatan', () => {
    const teamsWithNamesOutOfOrder: Team[] = [
      { id: 3, name: 'Alpha', manager: 'A' },
      { id: 1, name: 'Zulu', manager: 'Z' },
      { id: 2, name: 'Bravo', manager: 'B' },
    ]
    const table = standings(teamsWithNamesOutOfOrder, [])
    expect(table.map((team) => team.id)).toEqual([1, 2, 3])
  })

  it('ignora partidos sin resultado al calcular la clasificación', () => {
    const scheduled: Match = {
      id: 10,
      seasonId: 1,
      competition: 'liga',
      round: '1',
      homeId: 1,
      awayId: 2,
      homeScore: null,
      awayScore: null,
      scheduledAt: null,
    }
    const table = standings(teams, [scheduled])
    expect(table.every((team) => team.played === 0 && team.points === 0)).toBe(true)
  })

  it('ordena por goles a favor cuando puntos y diferencia de goles empatan', () => {
    const equalPoints = [
      match(1, 1, 3, 3, 1),
      match(2, 2, 4, 2, 0),
    ]
    const table = standings(teams, equalPoints)
    expect(table[0].id).toBe(1)
    expect(table[1].id).toBe(2)
  })
})


describe('desempates pendientes de resolución manual', () => {
  it('detecta equipos que siguen empatados tras todos los criterios deportivos', () => {
    const tiedTeams: Team[] = [
      { id: 1, name: 'Uno', manager: 'A' },
      { id: 2, name: 'Dos', manager: 'B' },
    ]
    expect(hasUnresolvedStandingsTie(tiedTeams, [match(1, 1, 2, 0, 0)])).toBe(true)
  })

  it('no marca como irresuelto un empate separado por enfrentamiento directo', () => {
    const tiedTeams: Team[] = [
      { id: 1, name: 'Uno', manager: 'A' },
      { id: 2, name: 'Dos', manager: 'B' },
    ]
    expect(hasUnresolvedStandingsTie(tiedTeams, [match(1, 1, 2, 1, 0)])).toBe(false)
  })
})

describe('resolución de eliminatorias a doble partido', () => {
  it('resuelve por marcador global cuando no hay empate', () => {
    expect(resolveTwoLegTie(
      { homeId: 1, awayId: 2, homeScore: 2, awayScore: 0 },
      { homeId: 2, awayId: 1, homeScore: 1, awayScore: 1 },
    )).toEqual({ winnerId: 1, firstTeamAggregate: 3, secondTeamAggregate: 1, decidedBy: 'aggregate' })
  })

  it('resuelve un global empatado directamente por penaltis', () => {
    expect(resolveTwoLegTie(
      { homeId: 1, awayId: 2, homeScore: 1, awayScore: 0 },
      { homeId: 2, awayId: 1, homeScore: 1, awayScore: 0, homePenaltyScore: 4, awayPenaltyScore: 5 },
    )).toEqual({ winnerId: 1, firstTeamAggregate: 1, secondTeamAggregate: 1, decidedBy: 'penalties' })
  })

  it('no inventa ganador si el global está empatado y no hay penaltis válidos', () => {
    const first = { homeId: 1, awayId: 2, homeScore: 1, awayScore: 0 }
    expect(() => resolveTwoLegTie(first, { homeId: 2, awayId: 1, homeScore: 1, awayScore: 0 })).toThrow(/penaltis/)
    expect(() => resolveTwoLegTie(first, { homeId: 2, awayId: 1, homeScore: 1, awayScore: 0, homePenaltyScore: 3, awayPenaltyScore: 3 })).toThrow(/penaltis/)
  })


  it('rechaza penaltis guardados cuando el global ya tiene ganador', () => {
    expect(() => resolveTwoLegTie(
      { homeId: 1, awayId: 2, homeScore: 2, awayScore: 0 },
      { homeId: 2, awayId: 1, homeScore: 0, awayScore: 0, homePenaltyScore: 4, awayPenaltyScore: 3 },
    )).toThrow(/global no está empatado/i)
  })
})

describe('generación de eliminatorias', () => {
  const allTeamIds = Array.from({ length: 24 }, (_, index) => index + 1)

  it('genera ocho cruces de Copa con la siembra 1–16 y dos partidos por cruce', () => {
    const fixtures = generateCupOpeningRound(allTeamIds)
    expect(fixtures).toHaveLength(16)
    expect(fixtures.slice(0, 2).map(({ homeId, awayId }) => [homeId, awayId])).toEqual([
      [1, 16],
      [16, 1],
    ])
    expect(fixtures.slice(2, 4).map(({ homeId, awayId }) => [homeId, awayId])).toEqual([
      [2, 15],
      [15, 2],
    ])
    expect(fixtures.every((fixture) => fixture.competition === 'copa')).toBe(true)
    expect(fixtures.every((fixture) => fixture.homeScore === null && fixture.awayScore === null)).toBe(true)
  })

  it('conserva el cuadro original al generar los cuartos de final', () => {
    const ids = Array.from({ length: 24 }, (_, index) => index + 1)
    const opening = generateCupOpeningRound(ids).map((match, index) => ({
      ...match,
      id: index + 1,
      seasonId: 1,
      homePenaltyScore: null,
      awayPenaltyScore: null,
      homeScore: match.round.endsWith('· Ida') ? 1 : 0,
      awayScore: 0,
    }))
    const quarters = generateNextCupRound(opening)
    expect(quarters.filter((match) => match.round === 'Cuartos de final · Ida').map((match) => [match.homeId, match.awayId])).toEqual([
      [1, 8], [4, 5], [2, 7], [3, 6],
    ])
  })

  it('rechaza clasificaciones incompletas o con equipos repetidos para generar la Copa', () => {
    expect(() => generateCupOpeningRound(allTeamIds.slice(0, 23))).toThrow(/24 equipos/)
    expect(() => generateCupOpeningRound([...allTeamIds.slice(0, 23), 1])).toThrow(/duplicados/)
  })

  it('genera las dos semifinales de Supercopa de Liga con cuatro partidos', () => {
    const fixtures = generateSupercopaLigaSemifinals({
      leagueChampion: [1, 3, 4],
      cupRunnerUp: [2, 5, 6],
      leagueRunnerUp: [3, 4, 5],
      cupChampion: [4, 6, 7],
    })
    expect(fixtures).toHaveLength(4)
    expect(fixtures.map(({ round, homeId, awayId }) => [round, homeId, awayId])).toEqual([
      ['Semifinal 1 · Ida', 1, 2],
      ['Semifinal 1 · Vuelta', 2, 1],
      ['Semifinal 2 · Ida', 3, 4],
      ['Semifinal 2 · Vuelta', 4, 3],
    ])
  })

  it('reemplaza plazas duplicadas siguiendo los candidatos de cada competición', () => {
    const entrants = resolveSupercopaLigaEntrants({
      leagueChampion: [1, 3, 4],
      cupRunnerUp: [1, 3, 5],
      leagueRunnerUp: [2, 4, 6],
      cupChampion: [2, 5, 7],
    })
    expect(entrants).toEqual({
      leagueChampion: 1,
      cupRunnerUp: 3,
      leagueRunnerUp: 2,
      cupChampion: 5,
    })
    expect(new Set(Object.values(entrants)).size).toBe(4)
  })

  it('cubre plazas de Copa repetidas desde el tercer puesto de Liga sin quitar la plaza del subcampeón', () => {
    const league = Array.from({ length: 24 }, (_, index) => index + 1)
    // El campeón de Liga (1) también es subcampeón de Copa; la Copa la gana el 9.º.
    expect(resolveSupercopaLigaEntrants(supercopaLigaCandidates(league, 9, 1))).toEqual({
      leagueChampion: 1,
      cupRunnerUp: 3,
      leagueRunnerUp: 2,
      cupChampion: 9,
    })
    // Los dos finalistas de Copa son campeón y subcampeón de Liga.
    expect(resolveSupercopaLigaEntrants(supercopaLigaCandidates(league, 2, 1))).toEqual({
      leagueChampion: 1,
      cupRunnerUp: 3,
      leagueRunnerUp: 2,
      cupChampion: 4,
    })
  })

  it('rechaza listas de candidatos insuficientes o inválidas', () => {
    expect(() => resolveSupercopaLigaEntrants({
      leagueChampion: [1], cupRunnerUp: [1], leagueRunnerUp: [1], cupChampion: [1],
    })).toThrow(/suficientes equipos distintos/)
    expect(() => resolveSupercopaLigaEntrants({
      leagueChampion: [0], cupRunnerUp: [2], leagueRunnerUp: [3], cupChampion: [4],
    })).toThrow(/no es válida/)
  })

  it('genera la final de Supercopa de Liga a doble partido y rechaza al mismo equipo', () => {
    expect(generateSupercopaLigaFinal(8, 12).map(({ homeId, awayId, round }) => [homeId, awayId, round])).toEqual([
      [8, 12, 'Final · Ida'],
      [12, 8, 'Final · Vuelta'],
    ])
    expect(() => generateSupercopaLigaFinal(8, 8)).toThrow(/diferentes/)
  })

  it('genera la Supercopa de Europa a doble partido con localía invertida', () => {
    const fixtures = generateSupercopaEuropaFinal(7, 18)
    expect(fixtures.map(({ homeId, awayId, round }) => [homeId, awayId, round])).toEqual([
      [7, 18, 'Final · Ida'],
      [18, 7, 'Final · Vuelta'],
    ])
    expect(() => generateSupercopaEuropaFinal(7, 7)).toThrow(/diferentes/)
  })
})


describe('integridad de tandas al editar resultados', () => {
  const secondLeg = {
    homeScore: 1,
    awayScore: 0,
    homePenaltyScore: 3,
    awayPenaltyScore: 4,
  }

  it('permite editar la ida si el global sigue empatado', () => {
    expect(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(1, 0, secondLeg)).not.toThrow()
  })

  it('rechaza editar la ida si los penaltis dejarían de ser necesarios', () => {
    expect(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(2, 0, secondLeg)).toThrow(/invalidaría los penaltis/i)
  })

  it('rechaza dejar incompleta la ida mientras la vuelta conserve penaltis', () => {
    expect(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(null, null, secondLeg)).toThrow(/penaltis registrados/i)
  })

  it('permite editar la ida cuando la vuelta no tiene penaltis', () => {
    expect(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(2, 0, { ...secondLeg, homePenaltyScore: null, awayPenaltyScore: null })).not.toThrow()
  })
})
