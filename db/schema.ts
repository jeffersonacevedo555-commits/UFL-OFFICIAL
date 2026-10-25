import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
export const seasons = pgTable(
  'seasons',
  {
    id: serial().primaryKey(),
    name: text().notNull().unique(),
    isCurrent: boolean('is_current').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('one_current_season')
      .on(t.isCurrent)
      .where(sql`${t.isCurrent} = true`),
  ],
)
export const teams = pgTable('teams', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  manager: text().notNull(),
  crestImage: text('crest_image'),
})
export const matches = pgTable(
  'matches',
  {
    id: serial().primaryKey(),
    seasonId: integer('season_id')
      .notNull()
      .references(() => seasons.id),
    competition: text().notNull(),
    round: text().notNull(),
    homeId: integer('home_id')
      .notNull()
      .references(() => teams.id),
    awayId: integer('away_id')
      .notNull()
      .references(() => teams.id),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    homePenaltyScore: integer('home_penalty_score'),
    awayPenaltyScore: integer('away_penalty_score'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('match_pair_round').on(
      t.seasonId,
      t.competition,
      t.round,
      t.homeId,
      t.awayId,
    ),
    check('different_teams', sql`${t.homeId} <> ${t.awayId}`),
    check(
      'valid_match_scores',
      sql`(${t.homeScore} IS NULL AND ${t.awayScore} IS NULL) OR (${t.homeScore} IS NOT NULL AND ${t.awayScore} IS NOT NULL AND ${t.homeScore} >= 0 AND ${t.awayScore} >= 0 AND ${t.homeScore} <= 99 AND ${t.awayScore} <= 99)`,
    ),
    check(
      'valid_penalty_scores',
      sql`(${t.homePenaltyScore} IS NULL AND ${t.awayPenaltyScore} IS NULL) OR (${t.homePenaltyScore} IS NOT NULL AND ${t.awayPenaltyScore} IS NOT NULL AND ${t.homePenaltyScore} >= 0 AND ${t.awayPenaltyScore} >= 0 AND ${t.homePenaltyScore} <= 99 AND ${t.awayPenaltyScore} <= 99 AND ${t.homePenaltyScore} <> ${t.awayPenaltyScore} AND ${t.homeScore} IS NOT NULL AND ${t.awayScore} IS NOT NULL AND ${t.competition} IN ('champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa') AND ${t.round} LIKE '% · Vuelta')`,
    ),
  ],
)

/** Noticias del torneo con estilo de periódico: titular, desarrollo e imagen opcional en Blobs. */
export const news = pgTable(
  'news',
  {
    id: serial().primaryKey(),
    title: text().notNull(),
    body: text().notNull(),
    imageKey: text('image_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('news_created_at_idx').on(t.createdAt)],
)

export const players = pgTable(
  'players',
  {
    id: serial().primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: text().notNull(),
    photoImage: text('photo_image'),
  },
  (t) => [uniqueIndex('player_team_name').on(t.teamId, sql`lower(${t.name})`)],
)

export const matchStats = pgTable(
  'match_stats',
  {
    id: serial().primaryKey(),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id),
    goals: integer().notNull().default(0),
    assists: integer().notNull().default(0),
    mvp: integer().notNull().default(0),
    appeared: boolean('appeared').notNull().default(false),
    minutes: integer().notNull().default(0),
  },
  (t) => [
    uniqueIndex('match_player').on(t.matchId, t.playerId),
    uniqueIndex('one_mvp_per_match')
      .on(t.matchId)
      .where(sql`${t.mvp} = 1`),
    check(
      'valid_player_stats',
      sql`${t.goals} >= 0 AND ${t.assists} >= 0 AND ${t.mvp} IN (0, 1) AND ${t.minutes} BETWEEN 0 AND 120`,
    ),
  ],
)


/** Snapshot histórico del Salón de la Fama.
 * Se guarda por temporada para que los premios ya publicados no se recalculen
 * ni cambien cuando se editen temporadas posteriores.
 */
export const hallOfFame = pgTable(
  'hall_of_fame',
  {
    id: serial().primaryKey(),
    seasonId: integer('season_id').notNull().references(() => seasons.id),
    /** JSON validado por el servidor: campeones y Bota de Oro congelados. */
    awards: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** Identificador elegido manualmente por el administrador. */
    ballonDorPlayerId: integer('ballon_dor_player_id').references(() => players.id),
    /** IDs de los once titulares elegidos por el administrador. */
    startingXi: jsonb('starting_xi').$type<number[]>().notNull().default([]),
    /** IDs de los siete suplentes elegidos por el administrador. */
    substitutes: jsonb().$type<number[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('hall_of_fame_season_unique').on(t.seasonId)],
)


/** Propuestas y decisiones del mercado; la plantilla solo cambia al aceptar de forma transaccional. */
export const marketProposals = pgTable(
  'market_proposals',
  {
    id: serial().primaryKey(),
    seasonId: integer('season_id').notNull().references(() => seasons.id),
    playerId: integer('player_id').notNull().references(() => players.id),
    fromTeamId: integer('from_team_id').notNull().references(() => teams.id),
    toTeamId: integer('to_team_id').notNull().references(() => teams.id),
    note: text().notNull().default(''),
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('market_proposal_different_teams', sql`${t.fromTeamId} <> ${t.toTeamId}`),
    check('market_proposal_status', sql`${t.status} IN ('pending', 'withdrawn', 'accepted', 'rejected')`),
    uniqueIndex('market_proposal_pending_unique')
      .on(t.seasonId, t.playerId, t.toTeamId)
      .where(sql`${t.status} = 'pending'`),
  ],
)


/** Plantilla por temporada: mantiene asignaciones históricas aunque cambie el equipo de un jugador. */
export const playerSeasonRosters = pgTable(
  'player_season_rosters',
  {
    id: serial().primaryKey(),
    seasonId: integer('season_id').notNull().references(() => seasons.id),
    playerId: integer('player_id').notNull().references(() => players.id),
    teamId: integer('team_id').notNull().references(() => teams.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('player_season_roster_unique').on(t.seasonId, t.playerId),
    uniqueIndex('player_season_team_roster_unique').on(t.seasonId, t.playerId, t.teamId),
  ],
)


/** Registro inmutable de cada traspaso aceptado para consultar el historial por temporada. */
export const marketTransferHistory = pgTable(
  'market_transfer_history',
  {
    id: serial().primaryKey(),
    proposalId: integer('proposal_id').notNull().unique().references(() => marketProposals.id),
    seasonId: integer('season_id').notNull().references(() => seasons.id),
    playerId: integer('player_id').notNull().references(() => players.id),
    fromTeamId: integer('from_team_id').notNull().references(() => teams.id),
    toTeamId: integer('to_team_id').notNull().references(() => teams.id),
    note: text().notNull().default(''),
    transferredAt: timestamp('transferred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('market_transfer_history_different_teams', sql`${t.fromTeamId} <> ${t.toTeamId}`),
  ],
)


/** Registro oficial de finales y subcampeones, con nombres congelados para preservar la historia. */
export const historicalFinals = pgTable(
  'historical_finals',
  {
    id: serial().primaryKey(),
    seasonId: integer('season_id').notNull().references(() => seasons.id),
    competition: text().notNull(),
    finalFormat: text('final_format').notNull(),
    matchId: integer('match_id').references(() => matches.id),
    leg1MatchId: integer('leg1_match_id').references(() => matches.id),
    leg2MatchId: integer('leg2_match_id').references(() => matches.id),
    championName: text('champion_name').notNull(),
    runnerUpName: text('runner_up_name').notNull(),
    leg1ChampionScore: integer('leg1_champion_score'),
    leg1RunnerUpScore: integer('leg1_runner_up_score'),
    leg2ChampionScore: integer('leg2_champion_score'),
    leg2RunnerUpScore: integer('leg2_runner_up_score'),
    penaltyChampionScore: integer('penalty_champion_score'),
    penaltyRunnerUpScore: integer('penalty_runner_up_score'),
    note: text().notNull().default(''),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('historical_finals_season_competition_unique').on(t.seasonId, t.competition),
    check('historical_finals_competition_valid', sql`${t.competition} IN ('liga', 'champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa')`),
    check('historical_finals_format_valid', sql`${t.finalFormat} IN ('league', 'single', 'two_leg')`),
    check('historical_finals_match_links_format', sql`(${t.finalFormat} = 'league' AND ${t.matchId} IS NULL AND ${t.leg1MatchId} IS NULL AND ${t.leg2MatchId} IS NULL) OR (${t.finalFormat} = 'single' AND ${t.leg1MatchId} IS NULL AND ${t.leg2MatchId} IS NULL) OR (${t.finalFormat} = 'two_leg' AND ${t.matchId} IS NULL AND ${t.leg1MatchId} IS NOT NULL AND ${t.leg2MatchId} IS NOT NULL)`),
    check('historical_finals_distinct_clubs', sql`lower(trim(${t.championName})) <> lower(trim(${t.runnerUpName}))`),
    check('historical_finals_score_range', sql`(${t.leg1ChampionScore} IS NULL OR ${t.leg1ChampionScore} BETWEEN 0 AND 99) AND (${t.leg1RunnerUpScore} IS NULL OR ${t.leg1RunnerUpScore} BETWEEN 0 AND 99) AND (${t.leg2ChampionScore} IS NULL OR ${t.leg2ChampionScore} BETWEEN 0 AND 99) AND (${t.leg2RunnerUpScore} IS NULL OR ${t.leg2RunnerUpScore} BETWEEN 0 AND 99) AND (${t.penaltyChampionScore} IS NULL OR ${t.penaltyChampionScore} BETWEEN 0 AND 99) AND (${t.penaltyRunnerUpScore} IS NULL OR ${t.penaltyRunnerUpScore} BETWEEN 0 AND 99)`),
    check('historical_finals_penalties_pair', sql`(${t.penaltyChampionScore} IS NULL AND ${t.penaltyRunnerUpScore} IS NULL) OR (${t.penaltyChampionScore} IS NOT NULL AND ${t.penaltyRunnerUpScore} IS NOT NULL AND ${t.penaltyChampionScore} <> ${t.penaltyRunnerUpScore})`),
    check('historical_finals_score_format', sql`(${t.finalFormat} = 'league' AND ${t.leg1ChampionScore} IS NULL AND ${t.leg1RunnerUpScore} IS NULL AND ${t.leg2ChampionScore} IS NULL AND ${t.leg2RunnerUpScore} IS NULL AND ${t.penaltyChampionScore} IS NULL AND ${t.penaltyRunnerUpScore} IS NULL) OR (${t.finalFormat} = 'single' AND ${t.leg1ChampionScore} IS NOT NULL AND ${t.leg1RunnerUpScore} IS NOT NULL AND ${t.leg2ChampionScore} IS NULL AND ${t.leg2RunnerUpScore} IS NULL) OR (${t.finalFormat} = 'two_leg' AND ${t.leg1ChampionScore} IS NOT NULL AND ${t.leg1RunnerUpScore} IS NOT NULL AND ${t.leg2ChampionScore} IS NOT NULL AND ${t.leg2RunnerUpScore} IS NOT NULL)`),
  ],
)


/** Auditoría inmutable de cambios administrativos sobre el historial oficial de finales. */
export const historicalFinalAudits = pgTable(
  'historical_final_audits',
  {
    id: serial().primaryKey(),
    finalId: integer('final_id').notNull(),
    action: text().notNull(),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    beforeSnapshot: jsonb('before_snapshot'),
    afterSnapshot: jsonb('after_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('historical_final_audits_action_valid', sql`${t.action} IN ('created', 'updated', 'deleted')`),
    check('historical_final_audits_snapshot_pair', sql`(${t.action} = 'created' AND ${t.beforeSnapshot} IS NULL AND ${t.afterSnapshot} IS NOT NULL) OR (${t.action} = 'updated' AND ${t.beforeSnapshot} IS NOT NULL AND ${t.afterSnapshot} IS NOT NULL) OR (${t.action} = 'deleted' AND ${t.beforeSnapshot} IS NOT NULL AND ${t.afterSnapshot} IS NULL)`),
  ],
)


/** Auditoría transversal de cambios administrativos en partidos, plantillas, traspasos y entidades. */
export const adminAuditEvents = pgTable(
  'admin_audit_events',
  {
    id: serial().primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    seasonId: integer('season_id'),
    action: text().notNull(),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    beforeSnapshot: jsonb('before_snapshot'),
    afterSnapshot: jsonb('after_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('admin_audit_events_entity_type_valid', sql`${t.entityType} IN ('match', 'roster', 'transfer', 'market_proposal', 'team', 'player', 'news')`),
    check('admin_audit_events_action_valid', sql`${t.action} IN ('created', 'updated', 'deleted', 'accepted', 'rejected', 'withdrawn')`),
  ],
)
