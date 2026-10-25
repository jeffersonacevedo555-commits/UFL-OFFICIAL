import assert from 'node:assert/strict'
import {
  assertPenaltyDecisionStillValidAfterFirstLegEdit,
  generateCupOpeningRound,
  generateNextCupRound,
  generateSupercopaEuropaFinal,
  generateSupercopaLigaFinal,
  generateSupercopaLigaSemifinals,
  resolveSupercopaLigaEntrants,
  resolveTwoLegTie,
} from '../src/lib/tournament.ts'

let checks = 0
function check(name, fn) {
  fn()
  checks += 1
  process.stdout.write(`✓ ${name}\n`)
}

function asMatches(fixtures, startId = 1) {
  return fixtures.map((fixture, index) => ({
    ...fixture,
    id: startId + index,
    seasonId: 1,
    homePenaltyScore: null,
    awayPenaltyScore: null,
  }))
}

check('Copa: genera 16 partidos iniciales con 24 equipos únicos', () => {
  const ids = Array.from({ length: 24 }, (_, index) => index + 1)
  const opening = generateCupOpeningRound(ids)
  assert.equal(opening.length, 16)
  assert.equal(new Set(opening.flatMap((match) => [match.homeId, match.awayId])).size, 16)
})

check('Copa: progresa desde octavos hasta la final', () => {
  const ids = Array.from({ length: 24 }, (_, index) => index + 1)
  let matches = asMatches(generateCupOpeningRound(ids))
  let nextId = matches.length + 1
  for (const expectedRound of ['Cuartos de final', 'Semifinal', 'Final']) {
    matches = matches.map((match) => ({
      ...match,
      homeScore: match.round.endsWith('· Ida') ? 1 : 0,
      awayScore: 0,
    }))
    const next = generateNextCupRound(matches)
    assert.equal(next.every((match) => match.round.startsWith(expectedRound)), true)
    assert.equal(next.length, expectedRound === 'Cuartos de final' ? 8 : expectedRound === 'Semifinal' ? 4 : 2)
    matches = [...matches, ...asMatches(next, nextId)]
    nextId += next.length
  }
  assert.throws(() => generateNextCupRound(matches), /finalizada|ya existe/i)
})

check('Copa: conserva el cuadro original al generar cuartos de final', () => {
  const ids = Array.from({ length: 24 }, (_, index) => index + 1)
  const opening = asMatches(generateCupOpeningRound(ids)).map((match) => ({
    ...match,
    homeScore: match.round.endsWith('· Ida') ? 1 : 0,
    awayScore: 0,
  }))
  const quarters = generateNextCupRound(opening)
  const firstLegs = quarters.filter((match) => match.round === 'Cuartos de final · Ida')
  // Ganadores de 1–16 y 8–9 comparten cuarto del cuadro; no se cruzan 1–16 con 2–15.
  assert.deepEqual(firstLegs.map((match) => [match.homeId, match.awayId]), [
    [1, 8], [4, 5], [2, 7], [3, 6],
  ])
})

check('Eliminatoria: resuelve por global y por penaltis', () => {
  assert.equal(resolveTwoLegTie(
    { homeId: 1, awayId: 2, homeScore: 2, awayScore: 0 },
    { homeId: 2, awayId: 1, homeScore: 1, awayScore: 1 },
  ).winnerId, 1)
  assert.equal(resolveTwoLegTie(
    { homeId: 1, awayId: 2, homeScore: 1, awayScore: 0 },
    { homeId: 2, awayId: 1, homeScore: 1, awayScore: 0, homePenaltyScore: 4, awayPenaltyScore: 5 },
  ).winnerId, 1)
  assert.throws(() => resolveTwoLegTie(
    { homeId: 1, awayId: 2, homeScore: 1, awayScore: 0 },
    { homeId: 2, awayId: 1, homeScore: 1, awayScore: 0 },
  ), /penaltis/i)
})

check('Protección: no avanza una ronda si la vuelta no invierte los equipos', () => {
  const ids = Array.from({ length: 24 }, (_, index) => index + 1)
  const opening = asMatches(generateCupOpeningRound(ids)).map((match) => ({
    ...match,
    homeScore: 1,
    awayScore: 0,
  }))
  const returnLeg = opening.find((match) => match.round === 'Octavos de final · Vuelta')
  assert.ok(returnLeg)
  returnLeg.awayId = returnLeg.homeId
  assert.throws(() => generateNextCupRound(opening), /ida y vuelta|cruce/i)
})

check('Protección: no avanza una ronda con resultados incompletos', () => {
  const ids = Array.from({ length: 24 }, (_, index) => index + 1)
  const opening = asMatches(generateCupOpeningRound(ids)).map((match) => ({
    ...match,
    homeScore: 1,
    awayScore: 0,
  }))
  opening[0].awayScore = null
  assert.throws(() => generateNextCupRound(opening), /resultados|marcadores/i)
})

check('Protección: rechaza equipos duplicados en una ronda de Copa', () => {
  const ids = Array.from({ length: 24 }, (_, index) => index + 1)
  const opening = asMatches(generateCupOpeningRound(ids)).map((match) => ({
    ...match,
    homeScore: 1,
    awayScore: 0,
  }))
  const firstLegs = opening.filter((match) => match.round === 'Octavos de final · Ida')
  firstLegs[1].homeId = firstLegs[0].homeId
  assert.throws(() => generateNextCupRound(opening), /duplicados/i)
})

check('Protección: rechaza penaltis si el global ya tiene ganador', () => {
  assert.throws(() => resolveTwoLegTie(
    { homeId: 1, awayId: 2, homeScore: 2, awayScore: 0 },
    { homeId: 2, awayId: 1, homeScore: 0, awayScore: 0, homePenaltyScore: 4, awayPenaltyScore: 3 },
  ), /global no está empatado/i)
})

check('Supercopa de Liga: sustituye plazas repetidas sin duplicar equipos', () => {
  const entrants = resolveSupercopaLigaEntrants({
    leagueChampion: [1, 2, 3, 4],
    cupRunnerUp: [1, 2, 3, 4],
    leagueRunnerUp: [2, 3, 4],
    cupChampion: [3, 4, 1, 2],
  })
  assert.equal(new Set(Object.values(entrants)).size, 4)
  assert.equal(generateSupercopaLigaSemifinals({
    leagueChampion: [1, 2, 3, 4], cupRunnerUp: [1, 2, 3, 4],
    leagueRunnerUp: [2, 3, 4], cupChampion: [3, 4, 1, 2],
  }).length, 4)
})

check('Supercopas: crea finales de ida y vuelta con localía invertida', () => {
  for (const fixtures of [generateSupercopaLigaFinal(1, 2), generateSupercopaEuropaFinal(3, 4)]) {
    assert.equal(fixtures.length, 2)
    assert.deepEqual([fixtures[0].homeId, fixtures[0].awayId], [fixtures[1].awayId, fixtures[1].homeId])
  }
})

check('Integridad: editar la ida no puede invalidar penaltis ya registrados', () => {
  const secondLeg = { homeScore: 1, awayScore: 0, homePenaltyScore: 3, awayPenaltyScore: 4 }
  assert.doesNotThrow(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(1, 0, secondLeg))
  assert.throws(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(2, 0, secondLeg), /invalidaría los penaltis/i)
  assert.throws(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(null, null, secondLeg), /penaltis registrados/i)
  assert.doesNotThrow(() => assertPenaltyDecisionStillValidAfterFirstLegEdit(2, 0, { ...secondLeg, homePenaltyScore: null, awayPenaltyScore: null }))
})

process.stdout.write(`\n${checks} comprobaciones manuales completadas correctamente.\n`)
