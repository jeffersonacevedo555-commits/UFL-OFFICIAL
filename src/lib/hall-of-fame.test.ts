import { describe, expect, it } from 'vitest'
import { goldenBoot, leaguePodium, mergeCalculatedAwards, twoLegChampion, type LeagueStanding, type SeasonMatch } from './hall-of-fame'

describe('Salón de la Fama: cálculos seguros', () => {
  it('no asigna podio si la liga está incompleta', () => {
    const standings = Array.from({ length: 24 }, (_, i): LeagueStanding => ({ teamId: i + 1, points: 70 - i, goalDifference: 20 - i, goalsFor: 50 - i, played: 22 }))
    expect(leaguePodium(standings)).toBeNull()
  })
  it('calcula campeón y subcampeón con clasificación completa y desempate disponible', () => {
    const standings = Array.from({ length: 24 }, (_, i): LeagueStanding => ({ teamId: i + 1, points: 72 - i, goalDifference: 30 - i, goalsFor: 60 - i, played: 23 }))
    expect(leaguePodium(standings)).toEqual({ championId: 1, runnerUpId: 2 })
  })
  it('rechaza clasificaciones con equipos duplicados o estadísticas inválidas', () => {
    const standings = Array.from({ length: 24 }, (_, i): LeagueStanding => ({ teamId: i + 1, points: 72 - i, goalDifference: 30 - i, goalsFor: 60 - i, played: 23 }))
    standings[23]!.teamId = standings[0]!.teamId
    expect(leaguePodium(standings)).toBeNull()
    standings[23]!.teamId = 24
    standings[0]!.points = -1
    expect(leaguePodium(standings)).toBeNull()
  })
  it('ignora estadísticas de goles inválidas', () => {
    expect(goldenBoot([
      { playerId: 0, playerName: 'Inválido', goals: 99 },
      { playerId: 2, playerName: 'Sin nombre', goals: 99 },
      { playerId: 3, playerName: 'Decimal', goals: 2.5 },
      { playerId: 4, playerName: 'Correcto', goals: 4 },
    ])).toEqual([{ playerId: 4, playerName: 'Correcto', goals: 4 }])
  })
  it('no inventa campeón de una final sin resultados', () => {
    const matches: SeasonMatch[] = [
      { competition: 'copa', round: 'Final · Ida', homeId: 1, awayId: 2, homeScore: null, awayScore: null },
      { competition: 'copa', round: 'Final · Vuelta', homeId: 2, awayId: 1, homeScore: 0, awayScore: 0 },
    ]
    expect(twoLegChampion(matches, 'copa')).toBeNull()
  })
  it('resuelve una final a ida y vuelta por el marcador global', () => {
    const matches: SeasonMatch[] = [
      { competition: 'copa', round: 'Final · Ida', homeId: 1, awayId: 2, homeScore: 2, awayScore: 0 },
      { competition: 'copa', round: 'Final · Vuelta', homeId: 2, awayId: 1, homeScore: 1, awayScore: 1 },
    ]
    expect(twoLegChampion(matches, 'copa')).toBe(1)
  })
  it('comparte la Bota de Oro en empate y suma estadísticas repetidas por jugador', () => {
    expect(goldenBoot([
      { playerId: 1, playerName: 'Ana', goals: 3 },
      { playerId: 1, playerName: 'Ana', goals: 2 },
      { playerId: 2, playerName: 'Beto', goals: 5 },
      { playerId: 3, playerName: 'Cris', goals: 1 },
    ])).toEqual([{ playerId: 1, playerName: 'Ana', goals: 5 }, { playerId: 2, playerName: 'Beto', goals: 5 }])
  })
})


describe('Salón de la Fama: conservación del historial', () => {
  const automaticKeys = ['leagueChampion', 'leagueRunnerUp', 'goldenBoot']

  it('conserva premios históricos si el cálculo actual no puede resolverlos', () => {
    expect(mergeCalculatedAwards(
      { leagueChampion: 'Equipo A', leagueRunnerUp: 'Equipo B', goldenBoot: [{ playerName: 'Ana', goals: 20 }], note: 'manual' },
      { leagueChampion: 'Equipo C' },
      automaticKeys,
    )).toEqual({ leagueChampion: 'Equipo C', leagueRunnerUp: 'Equipo B', goldenBoot: [{ playerName: 'Ana', goals: 20 }], note: 'manual' })
  })

  it('permite actualizar un premio calculado sin tocar los campos manuales', () => {
    expect(mergeCalculatedAwards(
      { leagueChampion: 'Equipo A', ballonDor: 'Ana', custom: true },
      { leagueChampion: 'Equipo B', goldenBoot: [{ playerName: 'Beto', goals: 10 }] },
      automaticKeys,
    )).toEqual({ leagueChampion: 'Equipo B', ballonDor: 'Ana', custom: true, goldenBoot: [{ playerName: 'Beto', goals: 10 }] })
  })
})
