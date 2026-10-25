import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import { db } from '../../db/index.js'
import { seasons, teams, matches, players, matchStats, hallOfFame, marketProposals, playerSeasonRosters, marketTransferHistory, historicalFinals, historicalFinalAudits, adminAuditEvents, news } from '../../db/schema.js'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { assertPenaltyDecisionStillValidAfterFirstLegEdit, generateCupOpeningRound, generateNextCupRound, generateSupercopaEuropaFinal, generateSupercopaLigaFinal, generateSupercopaLigaSemifinals, hasUnresolvedStandingsTie, resolveTwoLegTie, standings, supercopaLigaCandidates } from '../../src/lib/tournament.js'
import { goldenBoot, leaguePodium, mergeCalculatedAwards, twoLegChampion } from '../../src/lib/hall-of-fame.js'
import { z } from 'zod'
import type { Config } from '@netlify/functions'
class TournamentError extends Error {}
const competitions = z.enum(['liga', 'champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa'])
// Las imágenes de las noticias comparten la tienda «media» con escudos y fotos.
const mediaStore = getStore('media')
export default async (req: Request) => {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    if (req.method === 'GET') {
      const readUser = await getUser()
      const auditRows = readUser?.roles?.includes('admin')
        ? await db.select().from(historicalFinalAudits).orderBy(desc(historicalFinalAudits.createdAt)).limit(500)
        : []
      const adminAuditRows = readUser?.roles?.includes('admin')
        ? await db.select().from(adminAuditEvents).orderBy(desc(adminAuditEvents.createdAt)).limit(1000)
        : []
      const [allSeasons, allTeams, allMatches, allPlayers, allStats, hallOfFameRecords, allMarketProposals, allSeasonRosters, allTransfers, allHistoricalFinals, allNews] = await Promise.all([
        db.select().from(seasons).orderBy(seasons.id),
        db.select().from(teams).orderBy(teams.id),
        db.select().from(matches).orderBy(matches.id),
        db.select().from(players).orderBy(players.id),
        db.select().from(matchStats),
        db.select().from(hallOfFame).orderBy(hallOfFame.seasonId),
        db.select().from(marketProposals).orderBy(desc(marketProposals.createdAt)),
        db.select().from(playerSeasonRosters).orderBy(playerSeasonRosters.seasonId, playerSeasonRosters.playerId),
        db.select().from(marketTransferHistory).orderBy(desc(marketTransferHistory.transferredAt)),
        db.select().from(historicalFinals).orderBy(desc(historicalFinals.seasonId), historicalFinals.competition),
        db.select().from(news).orderBy(desc(news.createdAt), desc(news.id)),
      ])
      return Response.json(
        {
          seasons: allSeasons,
          activeSeasonId: allSeasons.find((season) => season.isCurrent)?.id ?? allSeasons[0]?.id ?? null,
          teams: allTeams,
          matches: allMatches,
          players: allPlayers,
          stats: allStats,
          hallOfFame: hallOfFameRecords,
          marketProposals: allMarketProposals,
          playerSeasonRosters: allSeasonRosters,
          marketTransferHistory: allTransfers,
          historicalFinals: allHistoricalFinals,
          historicalFinalAudits: auditRows,
          adminAuditEvents: adminAuditRows,
          news: allNews,
        },
        { headers },
      )
    }
    if (req.method !== 'POST') return new Response(null, { status: 405 })
    if (req.headers.get('origin') !== new URL(req.url).origin)
      return Response.json(
        { error: 'Origen no permitido.' },
        { status: 403, headers },
      )
    const user = await getUser()
    if (!user?.roles?.includes('admin'))
      return Response.json(
        { error: 'Necesitas una cuenta con rol admin.' },
        { status: 403, headers },
      )
    const body = await req.json()
    if (body.action === 'createMarketProposal') {
      const data = z.object({
        seasonId: z.number().int().positive(),
        playerId: z.number().int().positive(),
        toTeamId: z.number().int().positive(),
        note: z.string().trim().max(240).default(''),
      }).parse(body)
      const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.id, data.seasonId)).limit(1)
      if (!season) throw new TournamentError('La temporada seleccionada no existe.')
      const [player] = await db.select().from(players).where(eq(players.id, data.playerId)).limit(1)
      if (!player) throw new TournamentError('El jugador seleccionado no existe.')
      const [seasonRoster] = await db.select().from(playerSeasonRosters).where(and(eq(playerSeasonRosters.seasonId, data.seasonId), eq(playerSeasonRosters.playerId, data.playerId))).limit(1)
      if (!seasonRoster) throw new TournamentError('El jugador no tiene plantilla registrada en esa temporada.')
      const fromTeamId = seasonRoster.teamId
      const [targetTeam] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, data.toTeamId)).limit(1)
      if (!targetTeam) throw new TournamentError('El equipo de destino no existe.')
      if (fromTeamId === data.toTeamId) throw new TournamentError('El jugador ya pertenece a ese equipo.')
      const [existingPending] = await db.select({ id: marketProposals.id }).from(marketProposals).where(and(
        eq(marketProposals.seasonId, data.seasonId),
        eq(marketProposals.playerId, data.playerId),
        eq(marketProposals.toTeamId, data.toTeamId),
        eq(marketProposals.status, 'pending'),
      )).limit(1)
      if (existingPending) throw new TournamentError('Ya existe una propuesta pendiente para ese jugador y equipo.')
      await db.transaction(async (tx) => {
        const [createdProposal] = await tx.insert(marketProposals).values({
          seasonId: data.seasonId,
          playerId: data.playerId,
          fromTeamId,
          toTeamId: data.toTeamId,
          note: data.note,
          status: 'pending',
          updatedAt: new Date(),
        }).returning()
        await tx.insert(adminAuditEvents).values({
          entityType: 'market_proposal', entityId: createdProposal.id, seasonId: data.seasonId,
          action: 'created', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null,
          beforeSnapshot: null, afterSnapshot: createdProposal as unknown as Record<string, unknown>,
        })
      })
      return Response.json({ ok: true }, { headers })
    }
    if (body.action === 'withdrawMarketProposal') {
      const data = z.object({ id: z.number().int().positive() }).parse(body)
      const [proposal] = await db.select({ id: marketProposals.id, status: marketProposals.status }).from(marketProposals).where(eq(marketProposals.id, data.id)).limit(1)
      if (!proposal) throw new TournamentError('La propuesta de mercado no existe.')
      if (proposal.status !== 'pending') throw new TournamentError('Solo se pueden retirar propuestas pendientes.')
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(marketProposals).where(eq(marketProposals.id, data.id)).limit(1)
        await tx.update(marketProposals).set({ status: 'withdrawn', updatedAt: new Date() }).where(eq(marketProposals.id, data.id))
        const [after] = await tx.select().from(marketProposals).where(eq(marketProposals.id, data.id)).limit(1)
        await tx.insert(adminAuditEvents).values({ entityType: 'market_proposal', entityId: data.id, seasonId: before.seasonId, action: 'withdrawn', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: before as unknown as Record<string, unknown>, afterSnapshot: after as unknown as Record<string, unknown> })
      })
      return Response.json({ ok: true }, { headers })
    }
    if (body.action === 'decideMarketProposal') {
      const data = z.object({ id: z.number().int().positive(), decision: z.enum(['accept', 'reject']) }).parse(body)
      await db.transaction(async (tx) => {
        const [proposal] = await tx.select().from(marketProposals).where(eq(marketProposals.id, data.id)).for('update').limit(1)
        if (!proposal) throw new TournamentError('La propuesta de mercado no existe.')
        if (proposal.status !== 'pending') throw new TournamentError('Esta propuesta ya fue resuelta o retirada.')
        if (data.decision === 'reject') {
          await tx.update(marketProposals).set({ status: 'rejected', updatedAt: new Date() }).where(eq(marketProposals.id, proposal.id))
          const [after] = await tx.select().from(marketProposals).where(eq(marketProposals.id, proposal.id)).limit(1)
          await tx.insert(adminAuditEvents).values({ entityType: 'market_proposal', entityId: proposal.id, seasonId: proposal.seasonId, action: 'rejected', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: proposal as unknown as Record<string, unknown>, afterSnapshot: after as unknown as Record<string, unknown> })
          return
        }
        const [roster] = await tx.select().from(playerSeasonRosters).where(and(
          eq(playerSeasonRosters.seasonId, proposal.seasonId),
          eq(playerSeasonRosters.playerId, proposal.playerId),
        )).for('update').limit(1)
        if (!roster) throw new TournamentError('No existe una asignación de plantilla para este jugador y temporada.')
        if (roster.teamId !== proposal.fromTeamId) {
          throw new TournamentError('La plantilla cambió desde que se creó la propuesta. Esta propuesta ya no puede aceptarse.')
        }
        const [destination] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, proposal.toTeamId)).limit(1)
        if (!destination) throw new TournamentError('El equipo de destino ya no existe.')
        await tx.update(playerSeasonRosters).set({ teamId: proposal.toTeamId }).where(eq(playerSeasonRosters.id, roster.id))
        await tx.insert(marketTransferHistory).values({
          proposalId: proposal.id,
          seasonId: proposal.seasonId,
          playerId: proposal.playerId,
          fromTeamId: proposal.fromTeamId,
          toTeamId: proposal.toTeamId,
          note: proposal.note,
          transferredAt: new Date(),
        })
        await tx.update(marketProposals).set({ status: 'accepted', updatedAt: new Date() }).where(eq(marketProposals.id, proposal.id))
        const [acceptedProposal] = await tx.select().from(marketProposals).where(eq(marketProposals.id, proposal.id)).limit(1)
        const [transfer] = await tx.select().from(marketTransferHistory).where(eq(marketTransferHistory.proposalId, proposal.id)).limit(1)
        await tx.insert(adminAuditEvents).values([
          { entityType: 'market_proposal', entityId: proposal.id, seasonId: proposal.seasonId, action: 'accepted', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: proposal as unknown as Record<string, unknown>, afterSnapshot: acceptedProposal as unknown as Record<string, unknown> },
          { entityType: 'roster', entityId: roster.id, seasonId: proposal.seasonId, action: 'updated', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: roster as unknown as Record<string, unknown>, afterSnapshot: { ...roster, teamId: proposal.toTeamId } as unknown as Record<string, unknown> },
          ...(transfer ? [{ entityType: 'transfer' as const, entityId: transfer.id, seasonId: proposal.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: transfer as unknown as Record<string, unknown> }] : []),
        ])
        // Otras propuestas pendientes del mismo jugador quedan obsoletas tras el traspaso.
        const obsoleteProposals = await tx.select().from(marketProposals).where(and(
          eq(marketProposals.seasonId, proposal.seasonId),
          eq(marketProposals.playerId, proposal.playerId),
          eq(marketProposals.status, 'pending'),
          sql`${marketProposals.id} <> ${proposal.id}`,
        ))
        await tx.update(marketProposals).set({ status: 'rejected', updatedAt: new Date() }).where(and(
          eq(marketProposals.seasonId, proposal.seasonId),
          eq(marketProposals.playerId, proposal.playerId),
          eq(marketProposals.status, 'pending'),
          sql`${marketProposals.id} <> ${proposal.id}`,
        ))
        for (const obsolete of obsoleteProposals) {
          const [afterObsolete] = await tx.select().from(marketProposals).where(eq(marketProposals.id, obsolete.id)).limit(1)
          await tx.insert(adminAuditEvents).values({
            entityType: 'market_proposal', entityId: obsolete.id, seasonId: proposal.seasonId,
            action: 'rejected', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null,
            beforeSnapshot: obsolete as unknown as Record<string, unknown>, afterSnapshot: afterObsolete as unknown as Record<string, unknown>,
          })
        }
      })
      return Response.json({ ok: true, decision: data.decision }, { headers })
    }
    if (body.action === 'calculateHallOfFame') {
      const data = z.object({ seasonId: z.number().int().positive() }).parse(body)
      const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.id, data.seasonId)).limit(1)
      if (!season) throw new TournamentError('La temporada seleccionada no existe.')
      const [allTeams, seasonMatches, allPlayers, allStats, existing] = await Promise.all([
        db.select().from(teams).orderBy(teams.id),
        db.select().from(matches).where(eq(matches.seasonId, data.seasonId)).orderBy(matches.id),
        db.select().from(players).orderBy(players.id),
        db.select().from(matchStats),
        db.select().from(hallOfFame).where(eq(hallOfFame.seasonId, data.seasonId)).limit(1),
      ])
      const teamNames = new Map(allTeams.map((team) => [team.id, team.name]))
      const seasonStandings = standings(allTeams, seasonMatches.map((match) => ({ ...match, scheduledAt: match.scheduledAt?.toISOString() ?? null })))
      const league = leaguePodium(seasonStandings.map((row) => ({ teamId: row.id, points: row.points, goalDifference: row.gf - row.ga, goalsFor: row.gf, played: row.played })))
      const typedMatches = seasonMatches.map((match) => ({ ...match, scheduledAt: match.scheduledAt?.toISOString() ?? null }))
      const awards: Record<string, unknown> = {}
      if (league) {
        awards.leagueChampion = teamNames.get(league.championId) ?? `Equipo #${league.championId}`
        awards.leagueRunnerUp = teamNames.get(league.runnerUpId) ?? `Equipo #${league.runnerUpId}`
      }
      const competitionAwards: Array<[string, string]> = [
        ['copa', 'cupChampion'], ['champions', 'championsChampion'], ['europa', 'europaChampion'],
        ['supercopa_liga', 'leagueSuperCupChampion'], ['supercopa_europa', 'europeSuperCupChampion'],
      ]
      for (const [competition, awardKey] of competitionAwards) {
        const winnerId = twoLegChampion(typedMatches, competition)
        if (winnerId !== null) awards[awardKey] = teamNames.get(winnerId) ?? `Equipo #${winnerId}`
      }
      const seasonMatchIds = new Set(seasonMatches.filter((match) => match.homeScore !== null && match.awayScore !== null).map((match) => match.id))
      const playerNames = new Map(allPlayers.map((player) => [player.id, player.name]))
      const topScorers = goldenBoot(allStats.filter((stat) => seasonMatchIds.has(stat.matchId)).map((stat) => ({ playerId: stat.playerId, playerName: playerNames.get(stat.playerId) ?? '', goals: stat.goals })))
      if (topScorers.length) awards.goldenBoot = topScorers.map(({ playerName, goals }) => ({ playerName, goals }))
      const previous = existing[0]
      const automaticAwardKeys = ['leagueChampion', 'leagueRunnerUp', 'cupChampion', 'leagueSuperCupChampion', 'europeSuperCupChampion', 'championsChampion', 'europaChampion', 'goldenBoot']
      const finalAwards = mergeCalculatedAwards(previous?.awards ?? {}, awards, automaticAwardKeys)
      const skipped = automaticAwardKeys.filter((key) => !Object.prototype.hasOwnProperty.call(awards, key))
      await db.insert(hallOfFame).values({
        seasonId: data.seasonId,
        awards: finalAwards,
        ballonDorPlayerId: previous?.ballonDorPlayerId ?? null,
        startingXi: previous?.startingXi ?? [],
        substitutes: previous?.substitutes ?? [],
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: hallOfFame.seasonId,
        set: { awards: finalAwards, updatedAt: new Date() },
      })
      return Response.json({ ok: true, calculated: Object.keys(awards), skipped }, { headers })
    }
    if (body.action === 'saveHallOfFame') {
      const data = z.object({
        seasonId: z.number().int().positive(),
        awards: z.record(z.string(), z.unknown()).default({}),
        ballonDorPlayerId: z.number().int().positive().nullable().optional(),
        startingXi: z.array(z.number().int().positive()).length(11),
        substitutes: z.array(z.number().int().positive()).length(7),
      }).parse(body)
      if (new Set([...data.startingXi, ...data.substitutes]).size !== 18) {
        throw new TournamentError('El XI ideal debe tener 11 titulares y 7 suplentes distintos.')
      }
      const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.id, data.seasonId)).limit(1)
      if (!season) throw new TournamentError('La temporada seleccionada no existe.')
      const requestedPlayerIds = [...data.startingXi, ...data.substitutes, ...(data.ballonDorPlayerId ? [data.ballonDorPlayerId] : [])]
      const knownPlayers = requestedPlayerIds.length ? await db.select({ id: players.id }).from(players).where(inArray(players.id, requestedPlayerIds)) : []
      if (new Set(knownPlayers.map((player) => player.id)).size !== new Set(requestedPlayerIds).size) {
        throw new TournamentError('Hay jugadores seleccionados que no existen.')
      }
      await db.insert(hallOfFame).values({
        seasonId: data.seasonId,
        awards: data.awards,
        ballonDorPlayerId: data.ballonDorPlayerId ?? null,
        startingXi: data.startingXi,
        substitutes: data.substitutes,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: hallOfFame.seasonId,
        set: { awards: data.awards, ballonDorPlayerId: data.ballonDorPlayerId ?? null, startingXi: data.startingXi, substitutes: data.substitutes, updatedAt: new Date() },
      })
      return Response.json({ ok: true }, { headers })
    }
    if (body.action === 'saveHistoricalFinal') {
      const data = z.object({
        id: z.number().int().positive().optional(),
        seasonId: z.number().int().positive(),
        competition: competitions,
        finalFormat: z.enum(['league', 'single', 'two_leg']),
        matchId: z.number().int().positive().nullable().default(null),
        leg1MatchId: z.number().int().positive().nullable().default(null),
        leg2MatchId: z.number().int().positive().nullable().default(null),
        championName: z.string().trim().min(1).max(100),
        runnerUpName: z.string().trim().min(1).max(100),
        leg1ChampionScore: z.number().int().min(0).max(99).nullable(),
        leg1RunnerUpScore: z.number().int().min(0).max(99).nullable(),
        leg2ChampionScore: z.number().int().min(0).max(99).nullable(),
        leg2RunnerUpScore: z.number().int().min(0).max(99).nullable(),
        penaltyChampionScore: z.number().int().min(0).max(99).nullable(),
        penaltyRunnerUpScore: z.number().int().min(0).max(99).nullable(),
        note: z.string().trim().max(500).default(''),
      }).parse(body)
      if ((data.finalFormat === 'league' && (data.matchId !== null || data.leg1MatchId !== null || data.leg2MatchId !== null)) || (data.finalFormat === 'single' && (data.leg1MatchId !== null || data.leg2MatchId !== null)) || (data.finalFormat === 'two_leg' && data.matchId !== null)) {
        throw new TournamentError('Los partidos vinculados deben corresponder al formato de la competición.')
      }
      const linkedIds = [data.matchId, data.leg1MatchId, data.leg2MatchId].filter((id): id is number => id !== null)
      if (new Set(linkedIds).size !== linkedIds.length) throw new TournamentError('No puedes vincular el mismo partido más de una vez.')
      const dataWithScores = { ...data }
      const resolveLinkedMatch = async (matchId: number | null, slot: 'single' | 'leg1' | 'leg2') => {
        if (matchId === null) return
        const [linkedMatch] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1)
        if (!linkedMatch) throw new TournamentError(`El partido vinculado #${matchId} no existe.`)
        if (linkedMatch.seasonId !== data.seasonId || linkedMatch.competition !== data.competition) throw new TournamentError('El partido vinculado debe pertenecer a la misma temporada y competición.')
        if (!/^final(?:\s|$|[·-])/i.test(linkedMatch.round)) throw new TournamentError('Solo puedes vincular partidos cuya ronda esté registrada como Final.')
        if (linkedMatch.homeScore === null || linkedMatch.awayScore === null) throw new TournamentError('Solo puedes vincular partidos con marcador final guardado.')
        const involved = await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, [linkedMatch.homeId, linkedMatch.awayId]))
        const homeName = involved.find((team) => team.id === linkedMatch.homeId)?.name?.toLocaleLowerCase()
        const awayName = involved.find((team) => team.id === linkedMatch.awayId)?.name?.toLocaleLowerCase()
        const champion = data.championName.toLocaleLowerCase()
        const runnerUp = data.runnerUpName.toLocaleLowerCase()
        let championScore: number, runnerUpScore: number
        if (homeName === champion && awayName === runnerUp) { championScore = linkedMatch.homeScore; runnerUpScore = linkedMatch.awayScore }
        else if (awayName === champion && homeName === runnerUp) { championScore = linkedMatch.awayScore; runnerUpScore = linkedMatch.homeScore }
        else throw new TournamentError('Los clubes del partido vinculado deben coincidir con el campeón y subcampeón registrados. Si los nombres históricos cambiaron, usa el registro manual.')
        if (slot === 'single' || slot === 'leg1') { dataWithScores.leg1ChampionScore = championScore; dataWithScores.leg1RunnerUpScore = runnerUpScore }
        else { dataWithScores.leg2ChampionScore = championScore; dataWithScores.leg2RunnerUpScore = runnerUpScore }
      }
      await resolveLinkedMatch(data.matchId, 'single')
      await resolveLinkedMatch(data.leg1MatchId, 'leg1')
      await resolveLinkedMatch(data.leg2MatchId, 'leg2')
      if (data.championName.toLocaleLowerCase() === data.runnerUpName.toLocaleLowerCase()) {
        throw new TournamentError('El campeón y el subcampeón deben ser clubes distintos.')
      }
      const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.id, data.seasonId)).limit(1)
      if (!season) throw new TournamentError('La temporada seleccionada no existe.')
      if ((data.competition === 'liga') !== (data.finalFormat === 'league')) {
        throw new TournamentError('La Liga se registra como campeonato de temporada; las demás competiciones requieren una final.')
      }
      const scores = [dataWithScores.leg1ChampionScore, dataWithScores.leg1RunnerUpScore, dataWithScores.leg2ChampionScore, dataWithScores.leg2RunnerUpScore]
      if (data.finalFormat === 'league') {
        if (scores.some((score) => score !== null) || data.penaltyChampionScore !== null || data.penaltyRunnerUpScore !== null) {
          throw new TournamentError('El campeonato de Liga no admite marcador de final.')
        }
      } else {
        if (dataWithScores.leg1ChampionScore === null || dataWithScores.leg1RunnerUpScore === null) {
          throw new TournamentError('Registra el marcador de la final para ambos clubes.')
        }
        if (data.finalFormat === 'single' && (dataWithScores.leg2ChampionScore !== null || dataWithScores.leg2RunnerUpScore !== null)) {
          throw new TournamentError('Una final a partido único no admite marcador de vuelta.')
        }
        if (data.finalFormat === 'two_leg' && (dataWithScores.leg2ChampionScore === null || dataWithScores.leg2RunnerUpScore === null)) {
          throw new TournamentError('Registra los marcadores de ida y vuelta.')
        }
        const championTotal = dataWithScores.leg1ChampionScore + (data.finalFormat === 'two_leg' ? dataWithScores.leg2ChampionScore! : 0)
        const runnerUpTotal = dataWithScores.leg1RunnerUpScore + (data.finalFormat === 'two_leg' ? dataWithScores.leg2RunnerUpScore! : 0)
        const tied = championTotal === runnerUpTotal
        if (tied) {
          if (data.penaltyChampionScore === null || data.penaltyRunnerUpScore === null || data.penaltyChampionScore <= data.penaltyRunnerUpScore) {
            throw new TournamentError('El global está empatado: registra una tanda de penaltis ganada por el campeón.')
          }
        } else {
          if (data.penaltyChampionScore !== null || data.penaltyRunnerUpScore !== null) throw new TournamentError('Solo registra penaltis si el marcador global está empatado.')
          if (championTotal < runnerUpTotal) throw new TournamentError('Los marcadores no corresponden al club indicado como campeón.')
        }
      }
      const values = {
        seasonId: data.seasonId,
        competition: data.competition,
        finalFormat: data.finalFormat,
        matchId: data.matchId,
        leg1MatchId: data.leg1MatchId,
        leg2MatchId: data.leg2MatchId,
        championName: data.championName,
        runnerUpName: data.runnerUpName,
        leg1ChampionScore: dataWithScores.leg1ChampionScore,
        leg1RunnerUpScore: dataWithScores.leg1RunnerUpScore,
        leg2ChampionScore: dataWithScores.leg2ChampionScore,
        leg2RunnerUpScore: dataWithScores.leg2RunnerUpScore,
        penaltyChampionScore: data.penaltyChampionScore,
        penaltyRunnerUpScore: data.penaltyRunnerUpScore,
        note: data.note,
        updatedAt: new Date(),
      }
      await db.transaction(async (tx) => {
        let beforeSnapshot: Record<string, unknown> | null = null
        let savedId = data.id ?? null
        if (data.id) {
          const [existing] = await tx.select().from(historicalFinals).where(eq(historicalFinals.id, data.id)).limit(1)
          if (!existing) throw new TournamentError('El registro histórico que intentas editar ya no existe.')
          beforeSnapshot = existing as unknown as Record<string, unknown>
          const duplicate = await tx.select({ id: historicalFinals.id }).from(historicalFinals).where(and(eq(historicalFinals.seasonId, data.seasonId), eq(historicalFinals.competition, data.competition))).limit(1)
          if (duplicate.length && duplicate[0].id !== data.id) throw new TournamentError('Ya existe un registro para esa competición y temporada.')
          await tx.update(historicalFinals).set(values).where(eq(historicalFinals.id, data.id))
        } else {
          const [created] = await tx.insert(historicalFinals).values(values).returning({ id: historicalFinals.id })
          savedId = created.id
        }
        const [afterSnapshot] = await tx.select().from(historicalFinals).where(eq(historicalFinals.id, savedId!)).limit(1)
        await tx.insert(historicalFinalAudits).values({
          finalId: savedId!,
          action: beforeSnapshot ? 'updated' : 'created',
          actorId: user.id ? String(user.id) : null,
          actorEmail: user.email ?? null,
          beforeSnapshot,
          afterSnapshot: afterSnapshot as unknown as Record<string, unknown>,
        })
      })
      return Response.json({ ok: true }, { headers })
    }
    if (body.action === 'deleteHistoricalFinal') {
      const data = z.object({ id: z.number().int().positive() }).parse(body)
      await db.transaction(async (tx) => {
        const [beforeSnapshot] = await tx.select().from(historicalFinals).where(eq(historicalFinals.id, data.id)).limit(1)
        if (!beforeSnapshot) throw new TournamentError('El registro histórico que intentas eliminar ya no existe.')
        await tx.insert(historicalFinalAudits).values({
          finalId: data.id,
          action: 'deleted',
          actorId: user.id ? String(user.id) : null,
          actorEmail: user.email ?? null,
          beforeSnapshot: beforeSnapshot as unknown as Record<string, unknown>,
          afterSnapshot: null,
        })
        await tx.delete(historicalFinals).where(eq(historicalFinals.id, data.id))
      })
      return Response.json({ ok: true }, { headers })
    }
    if (body.action === 'createSeason') {
      const data = z.object({ name: z.string().trim().min(2).max(60) }).parse(body)
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const previous = await tx.select().from(seasons).orderBy(desc(seasons.id)).limit(1)
        const previousSeasonId = previous[0]?.id
        await tx.update(seasons).set({ isCurrent: false })
        const [createdSeason] = await tx.insert(seasons).values({ name: data.name, isCurrent: true }).returning({ id: seasons.id })
        if (previousSeasonId) {
          const previousRoster = await tx.select({ playerId: playerSeasonRosters.playerId, teamId: playerSeasonRosters.teamId }).from(playerSeasonRosters).where(eq(playerSeasonRosters.seasonId, previousSeasonId))
          if (previousRoster.length) {
            const createdRosters = await tx.insert(playerSeasonRosters).values(previousRoster.map((row) => ({ seasonId: createdSeason.id, playerId: row.playerId, teamId: row.teamId }))).returning()
            await tx.insert(adminAuditEvents).values(createdRosters.map((roster) => ({ entityType: 'roster' as const, entityId: roster.id, seasonId: roster.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: roster as unknown as Record<string, unknown> })))
          } else {
            const roster = await tx.select({ id: players.id, teamId: players.teamId }).from(players)
            if (roster.length) {
              const createdRosters = await tx.insert(playerSeasonRosters).values(roster.map((row) => ({ seasonId: createdSeason.id, playerId: row.id, teamId: row.teamId }))).returning()
              await tx.insert(adminAuditEvents).values(createdRosters.map((assignment) => ({ entityType: 'roster' as const, entityId: assignment.id, seasonId: assignment.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: assignment as unknown as Record<string, unknown> })))
            }
          }
        } else {
          const roster = await tx.select({ id: players.id, teamId: players.teamId }).from(players)
          if (roster.length) {
            const createdRosters = await tx.insert(playerSeasonRosters).values(roster.map((row) => ({ seasonId: createdSeason.id, playerId: row.id, teamId: row.teamId }))).returning()
            await tx.insert(adminAuditEvents).values(createdRosters.map((assignment) => ({ entityType: 'roster' as const, entityId: assignment.id, seasonId: assignment.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: assignment as unknown as Record<string, unknown> })))
          }
        }
      })
    } else if (body.action === 'generateCup') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const seasonList = await tx.select().from(seasons).orderBy(desc(seasons.id))
        const currentSeason = seasonList.find((season) => season.isCurrent)
        if (!currentSeason) throw new TournamentError('Crea una temporada actual antes de generar la Copa.')
        const previousSeason = seasonList.find((season) => season.id < currentSeason.id)
        if (!previousSeason) throw new TournamentError('Necesitas una temporada anterior con la clasificación final de la Liga.')
        const allTeams = await tx.select().from(teams).orderBy(teams.id)
        if (allTeams.length !== 24) throw new TournamentError('La Copa requiere los 24 equipos registrados.')
        const previousMatches = await tx.select().from(matches).where(and(eq(matches.seasonId, previousSeason.id), eq(matches.competition, 'liga')))
        if (previousMatches.length !== 276 || previousMatches.some((match) => match.homeScore === null || match.awayScore === null)) {
          throw new TournamentError('La Liga de la temporada anterior debe tener sus 276 partidos finalizados antes de generar la Copa.')
        }
        const typedPreviousMatches = previousMatches.map((match) => ({
          ...match,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
        }))
        const finalTable = standings(allTeams, typedPreviousMatches)
        if (finalTable.some((team) => team.played !== 23)) {
          throw new TournamentError('La temporada anterior no tiene una clasificación completa de 23 partidos por equipo.')
        }
        if (hasUnresolvedStandingsTie(allTeams, typedPreviousMatches)) {
          throw new TournamentError('Hay un empate que necesita resolución manual antes de generar la Copa. La generación se ha detenido para no asignar puestos automáticamente.')
        }
        const existingCupMatches = await tx.select().from(matches).where(and(eq(matches.seasonId, currentSeason.id), eq(matches.competition, 'copa')))
        if (existingCupMatches.length) throw new TournamentError('La Copa de esta temporada ya tiene partidos. No se duplicará el cuadro.')
        const fixtures = generateCupOpeningRound(finalTable.map((team) => team.id))
        const createdMatches = await tx.insert(matches).values(fixtures.map((fixture) => ({ ...fixture, seasonId: currentSeason.id }))).returning()
        await tx.insert(adminAuditEvents).values(createdMatches.map((createdMatch) => ({ entityType: 'match' as const, entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })))
      })
    } else if (body.action === 'generateNextCupRound') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const [currentSeason] = await tx.select().from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        if (!currentSeason) throw new TournamentError('Crea una temporada actual antes de avanzar la Copa.')
        const cupMatches = await tx.select().from(matches).where(and(eq(matches.seasonId, currentSeason.id), eq(matches.competition, 'copa'))).orderBy(matches.id)
        const fixtures = generateNextCupRound(cupMatches.map((match) => ({
          ...match,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
        })))
        const createdMatches = await tx.insert(matches).values(fixtures.map((fixture) => ({ ...fixture, seasonId: currentSeason.id }))).returning()
        await tx.insert(adminAuditEvents).values(createdMatches.map((createdMatch) => ({ entityType: 'match' as const, entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })))
      })
    } else if (body.action === 'generateSupercopaLiga') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const [currentSeason] = await tx.select().from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        if (!currentSeason) throw new TournamentError('Crea una temporada actual antes de generar la Supercopa de Liga.')
        const seasonMatches = await tx.select().from(matches).where(eq(matches.seasonId, currentSeason.id)).orderBy(matches.id)
        if (seasonMatches.some((match) => match.competition === 'supercopa_liga')) throw new TournamentError('La Supercopa de Liga ya tiene partidos en esta temporada.')
        const allTeams = await tx.select().from(teams).orderBy(teams.id)
        if (allTeams.length !== 24) throw new TournamentError('La Supercopa necesita los 24 equipos registrados.')
        const leagueMatches = seasonMatches.filter((match) => match.competition === 'liga')
        if (leagueMatches.length !== 276 || leagueMatches.some((match) => match.homeScore === null || match.awayScore === null)) throw new TournamentError('Completa los 276 partidos de Liga antes de generar la Supercopa.')
        const typedLeagueMatches = leagueMatches.map((match) => ({ ...match, scheduledAt: match.scheduledAt?.toISOString() ?? null }))
        const table = standings(allTeams, typedLeagueMatches)
        if (table.some((team) => team.played !== 23)) throw new TournamentError('La clasificación de Liga está incompleta.')
        if (hasUnresolvedStandingsTie(allTeams, typedLeagueMatches)) throw new TournamentError('Hay un empate de Liga que necesita resolución manual antes de generar la Supercopa.')
        const cupMatches = seasonMatches.filter((match) => match.competition === 'copa')
        const finalFirst = cupMatches.find((match) => match.round === 'Final · Ida')
        const finalSecond = cupMatches.find((match) => match.round === 'Final · Vuelta')
        if (!finalFirst || !finalSecond) throw new TournamentError('La Copa debe tener una final a ida y vuelta antes de generar la Supercopa de Liga.')
        let cupDecision: ReturnType<typeof resolveTwoLegTie>
        try {
          cupDecision = resolveTwoLegTie(finalFirst, finalSecond)
        } catch (error) {
          throw new TournamentError(error instanceof Error ? error.message : 'No se pudo resolver la final de Copa.')
        }
        const cupRunnerUp = [finalFirst.homeId, finalFirst.awayId].find((id) => id !== cupDecision.winnerId)!
        const fixtures = generateSupercopaLigaSemifinals(
          supercopaLigaCandidates(table.map((team) => team.id), cupDecision.winnerId, cupRunnerUp),
        )
        const createdMatches = await tx.insert(matches).values(fixtures.map((fixture) => ({ ...fixture, seasonId: currentSeason.id }))).returning()
        await tx.insert(adminAuditEvents).values(createdMatches.map((createdMatch) => ({ entityType: 'match' as const, entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })))
      })
    } else if (body.action === 'generateSupercopaLigaFinal') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const [currentSeason] = await tx.select().from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        if (!currentSeason) throw new TournamentError('Crea una temporada actual antes de generar la final.')
        const cupMatches = await tx.select().from(matches).where(and(eq(matches.seasonId, currentSeason.id), eq(matches.competition, 'supercopa_liga'))).orderBy(matches.id)
        if (cupMatches.some((match) => match.round.startsWith('Final · '))) throw new TournamentError('La final de Supercopa de Liga ya existe.')
        const winners: number[] = []
        for (const semifinal of ['Semifinal 1', 'Semifinal 2']) {
          const firstLeg = cupMatches.find((match) => match.round === `${semifinal} · Ida`)
          const secondLeg = cupMatches.find((match) => match.round === `${semifinal} · Vuelta`)
          if (!firstLeg || !secondLeg) throw new TournamentError('Deben existir las dos semifinales completas a ida y vuelta.')
          try {
            winners.push(resolveTwoLegTie(firstLeg, secondLeg).winnerId)
          } catch (error) {
            throw new TournamentError(error instanceof Error ? error.message : `No se pudo resolver ${semifinal}.`)
          }
        }
        const finalFixtures = generateSupercopaLigaFinal(winners[0]!, winners[1]!)
        const createdMatches = await tx.insert(matches).values(finalFixtures.map((fixture) => ({ ...fixture, seasonId: currentSeason.id }))).returning()
        await tx.insert(adminAuditEvents).values(createdMatches.map((createdMatch) => ({ entityType: 'match' as const, entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })))
      })
    } else if (body.action === 'generateSupercopaEuropa') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const [currentSeason] = await tx.select().from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        if (!currentSeason) throw new TournamentError('Crea una temporada actual antes de generar la Supercopa de Europa.')
        const seasonMatches = await tx.select().from(matches).where(eq(matches.seasonId, currentSeason.id)).orderBy(matches.id)
        if (seasonMatches.some((match) => match.competition === 'supercopa_europa')) throw new TournamentError('La Supercopa de Europa ya tiene partidos en esta temporada.')
        const getFinalWinner = (competition: string) => {
          const finals = seasonMatches.filter((match) => match.competition === competition)
          const firstLeg = finals.find((match) => match.round === 'Final · Ida')
          const secondLeg = finals.find((match) => match.round === 'Final · Vuelta')
          if (!firstLeg || !secondLeg) throw new TournamentError(`La competición ${competition} debe tener su final a ida y vuelta finalizada.`)
          try {
            return resolveTwoLegTie(firstLeg, secondLeg).winnerId
          } catch (error) {
            throw new TournamentError(error instanceof Error ? error.message : `No se pudo resolver la final de ${competition}.`)
          }
        }
        const championsWinner = getFinalWinner('champions')
        const europaWinner = getFinalWinner('europa')
        const fixtures = generateSupercopaEuropaFinal(championsWinner, europaWinner)
        const createdMatches = await tx.insert(matches).values(fixtures.map((fixture) => ({ ...fixture, seasonId: currentSeason.id }))).returning()
        await tx.insert(adminAuditEvents).values(createdMatches.map((createdMatch) => ({ entityType: 'match' as const, entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })))
      })
    } else if (body.action === 'createNews') {
      const data = z
        .object({
          title: z.string().trim().min(3).max(120),
          body: z.string().trim().min(10).max(5000),
        })
        .parse(body)
      const [createdNews] = await db.insert(news).values({ title: data.title, body: data.body }).returning()
      await db.insert(adminAuditEvents).values({ entityType: 'news', entityId: createdNews.id, action: 'created', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdNews as unknown as Record<string, unknown> })
    } else if (body.action === 'updateNews') {
      const data = z
        .object({
          id: z.number().int().positive(),
          title: z.string().trim().min(3).max(120),
          body: z.string().trim().min(10).max(5000),
        })
        .parse(body)
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(news).where(eq(news.id, data.id)).for('update').limit(1)
        if (!before) throw new TournamentError('La noticia que intentas editar ya no existe.')
        await tx.update(news).set({ title: data.title, body: data.body, updatedAt: new Date() }).where(eq(news.id, data.id))
        const [after] = await tx.select().from(news).where(eq(news.id, data.id)).limit(1)
        await tx.insert(adminAuditEvents).values({ entityType: 'news', entityId: data.id, action: 'updated', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: before as unknown as Record<string, unknown>, afterSnapshot: after as unknown as Record<string, unknown> })
      })
    } else if (body.action === 'deleteNews') {
      const data = z.object({ id: z.number().int().positive() }).parse(body)
      let removedImageKey: string | null = null
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(news).where(eq(news.id, data.id)).for('update').limit(1)
        if (!before) throw new TournamentError('La noticia que intentas eliminar ya no existe.')
        removedImageKey = before.imageKey
        await tx.delete(news).where(eq(news.id, data.id))
        await tx.insert(adminAuditEvents).values({ entityType: 'news', entityId: data.id, action: 'deleted', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: before as unknown as Record<string, unknown>, afterSnapshot: null })
      })
      if (removedImageKey) await mediaStore.delete(removedImageKey)
    } else if (body.action === 'team') {
      const data = z
        .object({
          name: z.string().trim().min(2).max(40),
          manager: z.string().trim().min(2).max(40),
        })
        .parse(body)
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const existing = await tx.select().from(teams)
        if (existing.length >= 24)
          throw new TournamentError('La liga ya tiene 24 equipos.')
        const [createdTeam] = await tx.insert(teams).values(data).returning()
        await tx.insert(adminAuditEvents).values({ entityType: 'team', entityId: createdTeam.id, action: 'created', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdTeam as unknown as Record<string, unknown> })
      })
    } else if (body.action === 'player') {
      const data = z
        .object({
          teamId: z.number().int().positive(),
          name: z.string().trim().min(2).max(60),
        })
        .parse(body)
      await db.transaction(async (tx) => {
        const [createdPlayer] = await tx.insert(players).values(data).returning()
        const [activeSeason] = await tx.select({ id: seasons.id }).from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        await tx.insert(adminAuditEvents).values({ entityType: 'player', entityId: createdPlayer.id, seasonId: activeSeason?.id ?? null, action: 'created', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdPlayer as unknown as Record<string, unknown> })
        if (activeSeason) {
          const [createdRoster] = await tx.insert(playerSeasonRosters).values({ seasonId: activeSeason.id, playerId: createdPlayer.id, teamId: createdPlayer.teamId }).returning()
          await tx.insert(adminAuditEvents).values({ entityType: 'roster', entityId: createdRoster.id, seasonId: activeSeason.id, action: 'created', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdRoster as unknown as Record<string, unknown> })
        }
      })
    } else if (body.action === 'editPlayer') {
      const data = z.object({
        id: z.number().int().positive(),
        teamId: z.number().int().positive(),
        name: z.string().trim().min(2).max(60),
      }).parse(body)
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(players).where(eq(players.id, data.id)).for('update').limit(1)
        if (!before) throw new TournamentError('El jugador que intentas editar no existe.')
        const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, data.teamId)).limit(1)
        if (!team) throw new TournamentError('El equipo seleccionado no existe.')
        await tx.update(players).set({ name: data.name, teamId: data.teamId }).where(eq(players.id, data.id))
        const [after] = await tx.select().from(players).where(eq(players.id, data.id)).limit(1)
        const [activeSeason] = await tx.select({ id: seasons.id }).from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        await tx.insert(adminAuditEvents).values({ entityType: 'player', entityId: data.id, seasonId: activeSeason?.id ?? null, action: 'updated', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: before as unknown as Record<string, unknown>, afterSnapshot: after as unknown as Record<string, unknown> })
      })
    } else if (body.action === 'updateSeasonRoster') {
      const data = z.object({
        seasonId: z.number().int().positive(),
        playerId: z.number().int().positive(),
        teamId: z.number().int().positive(),
      }).parse(body)
      await db.transaction(async (tx) => {
        const [season] = await tx.select({ id: seasons.id }).from(seasons).where(eq(seasons.id, data.seasonId)).limit(1)
        if (!season) throw new TournamentError('La temporada seleccionada no existe.')
        const [player] = await tx.select({ id: players.id }).from(players).where(eq(players.id, data.playerId)).limit(1)
        if (!player) throw new TournamentError('El jugador seleccionado no existe.')
        const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, data.teamId)).limit(1)
        if (!team) throw new TournamentError('El equipo seleccionado no existe.')
        const [before] = await tx.select().from(playerSeasonRosters).where(and(eq(playerSeasonRosters.seasonId, data.seasonId), eq(playerSeasonRosters.playerId, data.playerId))).for('update').limit(1)
        if (!before) throw new TournamentError('El jugador no tiene una asignación de plantilla en esa temporada.')
        if (before.teamId === data.teamId) throw new TournamentError('El jugador ya está asignado a ese equipo en esta temporada.')
        await tx.update(playerSeasonRosters).set({ teamId: data.teamId }).where(eq(playerSeasonRosters.id, before.id))
        const [after] = await tx.select().from(playerSeasonRosters).where(eq(playerSeasonRosters.id, before.id)).limit(1)
        await tx.insert(adminAuditEvents).values({ entityType: 'roster', entityId: before.id, seasonId: data.seasonId, action: 'updated', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: before as unknown as Record<string, unknown>, afterSnapshot: after as unknown as Record<string, unknown> })
      })
    } else if (body.action === 'editTeam') {
      const data = z
        .object({
          id: z.number().int().positive(),
          name: z.string().trim().min(2).max(40),
          manager: z.string().trim().min(2).max(40),
        })
        .parse(body)
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(teams).where(eq(teams.id, data.id)).limit(1)
        if (!before) throw new TournamentError('El equipo que intentas editar no existe.')
        await tx.update(teams).set({ name: data.name, manager: data.manager }).where(eq(teams.id, data.id))
        const [after] = await tx.select().from(teams).where(eq(teams.id, data.id)).limit(1)
        await tx.insert(adminAuditEvents).values({ entityType: 'team', entityId: data.id, action: 'updated', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: before as unknown as Record<string, unknown>, afterSnapshot: after as unknown as Record<string, unknown> })
      })
    } else if (body.action === 'schedule') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const all = await tx.select().from(teams).orderBy(teams.id)
        if (all.length !== 24)
          throw new TournamentError(
            'Registra los 24 equipos antes de generar el calendario.',
          )
        const [activeSeason] = await tx
          .select()
          .from(seasons)
          .where(eq(seasons.isCurrent, true))
          .limit(1)
        if (!activeSeason) throw new TournamentError('Crea una temporada antes de generar el calendario.')
        const old = await tx
          .select()
          .from(matches)
          .where(and(eq(matches.competition, 'liga'), eq(matches.seasonId, activeSeason.id)))
        if (old.length)
          throw new TournamentError('El calendario de liga ya existe.')
        const ids = all.map((t) => t.id)
        const fixtures = []
        for (let r = 1; r <= 23; r++) {
          for (let i = 0; i < 12; i++)
            fixtures.push({
              seasonId: activeSeason.id,
              competition: 'liga',
              round: String(r),
              homeId: ids[r % 2 ? i : 23 - i],
              awayId: ids[r % 2 ? 23 - i : i],
            })
          ids.splice(1, 0, ids.pop()!)
        }
        const createdMatches = await tx.insert(matches).values(fixtures).returning()
        await tx.insert(adminAuditEvents).values(createdMatches.map((createdMatch) => ({ entityType: 'match' as const, entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created' as const, actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })))
      })
    } else if (body.action === 'match') {
      const data = z
        .object({
          competition: competitions,
          round: z.string().trim().min(1).max(40),
          homeId: z.number().int().positive(),
          awayId: z.number().int().positive(),
          scheduledAt: z.string().datetime().nullable(),
        })
        .parse(body)
      if (data.homeId === data.awayId)
        throw new TournamentError('Selecciona dos equipos diferentes.')
      if (data.competition === 'liga')
        throw new TournamentError('Usa el generador para crear la liga.')
      // El bloqueo compartido con el cambio de temporada evita que un partido
      // quede asignado a una temporada que dejó de ser la activa mientras se guardaba.
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const [activeSeason] = await tx.select().from(seasons).where(eq(seasons.isCurrent, true)).limit(1)
        if (!activeSeason) throw new TournamentError('Crea una temporada antes de publicar partidos.')
        const [createdMatch] = await tx.insert(matches).values({
          ...data,
          seasonId: activeSeason.id,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        }).returning()
        await tx.insert(adminAuditEvents).values({ entityType: 'match', entityId: createdMatch.id, seasonId: createdMatch.seasonId, action: 'created', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null, beforeSnapshot: null, afterSnapshot: createdMatch as unknown as Record<string, unknown> })
      })
    } else if (body.action === 'result') {
      const data = z
        .object({
          id: z.number().int().positive(),
          homeScore: z.number().int().min(0).max(99).nullable(),
          awayScore: z.number().int().min(0).max(99).nullable(),
          homePenaltyScore: z.number().int().min(0).max(99).nullable().optional(),
          awayPenaltyScore: z.number().int().min(0).max(99).nullable().optional(),
          scheduledAt: z.string().datetime().nullable(),
          stats: z
            .array(
              z.object({
                playerId: z.number().int().positive(),
                goals: z.number().int().min(0).max(99),
                assists: z.number().int().min(0).max(99),
                appeared: z.boolean().default(false),
                minutes: z.number().int().min(0).max(120).default(0),
              }),
            )
            .max(100),
          mvpPlayerId: z.number().int().positive().nullable(),
        })
        .parse(body)
      if ((data.homeScore === null) !== (data.awayScore === null))
        throw new TournamentError('Completa ambos marcadores.')
      const homePens = data.homePenaltyScore ?? null
      const awayPens = data.awayPenaltyScore ?? null
      if ((homePens === null) !== (awayPens === null))
        throw new TournamentError('Completa ambos marcadores de penaltis.')
      if (homePens !== null && (homePens === awayPens || data.homeScore === null))
        throw new TournamentError('Los penaltis requieren un partido finalizado y un ganador.')
      await db.transaction(async (tx) => {
        // Serializa todos los guardados de resultados con la generación de rondas y temporadas.
        // Una ida y su vuelta tienen IDs distintos: bloquear solo por ID permitiría que dos
        // peticiones concurrentes validaran un estado obsoleto de la misma eliminatoria.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(24001)`)
        const [match] = await tx
          .select()
          .from(matches)
          .where(eq(matches.id, data.id))
        if (!match) throw new TournamentError('El partido no existe.')
        const beforeStats = await tx.select().from(matchStats).where(eq(matchStats.matchId, data.id))
        const beforeSnapshot = { ...match, stats: beforeStats }
        const knockoutCompetitions = ['champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa']
        const isSecondLeg = match.round.endsWith(' · Vuelta')
        if ((homePens !== null || awayPens !== null) && (!knockoutCompetitions.includes(match.competition) || !isSecondLeg))
          throw new TournamentError('Los penaltis solo se registran en la vuelta de una eliminatoria.')
        if (isSecondLeg && knockoutCompetitions.includes(match.competition) && data.homeScore !== null && data.awayScore !== null) {
          const roundBase = match.round.slice(0, -' · Vuelta'.length)
          const [firstLeg] = await tx.select().from(matches).where(and(
            eq(matches.seasonId, match.seasonId),
            eq(matches.competition, match.competition),
            eq(matches.round, `${roundBase} · Ida`),
            eq(matches.homeId, match.awayId),
            eq(matches.awayId, match.homeId),
          )).limit(1)
          if (firstLeg && firstLeg.homeScore !== null && firstLeg.awayScore !== null) {
            const aggregateHome = firstLeg.awayScore + data.homeScore
            const aggregateAway = firstLeg.homeScore + data.awayScore
            if (aggregateHome === aggregateAway && homePens === null)
              throw new TournamentError('El global está empatado. Registra los marcadores de penaltis para definir al clasificado.')
            if (aggregateHome !== aggregateAway && homePens !== null)
              throw new TournamentError('Los penaltis solo se registran si el marcador global queda empatado.')
          } else if (homePens !== null) {
            throw new TournamentError('Completa primero los marcadores de la ida.')
          }
        }
        // Si se modifica la ida después de haber registrado la vuelta, evita
        // conservar una tanda que ya no corresponde al nuevo marcador global.
        if (match.round.endsWith(' · Ida') && knockoutCompetitions.includes(match.competition)) {
          const roundBase = match.round.slice(0, -' · Ida'.length)
          const [secondLeg] = await tx.select().from(matches).where(and(
            eq(matches.seasonId, match.seasonId),
            eq(matches.competition, match.competition),
            eq(matches.round, `${roundBase} · Vuelta`),
            eq(matches.homeId, match.awayId),
            eq(matches.awayId, match.homeId),
          )).limit(1)
          if (secondLeg) {
            try {
              assertPenaltyDecisionStillValidAfterFirstLegEdit(data.homeScore, data.awayScore, secondLeg)
            } catch (error) {
              throw new TournamentError(error instanceof Error ? error.message : 'El cambio invalidaría la tanda de penaltis de la vuelta.')
            }
          }
        }
        const roster = await tx.select({ id: players.id, teamId: players.teamId }).from(players)
        const seasonRoster = await tx.select({ playerId: playerSeasonRosters.playerId, teamId: playerSeasonRosters.teamId }).from(playerSeasonRosters).where(eq(playerSeasonRosters.seasonId, match.seasonId))
        const teamForPlayer = (playerId: number) => seasonRoster.find((row) => row.playerId === playerId)?.teamId ?? roster.find((row) => row.id === playerId)?.teamId
        const ids = data.stats.map((s) => s.playerId)
        if (new Set(ids).size !== ids.length)
          throw new TournamentError(
            'Un jugador solo puede aparecer una vez por partido.',
          )
        for (const stat of data.stats) {
          const player = roster.find((p) => p.id === stat.playerId)
          const teamId = teamForPlayer(stat.playerId)
          if (!player || ![match.homeId, match.awayId].includes(teamId ?? -1))
            throw new TournamentError(
              'Los jugadores deben pertenecer a los equipos del partido.',
            )
        }
        if (data.homeScore !== null) {
          if (data.mvpPlayerId !== null && !ids.includes(data.mvpPlayerId))
            throw new TournamentError(
              'Selecciona un MVP entre los jugadores del partido.',
            )
          for (const [teamId, score] of [
            [match.homeId, data.homeScore],
            [match.awayId, data.awayScore!],
          ]) {
            const teamStats = data.stats.filter(
              (s) => teamForPlayer(s.playerId) === teamId,
            )
            if (
              teamStats.reduce((n, s) => n + s.goals, 0) > score ||
              teamStats.reduce((n, s) => n + s.assists, 0) > score
            )
              throw new TournamentError(
                'Los goles y las asistencias de cada equipo no pueden superar su marcador.',
              )
          }
        }
        await tx
          .update(matches)
          .set({
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            homePenaltyScore: homePens,
            awayPenaltyScore: awayPens,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          })
          .where(eq(matches.id, data.id))
        await tx.delete(matchStats).where(eq(matchStats.matchId, data.id))
        if (data.homeScore !== null && data.stats.length) {
          await tx.insert(matchStats).values(
            data.stats.map((s) => ({
              ...s,
              matchId: data.id,
              mvp: s.playerId === data.mvpPlayerId ? 1 : 0,
            })),
          )
        }
        const [afterMatch] = await tx.select().from(matches).where(eq(matches.id, data.id)).limit(1)
        const afterStats = await tx.select().from(matchStats).where(eq(matchStats.matchId, data.id))
        await tx.insert(adminAuditEvents).values({
          entityType: 'match', entityId: data.id, seasonId: match.seasonId,
          action: 'updated', actorId: user.id ? String(user.id) : null, actorEmail: user.email ?? null,
          beforeSnapshot: beforeSnapshot as unknown as Record<string, unknown>,
          afterSnapshot: { ...afterMatch, stats: afterStats } as unknown as Record<string, unknown>,
        })
      })
    } else
      return Response.json(
        { error: 'Acción desconocida.' },
        { status: 400, headers },
      )
    return Response.json({ ok: true }, { headers })
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? 'Revisa los campos del formulario.'
        : error instanceof TournamentError
          ? error.message
          : 'No se pudo guardar. Comprueba que el equipo, jugador o partido no esté duplicado.'
    return Response.json({ error: message }, { status: 400, headers })
  }
}
export const config: Config = { path: '/api/tournament' }
