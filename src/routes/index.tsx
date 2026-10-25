import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Trophy,
  ArrowUpRight,
  ArrowRight,
  Shield,
  CalendarDays,
  Settings2,
  ChevronRight,
  Globe2,
  LockKeyhole,
  CircleDot,
  Check,
} from 'lucide-react'
import {
  getUser,
  login,
  logout,
  handleAuthCallback,
  acceptInvite,
  updateUser,
  requestPasswordRecovery,
  type User,
} from '@netlify/identity'
import {
  competitions,
  standings,
  matchesForSeason,
  type Team,
  type Match,
  type Player,
  type MatchStat,
  type Season,
  type News,
} from '@/lib/tournament'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Crest, PlayerAvatar, mediaUrl } from '@/components/media'

import { PlayerTables, MatchResultEditor } from '@/components/player-statistics'
import {
  loadScenariosFromStorage,
  saveScenariosToStorage,
  exportScenarioBundle,
  getScenarioImportSignature,
  validateScenarioBundle,
  MAX_SCENARIOS_PER_SEASON,
  type ClassificationScenarioSnapshot,
} from '@/lib/classification-scenario-storage'

export const Route = createFileRoute('/')({ component: Home })
const empty = {
  seasons: [] as Season[],
  activeSeasonId: null as number | null,
  teams: [] as Team[],
  matches: [] as Match[],
  players: [] as Player[],
  stats: [] as MatchStat[],
  hallOfFame: [] as { id: number; seasonId: number; awards: Record<string, unknown>; ballonDorPlayerId: number | null; startingXi: number[]; substitutes: number[]; updatedAt: string }[],
  marketProposals: [] as { id: number; seasonId: number; playerId: number; fromTeamId: number; toTeamId: number; note: string; status: 'pending' | 'withdrawn' | 'accepted' | 'rejected'; createdAt: string; updatedAt: string }[],
  playerSeasonRosters: [] as { id: number; seasonId: number; playerId: number; teamId: number; createdAt: string }[],
  marketTransferHistory: [] as { id: number; proposalId: number; seasonId: number; playerId: number; fromTeamId: number; toTeamId: number; note: string; transferredAt: string }[],
  historicalFinals: [] as HistoricalFinal[],
  historicalFinalAudits: [] as HistoricalFinalAudit[],
  adminAuditEvents: [] as AdminAuditEvent[],
  news: [] as News[],
}
function createSnapshotId() {
  return Date.now()
}
function Home() {
  const [data, setData] = useState(empty),
    [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  const [competition, setCompetition] = useState('liga'),
    [view, setView] = useState('Resumen'),
    [search, setSearch] = useState(''),
    [round, setRound] = useState('all')
  const [adminOpen, setAdminOpen] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  const [callback, setCallback] = useState<{
    type: string
    token?: string
  } | null>(null)
  const [editing, setEditing] = useState<Match | null>(null),
    [editTeam, setEditTeam] = useState<Team | null>(null),
    [editPlayer, setEditPlayer] = useState<Player | null>(null),
    [editNews, setEditNews] = useState<News | null>(null)
  const [rosterEditorSeasonId, setRosterEditorSeasonId] = useState<number | null>(null)
  async function fetchTournament() {
    const res = await fetch('/api/tournament')
    if (!res.ok) throw new Error()
    return (await res.json()) as typeof empty
  }
  function applyData(result: typeof empty, preferActiveSeason: boolean) {
    setError('')
    setData(result)
    setSelectedSeasonId((current) =>
      !preferActiveSeason && current !== null && result.seasons.some((season) => season.id === current)
        ? current
        : result.activeSeasonId ?? result.seasons[0]?.id ?? null,
    )
  }
  const loadError = 'No pudimos cargar el torneo. Inténtalo de nuevo.'
  async function load(preferActiveSeason = false) {
    try {
      applyData(await fetchTournament(), preferActiveSeason)
    } catch {
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    // Los setState se ejecutan solo en callbacks de la petición, no de forma síncrona en el efecto.
    void fetchTournament()
      .then((result) => applyData(result, false), () => setError(loadError))
      .finally(() => setLoading(false))
    void (async () => {
      try {
        const result = await handleAuthCallback()
        if (result?.type === 'invite' || result?.type === 'recovery') {
          setCallback(result)
          setAdminOpen(true)
        }
        setUser(await getUser())
      } catch {
        setNotice('No se pudo validar el enlace de acceso. Solicita uno nuevo.')
        setAdminOpen(true)
      }
    })()
  }, [])
  const seasonMatches = matchesForSeason(data.matches, selectedSeasonId)
  const currentSeasonMatches = matchesForSeason(data.matches, data.activeSeasonId)
  const previousSeason = data.seasons.filter((season) => season.id < (data.activeSeasonId ?? 0)).sort((a, b) => b.id - a.id)[0]
  const rows = standings(data.teams, seasonMatches),
    active = competitions.find((c) => c.id === competition)!
  const filteredMatches = seasonMatches.filter(
    (m) =>
      m.competition === competition && (round === 'all' || m.round === round),
  )
  const rounds = [
    ...new Set(
      seasonMatches
        .filter((m) => m.competition === competition)
        .map((m) => m.round),
    ),
  ]
  const played = seasonMatches.filter(
    (m) => m.competition === 'liga' && m.homeScore !== null,
  ).length
  const finalLeague = data.teams.length === 24 && played === 276
  const cupRounds = currentSeasonMatches.filter((match) => match.competition === 'copa').map((match) => match.round.replace(/ · (Ida|Vuelta)$/, ''))
  const cupNextRound = cupRounds.includes('Final') ? null : cupRounds.includes('Semifinal') ? 'Final' : cupRounds.includes('Cuartos de final') ? 'Semifinal' : cupRounds.includes('Octavos de final') ? 'Cuartos de final' : null
  const isAdmin = user?.roles?.includes('admin')
  const hallRecord = data.hallOfFame.find((record) => record.seasonId === selectedSeasonId)
  const teamName = (id: number) =>
    data.teams.find((t) => t.id === id)?.name || 'Equipo'
  const crestForName = (name: string) =>
    data.teams.find((t) => t.name === name)?.crestImage ?? undefined
  async function uploadImage(kind: 'team' | 'player' | 'news', id: number, file: File | null | undefined) {
    if (!file) return
    if (file.size > 400 * 1024) {
      setNotice('La imagen supera el límite de 400 KB.')
      return
    }
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
    if (!dataUrl) {
      setNotice('No se pudo leer la imagen.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, dataUrl }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setNotice('Imagen guardada.')
      await load()
    } catch (e) {
      setNotice(e instanceof Error && e.message ? e.message : 'No se pudo guardar la imagen.')
    } finally {
      setBusy(false)
    }
  }
  async function removeImage(kind: 'team' | 'player' | 'news', id: number) {
    setBusy(true)
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, remove: true }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setNotice('Imagen eliminada.')
      await load()
    } catch (e) {
      setNotice(e instanceof Error && e.message ? e.message : 'No se pudo eliminar la imagen.')
    } finally {
      setBusy(false)
    }
  }
  async function mutate(body: unknown) {
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      const preferActiveSeason = typeof body === 'object' && body !== null && 'action' in body && ['createSeason', 'generateCup', 'generateNextCupRound', 'generateSupercopaLiga', 'generateSupercopaLigaFinal', 'generateSupercopaEuropa'].includes(String(body.action))
      await load(preferActiveSeason)
      if (typeof body === 'object' && body !== null && 'action' in body && body.action === 'calculateHallOfFame') {
        const calculated = Array.isArray(result.calculated) ? result.calculated.length : 0
        const skipped = Array.isArray(result.skipped) ? result.skipped.length : 0
        setNotice(`Premios automáticos guardados: ${calculated} calculados; ${skipped} pendientes por falta de datos suficientes. Los premios históricos pendientes se conservaron.`)
      } else {
        setNotice('Cambios guardados.')
      }
      setEditing(null)
      setEditTeam(null)
      setEditPlayer(null)
      setEditNews(null)
      return true
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo guardar.')
      return false
    } finally {
      setBusy(false)
    }
  }
  function selectCompetition(id: string) {
    setCompetition(id)
    setRound('all')
    setView(id === 'liga' ? 'Resumen' : 'Partidos')
  }
  async function authSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setNotice('')
    try {
      if (callback?.type === 'invite') {
        setUser(await acceptInvite(callback.token!, String(f.get('password'))))
        setCallback(null)
      } else if (callback?.type === 'recovery') {
        await updateUser({ password: String(f.get('password')) })
        setUser(await getUser())
        setCallback(null)
      } else
        setUser(await login(String(f.get('email')), String(f.get('password'))))
      setNotice('Sesión iniciada.')
    } catch {
      setNotice(
        'No se pudo iniciar sesión. Revisa tus datos o solicita un nuevo enlace.',
      )
    } finally {
      setBusy(false)
    }
  }
  function matchCard(m: Match) {
    return (
      <article className="match" key={m.id}>
        <div className="match-meta">
          <span>{m.round.match(/^\d+$/) ? `Jornada ${m.round}` : m.round}</span>
          <span>{m.homeScore !== null ? 'FINALIZADO' : 'POR JUGAR'}</span>
        </div>
        <div className="match-versus">
          <div>
            <Crest name={teamName(m.homeId)} image={crestForName(teamName(m.homeId))} />
            <strong>{teamName(m.homeId)}</strong>
          </div>
          <b>
            {m.homeScore !== null ? `${m.homeScore} : ${m.awayScore}` : 'VS'}
          </b>
          <div>
            <Crest name={teamName(m.awayId)} image={crestForName(teamName(m.awayId))} />
            <strong>{teamName(m.awayId)}</strong>
          </div>
        </div>
        {m.homeScore !== null &&
          data.stats.some((s) => s.matchId === m.id && s.mvp === 1) && (
            <p className="match-mvp">
              <Trophy size={13} /> MVP ·{' '}
              {
                data.players.find(
                  (p) =>
                    p.id ===
                    data.stats.find((s) => s.matchId === m.id && s.mvp === 1)
                      ?.playerId,
                )?.name
              }
            </p>
          )}
        <div className="match-date">
          <CalendarDays size={13} />
          {m.scheduledAt
            ? new Date(m.scheduledAt).toLocaleString('es', {
                timeZone: 'UTC',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }) + ' UTC'
            : 'Fecha por confirmar'}
        </div>
      </article>
    )
  }
  const displayedRows = rows.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <div className="site">
      <header>
        <a className="brand" href="/">
          <span className="brand-mark">
            <Globe2 size={25} />
          </span>
          <span>
            UNIVERSE<span>FAMILY LEAGUE</span>
          </span>
        </a>
        <nav aria-label="Principal">
          <button
            className={view !== 'Formato' ? 'active' : ''}
            onClick={() => {
              setView('Resumen')
              setCompetition('liga')
            }}
          >
            El torneo
          </button>
          <button
            onClick={() => {
              setView('Partidos')
              document
                .getElementById('content')
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Partidos
          </button>
          <button
            onClick={() => {
              setView('Equipos')
              document
                .getElementById('content')
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Equipos
          </button>
          <button onClick={() => setView('Formato')}>Formato</button>
          <button onClick={() => setView('Salón de la Fama')}>Salón de la Fama</button>
          <button onClick={() => setView('Mercado')}>Mercado</button>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> COMUNIDAD FC MOBILE{' '}
              <span className="slash">/</span> TORNEO OFICIAL DE LA COMUNIDAD
            </div>
            <h1>
              UNA FAMILIA.
              <br />
              SEIS TÍTULOS.
              <br />
              <em>TODO POR JUGAR.</em>
            </h1>
            <p>
              24 equipos. Una misma pasión. Bienvenido a Universe Family League,
              donde cada partido escribe nuestra historia.
            </p>
            <div className="hero-actions">
              <button
                className="primary"
                onClick={() => {
                  setView('Clasificación')
                  document
                    .getElementById('content')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Ver clasificación <ArrowUpRight size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => setView('Formato')}
              >
                Conoce el formato <ArrowRight size={16} />
              </button>
            </div>
            <div className="hero-bottom">
              <span>
                <Shield size={15} />
                24 EQUIPOS
              </span>
              <span>
                <Trophy size={15} />6 COMPETICIONES
              </span>
              <span>
                <Globe2 size={15} />
                UNA FAMILIA
              </span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-cross cross-one">+</div>
            <div className="art-cross cross-two">+</div>
            <span className="art-caption">THE GAME CONNECTS US.</span>
            <div className="trophy-stage">
              <svg viewBox="0 0 300 340" className="hero-trophy">
                <defs>
                  <linearGradient id="metal" x1="0" x2="1">
                    <stop stopColor="#5d6a47" />
                    <stop offset=".25" stopColor="#d7e5bd" />
                    <stop offset=".49" stopColor="#819264" />
                    <stop offset=".7" stopColor="#f2f9d8" />
                    <stop offset="1" stopColor="#75835b" />
                  </linearGradient>
                  <linearGradient id="cup" x1="0" x2="1">
                    <stop stopColor="#9db05f" />
                    <stop offset=".45" stopColor="#e6f5b3" />
                    <stop offset="1" stopColor="#788d43" />
                  </linearGradient>
                </defs>
                <path
                  d="M84 66H43c-5 76 18 110 67 113M216 66h41c5 76-18 110-67 113"
                  fill="none"
                  stroke="url(#metal)"
                  strokeWidth="14"
                />
                <path
                  d="M79 43h142l-11 95c-4 34-24 59-60 65-36-6-56-31-60-65Z"
                  fill="url(#cup)"
                />
                <path
                  d="M93 50l12 84c4 22 10 35 23 42L115 50Z"
                  fill="#fff"
                  opacity=".19"
                />
                <path d="M136 200h28v47l32 26h-92l32-26Z" fill="url(#metal)" />
                <path d="M104 269h92l12 24H92Z" fill="url(#cup)" />
                <path d="M89 292h122v22H89Z" fill="#28311e" stroke="#9dac79" />
                <path d="M80 39h140v13H80Z" fill="url(#metal)" />
                <path
                  d="m150 82 9 18 20 3-15 14 4 20-18-10-18 10 4-20-15-14 20-3Z"
                  fill="#596c30"
                />
                <text
                  x="150"
                  y="167"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#445426"
                  fontWeight="bold"
                >
                  U F L
                </text>
              </svg>
            </div>
            <span className="art-year">
              UNIVERSE
              <br />
              <b>FAMILY LEAGUE</b>
            </span>
            <div className="art-stamp">
              FC
              <br />
              <b>MOBILE</b>
            </div>
          </div>
        </section>
        <div className="ticker">
          <span>LA PASIÓN NOS UNE</span>
          <i>✦</i>
          <span>EL FÚTBOL NOS DEFINE</span>
          <i>✦</i>
          <span>UNIVERSE FAMILY LEAGUE</span>
          <i>✦</i>
          <span>LA PASIÓN NOS UNE</span>
          <i>✦</i>
          <span>EL FÚTBOL NOS DEFINE</span>
        </div>
        <section className="competition-section">
          <div className="section-label">
            <span>01 / LAS COMPETICIONES</span>
            <span>UNA LIGA. SEIS TÍTULOS.</span>
          </div>
          <div className="competitions">
            {competitions.map((c, i) => (
              <button
                key={c.id}
                className={`competition ${c.color} ${competition === c.id ? 'selected' : ''}`}
                onClick={() => selectCompetition(c.id)}
              >
                <div className="competition-top">
                  <span className="competition-icon">
                    <Trophy size={24} />
                  </span>
                  <ArrowUpRight size={18} />
                </div>
                <span className="competition-number">0{i + 1}</span>
                <h2>{c.name}</h2>
                <p>{c.label}</p>
                <div className="competition-foot">
                  <span>{c.count}</span>
                  {competition === c.id ? (
                    <span className="selected-text">
                      SELECCIONADA <Check size={12} />
                    </span>
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
        <section id="content" className="content-section">
          <div className="content-heading">
            <div>
              <div className="eyebrow">EL PULSO DEL TORNEO</div>
              <h2>
                {view === 'Formato'
                  ? 'Así se juega.'
                  : active.name === 'Liga'
                    ? 'La liga, al día.'
                    : active.name + '.'}
              </h2>
            </div>
            <div className="season-controls">
              {data.seasons.length > 0 && (
                <label className="season-picker">
                  <span>Temporada</span>
                  <select aria-label="Seleccionar temporada" value={selectedSeasonId ?? ''} onChange={(event) => { setSelectedSeasonId(Number(event.target.value)); setRound('all') }}>
                    {data.seasons.map((season) => (
                      <option key={season.id} value={season.id}>{season.name}{season.isCurrent ? ' · Actual' : ''}</option>
                    ))}
                  </select>
                </label>
              )}
              <span className="season-badge">
                <CircleDot size={13} />
                {played ? 'Temporada en juego' : 'Preparando la temporada'}
              </span>
            </div>
          </div>
          <div className="tabs" role="tablist">
            {[
              'Resumen',
              'Clasificación',
              'Partidos',
              'Noticias',
              'Estadísticas',
              'Salón de la Fama',
              'Mercado',
              'Jugadores',
              'Comparar jugadores',
              'Récords UFL',
              'Estadísticas de equipos',
              'Comparar equipos',
              'Análisis de temporadas',
              'Escenarios de clasificación',
              'Palmarés de clubes',
              'Finales históricas',
              'Integridad histórica',
              ...(isAdmin ? ['Auditoría administrativa'] : []),
              'Equipos',
              'Formato',
            ].map((tab) => (
              <button
                role="tab"
                aria-selected={view === tab}
                className={view === tab ? 'selected' : ''}
                key={tab}
                onClick={() => setView(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {error && (
            <div role="alert" className="error-box">
              {error}
              <button onClick={() => void load()}>Reintentar</button>
            </div>
          )}
          {loading ? (
            <div className="loading-grid" aria-label="Cargando torneo">
              <div />
              <div />
              <div />
            </div>
          ) : (
            <>
              {view === 'Salón de la Fama' ? (
                <HallOfFamePanel
                  key={hallRecord ? `hall-${hallRecord.updatedAt}` : 'hall-empty'}
                  record={hallRecord}
                  players={data.players}
                  teams={data.teams}
                  isAdmin={Boolean(isAdmin)}
                  seasonId={selectedSeasonId}
                  busy={busy}
                  onSave={(payload) => mutate(payload)}
                />
              ) : view === 'Jugadores' ? (
                <PlayerProfilesPanel
                  players={data.players}
                  teams={data.teams}
                  seasons={data.seasons}
                  selectedSeasonId={selectedSeasonId}
                  seasonRoster={data.playerSeasonRosters}
                  transferHistory={data.marketTransferHistory}
                  matches={data.matches}
                  stats={data.stats}
                  adminAuditEvents={data.adminAuditEvents}
                />
              ) : view === 'Comparar jugadores' ? (
                <PlayerComparisonPanel
                  players={data.players}
                  teams={data.teams}
                  seasons={data.seasons}
                  selectedSeasonId={selectedSeasonId}
                  seasonRoster={data.playerSeasonRosters}
                  transferHistory={data.marketTransferHistory}
                  matches={data.matches}
                  stats={data.stats}
                />
              ) : view === 'Récords UFL' ? (
                <HistoricalRecordsPanel
                  players={data.players}
                  seasons={data.seasons}
                  matches={data.matches}
                  stats={data.stats}
                />
              ) : view === 'Estadísticas de equipos' ? (
                <TeamStatisticsPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />
              ) : view === 'Comparar equipos' ? (
                <TeamComparisonPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />
              ) : view === 'Análisis de temporadas' ? (
                <SeasonAnalysisPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />
              ) : view === 'Escenarios de clasificación' ? (
                <ClassificationScenarioPanel key={selectedSeasonId ?? 'none'} teams={data.teams} seasons={data.seasons} matches={data.matches} selectedSeasonId={selectedSeasonId} />
              ) : view === 'Palmarés de clubes' ? (
                <ClubPalmaresPanel teams={data.teams} seasons={data.seasons} records={data.hallOfFame} finals={data.historicalFinals} />
              ) : view === 'Finales históricas' ? (
                <HistoricalFinalsPanel finals={data.historicalFinals} seasons={data.seasons} teams={data.teams} matches={data.matches} isAdmin={Boolean(isAdmin)} busy={busy} onMutate={mutate} />
              ) : view === 'Integridad histórica' ? (
                <HistoricalIntegrityPanel finals={data.historicalFinals} seasons={data.seasons} teams={data.teams} matches={data.matches} />
              ) : view === 'Auditoría administrativa' && isAdmin ? (
                <HistoricalFinalAuditPanel audits={data.historicalFinalAudits} events={data.adminAuditEvents} seasons={data.seasons} teams={data.teams} players={data.players} />
              ) : view === 'Mercado' ? (
                <MarketPanel
                  seasonId={selectedSeasonId}
                  proposals={data.marketProposals.filter((proposal) => proposal.seasonId === selectedSeasonId)}
                  seasonRoster={data.playerSeasonRosters.filter((row) => row.seasonId === selectedSeasonId)}
                  transferHistory={data.marketTransferHistory.filter((row) => row.seasonId === selectedSeasonId)}
                  players={data.players}
                  teams={data.teams}
                  isAdmin={Boolean(isAdmin)}
                  busy={busy}
                  onMutate={mutate}
                />
              ) : view === 'Noticias' ? (
                <NewsPanel news={data.news} isAdmin={Boolean(isAdmin)} />
              ) : view === 'Estadísticas' ? (
                <PlayerTables data={{ ...data, matches: seasonMatches }} competition={competition} />
              ) : view === 'Formato' ? (
                <div className="format-grid">
                  <div className="panel">
                    <h3>24 equipos. Seis títulos en juego.</h3>
                    <p>
                      La clasificación de liga es el punto de partida de todas
                      las competiciones.
                    </p>
                    {competitions.map((c) => (
                      <div className={`format-row ${c.color}`} key={c.id}>
                        <Trophy size={24} />
                        <div>
                          <h4>{c.name}</h4>
                          <p>
                            {c.id === 'liga'
                              ? '24 equipos compiten en liga. Victoria: 3 puntos · Empate: 1 · Derrota: 0.'
                              : c.id === 'champions'
                                ? 'Participan los equipos que terminan entre los puestos 1 y 12 de la liga.'
                                : c.id === 'europa'
                                  ? 'Participan los equipos que terminan entre los puestos 13 y 24 de la liga.'
                                  : c.id === 'copa'
                                    ? 'Clasifican los 16 mejores de la temporada anterior. Octavos: 1.º–16.º, 2.º–15.º, 3.º–14.º, 4.º–13.º, 5.º–12.º, 6.º–11.º, 7.º–10.º y 8.º–9.º. Las eliminatorias son a doble partido.'
                                    : c.id === 'supercopa_liga'
                                      ? 'Semifinales: campeón de Liga contra subcampeón de Copa, y subcampeón de Liga contra campeón de Copa. Cada eliminatoria y la final se juegan a ida y vuelta.'
                                      : c.id === 'supercopa_europa'
                                        ? 'El campeón de Champions se enfrenta al campeón de Europa League en una final a ida y vuelta.'
                                        : 'Competición definida por la organización.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <aside className="panel">
                    <h3>Cada posición cuenta.</h3>
                    <p>
                      Desempates de liga: puntos, diferencia de goles,
                      enfrentamiento directo, goles a favor y goles en contra
                      (menos goles recibidos). Si el empate deportivo persiste,
                      la organización debe resolverlo manualmente.
                    </p>
                    <p>
                      El calendario generado es de una vuelta: 23 jornadas, 276
                      partidos. Los cruces de las otras competiciones los
                      publica la organización.
                    </p>
                    <span className="tag">
                      COMUNIDAD · COMPETICIÓN · RESPETO
                    </span>
                  </aside>
                </div>
              ) : view === 'Equipos' ? (
                <>
                  <div className="list-header">
                    <h3>
                      Los protagonistas <span>{data.teams.length}/24</span>
                    </h3>
                    <input
                      placeholder="Buscar equipo…"
                      aria-label="Buscar equipo"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="teams-grid">
                    {displayedRows.map((t) => (
                      <article className="team-card" key={t.id}>
                        <Crest name={t.name} image={t.crestImage} />
                        <div>
                          <h3>{t.name}</h3>
                          <p>{t.manager}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!displayedRows.length && (
                    <Empty
                      title="La familia está por reunirse"
                      text="Los equipos inscritos aparecen aquí cuando la organización los registra."
                    />
                  )}
                </>
              ) : view === 'Partidos' ? (
                <>
                  <div className="list-header">
                    <h3>Calendario y resultados</h3>
                    <select
                      aria-label="Filtrar por jornada"
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                    >
                      <option value="all">Todas las jornadas</option>
                      {rounds.map((r) => (
                        <option key={r} value={r}>
                          {r.match(/^\d+$/) ? 'Jornada ' : ''}
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="matches-grid">
                    {filteredMatches.map(matchCard)}
                  </div>
                  {!filteredMatches.length && (
                    <Empty
                      title="El próximo capítulo está por escribirse"
                      text="El calendario y los cruces aparecerán aquí cuando los publique la organización."
                    />
                  )}
                </>
              ) : (
                <div className={view === 'Resumen' ? 'overview-grid' : ''}>
                  <div className="panel standings">
                    <div className="panel-heading">
                      <h3>Clasificación de liga</h3>
                      <span className="tag">
                        {finalLeague ? 'FINAL' : 'PROVISIONAL'}
                      </span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Equipo</th>
                            <th>PJ</th>
                            <th>G</th>
                            <th>E</th>
                            <th>P</th>
                            <th>DG</th>
                            <th>PTS</th>
                            <th>Forma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows
                            .slice(0, view === 'Resumen' ? 6 : 24)
                            .map((t, i) => (
                              <tr key={t.id}>
                                <td>
                                  <span
                                    className={`position ${i < 12 ? 'champions' : 'europa'}`}
                                  >
                                    {i + 1}
                                  </span>
                                </td>
                                <td>
                                  <span className="team-cell">
                                    <Crest name={t.name} small image={t.crestImage} />
                                    {t.name}
                                  </span>
                                </td>
                                <td>{t.played}</td>
                                <td>{t.won}</td>
                                <td>{t.drawn}</td>
                                <td>{t.lost}</td>
                                <td>
                                  {t.gf - t.ga > 0 ? '+' : ''}
                                  {t.gf - t.ga}
                                </td>
                                <td className="points">{t.points}</td>
                                <td>
                                  <span className="form">
                                    {t.form.slice(-5).map((v, j) => (
                                      <i key={j} className={v}>
                                        {v}
                                      </i>
                                    ))}
                                    {!t.form.length && '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!rows.length && (
                      <Empty
                        title="La temporada empieza contigo"
                        text="Aún no hay equipos registrados. La clasificación se actualiza al guardar cada resultado."
                      />
                    )}
                    <div className="table-legend">
                      <span>
                        <i className="blue-dot" />
                        1–12 Champions
                      </span>
                      <span>
                        <i className="orange-dot" />
                        13–24 Europa League
                      </span>
                    </div>
                    {view === 'Resumen' && (
                      <button
                        className="full-link"
                        onClick={() => setView('Clasificación')}
                      >
                        Ver clasificación completa <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                  {view === 'Resumen' && (
                    <aside>
                      <div className="panel next-matches">
                        <div className="panel-heading">
                          <h3>Próximos partidos</h3>
                          <CalendarDays size={17} />
                        </div>
                        {seasonMatches
                          .filter(
                            (m) =>
                              m.competition === competition &&
                              m.homeScore === null,
                          )
                          .slice(0, 2)
                          .map(matchCard)}
                        {!seasonMatches.some(
                          (m) =>
                            m.competition === competition &&
                            m.homeScore === null,
                        ) && (
                          <div className="small-empty">
                            <CalendarDays size={27} />
                            <h4>La cancha nos espera.</h4>
                            <p>
                              Pronto conocerás los próximos enfrentamientos.
                            </p>
                          </div>
                        )}
                        <button
                          className="full-link"
                          onClick={() => setView('Partidos')}
                        >
                          Todo el calendario <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="copa-note">
                        <Trophy size={25} />
                        <div>
                          <h3>El top 16 tiene recompensa.</h3>
                          <p>
                            Los 16 mejores de la temporada anterior clasifican
                            a la Copa. Octavos: 1.º–16.º, 2.º–15.º, 3.º–14.º,
                            4.º–13.º, 5.º–12.º, 6.º–11.º, 7.º–10.º y 8.º–9.º.
                          </p>
                          <button onClick={() => setView('Formato')}>
                            Explorar el formato <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </div>
                    </aside>
                  )}
                </div>
              )}
              {['champions', 'europa', 'copa'].includes(competition) && view !== 'Formato' && (
                <div className="qualification panel">
                  <div>
                    <h3>
                      {competition === 'copa'
                        ? 'Los 16 puestos de Copa'
                        : 'Equipos en zona de clasificación'}
                    </h3>
                    <p>
                      {competition === 'copa'
                        ? 'Los octavos pueden generarse desde la clasificación final de la temporada anterior cuando la Liga está completa. Si persiste un empate deportivo, la generación se detiene para evitar asignar posiciones sin autorización.'
                        : finalLeague
                          ? 'Clasificación según la tabla final.'
                          : 'Proyección provisional según la liga. Los cupos se confirman al finalizar.'}
                    </p>
                  </div>
                  <div className="qualified-teams">
                    {(competition === 'champions'
                      ? rows.slice(0, 12)
                      : competition === 'europa'
                        ? rows.slice(12)
                        : rows.slice(0, 16)
                    ).map((t, i) => (
                      <span key={t.id}>
                        <Crest name={t.name} small image={t.crestImage} />
                        {t.name}
                        {competition === 'copa' && (
                          <small>{`Posición ${i + 1} · referencia actual`}</small>
                        )}
                      </span>
                    ))}
                    {!rows.length && (
                      <p>Esperando equipos y resultados de liga.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <section className="community">
          <div>
            <span className="eyebrow">MÁS QUE UN TORNEO</span>
            <h2>
              Rivales en la cancha.
              <br />
              <em>Familia fuera de ella.</em>
            </h2>
          </div>
          <div className="community-mark">
            <Globe2 size={65} />
            <span>
              UNIVERSE
              <br />
              FAMILY LEAGUE
            </span>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          <Globe2 size={23} />
          <span>
            UNIVERSE<span>FAMILY LEAGUE</span>
          </span>
        </a>
        <p>Hecho para nuestra comunidad de FC Mobile.</p>
        <span>Torneo de la comunidad · No afiliado a EA SPORTS</span>
        <button className="footer-admin" onClick={() => setAdminOpen(true)}>
          <Settings2 size={13} /> Acceso de administración
        </button>
      </footer>
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="admin-dialog">
          <DialogTitle>Gestión del torneo</DialogTitle>
          <DialogDescription>
            Universe Family League · Acceso de la organización
          </DialogDescription>
          <div className="admin-scroll">
            {!user || callback ? (
              <>
                <form className="admin-form" onSubmit={authSubmit}>
                  <LockKeyhole size={27} />
                  <h3>
                    {callback ? 'Define tu contraseña' : 'Bienvenido de nuevo'}
                  </h3>
                  {!callback && (
                    <label>
                      Correo electrónico
                      <input
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                      />
                    </label>
                  )}
                  <label>
                    Contraseña
                    <input
                      name="password"
                      type="password"
                      minLength={callback ? 8 : 1}
                      required
                      autoComplete={
                        callback ? 'new-password' : 'current-password'
                      }
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    {busy
                      ? 'Procesando…'
                      : callback
                        ? 'Guardar contraseña'
                        : 'Iniciar sesión'}
                    <ArrowRight size={16} />
                  </button>
                </form>
                {!callback && (
                  <button
                    className="full-link"
                    onClick={async () => {
                      const email = document.querySelector<HTMLInputElement>(
                        'input[name="email"]',
                      )?.value
                      if (!email) {
                        setNotice('Introduce tu correo electrónico primero.')
                        return
                      }
                      try {
                        await requestPasswordRecovery(email)
                        setNotice(
                          'Revisa tu correo para restablecer tu contraseña.',
                        )
                      } catch {
                        setNotice(
                          'No se pudo enviar el enlace. Inténtalo de nuevo.',
                        )
                      }
                    }}
                  >
                    Restablecer contraseña
                  </button>
                )}
                <p className="setup-note">
                  Primer acceso: en el panel de Netlify de este proyecto, abre
                  Identity, invita tu correo y asigna a tu usuario el rol
                  «admin». Acepta la invitación para definir tu contraseña.
                </p>
              </>
            ) : !isAdmin ? (
              <p>
                Tu cuenta no tiene permisos de administración. La organización
                debe asignarte el rol «admin» en Identity.
              </p>
            ) : (
              <>
                <div className="admin-status">
                  <span>
                    <Shield size={16} /> Sesión de administrador
                  </span>
                  <button
                    onClick={async () => {
                      await logout()
                      setUser(null)
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
                <details open>
                  <summary>Temporadas · {data.seasons.length}</summary>
                  <p>Los resultados quedan guardados en su temporada. Crear una temporada nueva no borra el historial anterior.</p>
                  <form className="admin-form" onSubmit={async (e) => {
                    e.preventDefault()
                    const form = e.currentTarget
                    const f = new FormData(form)
                    if (window.confirm('¿Crear esta temporada y convertirla en la temporada actual? Los partidos anteriores se conservarán.')) {
                      if (await mutate({ action: 'createSeason', name: f.get('seasonName') })) form.reset()
                    }
                  }}>
                    <label>Nombre de la temporada<input name="seasonName" required minLength={2} maxLength={60} placeholder="Temporada 2026" /></label>
                    <button className="primary" disabled={busy}>Crear y activar temporada</button>
                  </form>
                </details>
                <details open>
                  <summary>Equipos · {data.teams.length}/24</summary>
                  <form
                    className="admin-form"
                    key={editTeam?.id || 'new'}
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.currentTarget
                      const f = new FormData(form)
                      const crestFile = form.querySelector<HTMLInputElement>('input[name="crestFile"]')?.files?.[0]
                      const teamIdBefore = editTeam?.id ?? null
                      const teamNameValue = String(f.get('name')).trim()
                      if (
                        await mutate({
                          action: editTeam ? 'editTeam' : 'team',
                          ...(editTeam ? { id: editTeam.id } : {}),
                          name: f.get('name'),
                          manager: f.get('manager'),
                        })
                      ) {
                        form.reset()
                        if (crestFile) {
                          const targetId = teamIdBefore ?? (await fetchTournament()).teams.find((t) => t.name === teamNameValue)?.id
                          if (targetId) await uploadImage('team', targetId, crestFile)
                        }
                      }
                    }}
                  >
                    <label>
                      Nombre del equipo
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={40}
                        defaultValue={editTeam?.name}
                      />
                    </label>
                    <label>
                      Jugador / mánager
                      <input
                        name="manager"
                        required
                        minLength={2}
                        maxLength={40}
                        defaultValue={editTeam?.manager}
                      />
                    </label>
                    <label>
                      Escudo del equipo (PNG, JPG o WebP · máx. 400 KB)
                      <input
                        name="crestFile"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                      />
                    </label>
                    {editTeam?.crestImage && (
                      <div className="image-current">
                        <img src={`/api/media?key=${encodeURIComponent(editTeam.crestImage)}`} alt={`Escudo actual de ${editTeam.name}`} />
                        <button type="button" disabled={busy} onClick={() => void removeImage('team', editTeam.id)}>
                          Quitar escudo
                        </button>
                      </div>
                    )}
                    <button className="primary" disabled={busy}>
                      {editTeam ? 'Guardar equipo' : 'Añadir equipo'}
                    </button>
                    {editTeam && (
                      <button type="button" onClick={() => setEditTeam(null)}>
                        Cancelar edición
                      </button>
                    )}
                  </form>
                  <div className="admin-team-list">
                    {data.teams.map((t) => (
                      <button key={t.id} onClick={() => setEditTeam(t)}>
                        <span className="admin-team-name">
                          <Crest name={t.name} small image={t.crestImage} />
                          {t.name}
                        </span>
                        <span>
                          Editar <ChevronRight size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
                <details>
                  <summary>Jugadores · {data.players.length}</summary>
                  <p>
                    Registra a cada futbolista una sola vez en su equipo para
                    acumular sus estadísticas en todas las competiciones.
                  </p>
                  <form
                    className="admin-form"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.currentTarget
                      const f = new FormData(form)
                      const photoFile = form.querySelector<HTMLInputElement>('input[name="photoFile"]')?.files?.[0]
                      const playerIdBefore = editPlayer?.id ?? null
                      const playerTeamId = Number(f.get('teamId'))
                      const playerNameValue = String(f.get('playerName')).trim()
                      const payload = editPlayer
                        ? { action: 'editPlayer', id: editPlayer.id, teamId: playerTeamId, name: f.get('playerName') }
                        : { action: 'player', teamId: playerTeamId, name: f.get('playerName') }
                      if (await mutate(payload)) {
                        form.reset()
                        if (photoFile) {
                          const targetId = playerIdBefore ?? (await fetchTournament()).players.find((p) => p.name === playerNameValue && p.teamId === playerTeamId)?.id
                          if (targetId) await uploadImage('player', targetId, photoFile)
                        }
                      }
                    }}
                  >
                    <label>
                      Equipo principal
                      <select name="teamId" required defaultValue={editPlayer?.teamId ?? ''} key={editPlayer?.id ?? 'new-player'}>
                        <option value="">Seleccionar equipo</option>
                        {data.teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Nombre del futbolista
                      <input name="playerName" required minLength={2} maxLength={60} defaultValue={editPlayer?.name ?? ''} key={`player-name-${editPlayer?.id ?? 'new'}`} />
                    </label>
                    <label>
                      Foto del jugador (PNG, JPG o WebP · máx. 400 KB)
                      <input
                        name="photoFile"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                      />
                    </label>
                    {editPlayer?.photoImage && (
                      <div className="image-current round">
                        <img src={`/api/media?key=${encodeURIComponent(editPlayer.photoImage)}`} alt={`Foto actual de ${editPlayer.name}`} />
                        <button type="button" disabled={busy} onClick={() => void removeImage('player', editPlayer.id)}>
                          Quitar foto
                        </button>
                      </div>
                    )}
                    <div className="admin-form-actions">
                      <button className="primary" disabled={busy || !data.teams.length}>
                        {editPlayer ? 'Guardar cambios del jugador' : 'Registrar jugador'}
                      </button>
                      {editPlayer && <button type="button" disabled={busy} onClick={() => setEditPlayer(null)}>Cancelar edición</button>}
                    </div>
                  </form>
                  <div className="roster-list">
                    {data.teams.map((t) => (
                      <div key={t.id}>
                        <strong>{t.name}</strong>
                        {data.players.filter((p) => p.teamId === t.id).length ? (
                          <ul className="admin-player-edit-list">
                            {data.players.filter((p) => p.teamId === t.id).map((p) => <li key={p.id}><span><PlayerAvatar name={p.name} image={p.photoImage} small />{p.name}</span><button type="button" onClick={() => setEditPlayer(p)}>Editar</button></li>)}
                          </ul>
                        ) : <p>Sin jugadores registrados.</p>}
                      </div>
                    ))}
                  </div>
                  <div className="panel roster-admin-editor">
                    <h3>Asignación de plantilla por temporada</h3>
                    <p>Modifica la asignación de un jugador para una temporada concreta. Las temporadas anteriores no se cambian automáticamente.</p>
                    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); await mutate({ action: 'updateSeasonRoster', seasonId: Number(f.get('seasonId')), playerId: Number(f.get('rosterPlayerId')), teamId: Number(f.get('rosterTeamId')) }) }}>
                      <label>Temporada<select name="seasonId" required value={rosterEditorSeasonId ?? selectedSeasonId ?? ''} onChange={(event) => setRosterEditorSeasonId(Number(event.target.value))}>{data.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
                      <label>Jugador<select name="rosterPlayerId" required defaultValue=""><option value="">Seleccionar jugador</option>{data.players.filter((player) => data.playerSeasonRosters.some((row) => row.seasonId === (rosterEditorSeasonId ?? selectedSeasonId) && row.playerId === player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
                      <label>Nuevo equipo<select name="rosterTeamId" required defaultValue=""><option value="">Seleccionar equipo</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                      <button className="primary" disabled={busy || !data.seasons.length || !data.players.length || !data.teams.length}>Guardar asignación de temporada</button>
                    </form>
                  </div>
                </details>
                <details>
                  <summary>Noticias · {data.news.length}</summary>
                  <p>
                    Publica titulares con imagen y desarrollo en estilo
                    periodístico. La primera noticia publicada aparece como
                    portada en la sección «Noticias».
                  </p>
                  <form
                    className="admin-form"
                    key={editNews?.id || 'new-news'}
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.currentTarget
                      const f = new FormData(form)
                      const imageFile = form.querySelector<HTMLInputElement>('input[name="newsImage"]')?.files?.[0]
                      const newsIdBefore = editNews?.id ?? null
                      const titleValue = String(f.get('newsTitle')).trim()
                      const payload = editNews
                        ? { action: 'updateNews', id: editNews.id, title: f.get('newsTitle'), body: f.get('newsBody') }
                        : { action: 'createNews', title: f.get('newsTitle'), body: f.get('newsBody') }
                      if (await mutate(payload)) {
                        form.reset()
                        if (imageFile) {
                          const targetId = newsIdBefore ?? (await fetchTournament()).news.filter((item) => item.title === titleValue).sort((a, b) => b.id - a.id)[0]?.id
                          if (targetId) await uploadImage('news', targetId, imageFile)
                        }
                      }
                    }}
                  >
                    <label>
                      Titular
                      <input
                        name="newsTitle"
                        required
                        minLength={3}
                        maxLength={120}
                        defaultValue={editNews?.title}
                        placeholder="Titular de portada…"
                      />
                    </label>
                    <label>
                      Desarrollo de la noticia
                      <textarea
                        name="newsBody"
                        required
                        minLength={10}
                        maxLength={5000}
                        rows={8}
                        defaultValue={editNews?.body}
                        placeholder="Escribe el desarrollo de la noticia…"
                      />
                    </label>
                    <label>
                      Imagen de la noticia (PNG, JPG o WebP · máx. 400 KB)
                      <input
                        name="newsImage"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                      />
                    </label>
                    {editNews?.imageKey && (
                      <div className="image-current">
                        <img src={mediaUrl(editNews.imageKey)} alt={`Imagen actual de ${editNews.title}`} />
                        <button type="button" disabled={busy} onClick={() => void removeImage('news', editNews.id)}>
                          Quitar imagen
                        </button>
                      </div>
                    )}
                    <div className="admin-form-actions">
                      <button className="primary" disabled={busy}>
                        {editNews ? 'Guardar noticia' : 'Publicar noticia'}
                      </button>
                      {editNews && (
                        <button type="button" disabled={busy} onClick={() => setEditNews(null)}>
                          Cancelar edición
                        </button>
                      )}
                    </div>
                  </form>
                  <div className="admin-news-list">
                    {data.news.map((item) => (
                      <div className="admin-news-item" key={item.id}>
                        <div className="admin-news-item-main">
                          {item.imageKey && <img src={mediaUrl(item.imageKey)} alt="" />}
                          <span>
                            <strong>{item.title}</strong>
                            <small>{new Date(item.createdAt).toLocaleString('es')}</small>
                          </span>
                        </div>
                        <span className="admin-news-item-actions">
                          <button type="button" onClick={() => setEditNews(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (window.confirm('¿Eliminar esta noticia? La acción queda registrada en la auditoría.')) void mutate({ action: 'deleteNews', id: item.id })
                            }}
                          >
                            Eliminar
                          </button>
                        </span>
                      </div>
                    ))}
                    {!data.news.length && <p className="setup-note">Todavía no hay noticias publicadas.</p>}
                  </div>
                </details>
                <details>
                  <summary>Calendario de liga</summary>
                  <p>
                    Genera 23 jornadas a una vuelta con los 24 equipos para la temporada
                    actual. Cada temporada conserva su propio calendario.
                  </p>
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      data.teams.length !== 24 ||
                      currentSeasonMatches.some((m) => m.competition === 'liga')
                    }
                    onClick={() => void mutate({ action: 'schedule' })}
                  >
                    Generar 276 partidos
                  </button>
                </details>
                <details>
                  <summary>Copa · clasificación de la temporada anterior</summary>
                  <p>Genera automáticamente los octavos a ida y vuelta con los puestos 1.º–16.º de la Liga anterior. Solo se habilita cuando esa Liga está completa y no hay empates pendientes de resolución manual.</p>
                  <button
                    className="primary"
                    disabled={busy || !previousSeason || currentSeasonMatches.some((match) => match.competition === 'copa')}
                    onClick={() => {
                      if (window.confirm('¿Generar los 16 partidos de octavos de Copa usando la clasificación final de la temporada anterior?')) void mutate({ action: 'generateCup' })
                    }}
                  >
                    Generar octavos de Copa
                  </button>
                  {!previousSeason && <p className="setup-note">Primero debe existir una temporada anterior.</p>}
                  {currentSeasonMatches.some((match) => match.competition === 'copa') && <p className="setup-note">La Copa ya tiene partidos en la temporada actual.</p>}
                </details>
                <details>
                  <summary>Avanzar a la siguiente ronda de Copa</summary>
                  <p>Cuando todos los cruces de la ronda actual estén finalizados, genera automáticamente la siguiente ronda. Los empates globales necesitan una tanda de penaltis registrada en la vuelta.</p>
                  <button
                    className="primary"
                    disabled={busy || !cupNextRound}
                    onClick={() => {
                      if (cupNextRound && window.confirm(`¿Generar los partidos de ${cupNextRound.toLowerCase()} de Copa usando los ganadores de la ronda anterior?`)) void mutate({ action: 'generateNextCupRound' })
                    }}
                  >
                    {cupNextRound ? `Generar ${cupNextRound.toLowerCase()} de Copa` : currentSeasonMatches.some((match) => match.competition === 'copa') ? 'Copa finalizada' : 'Primero genera los octavos'}
                  </button>
                  {currentSeasonMatches.some((match) => match.competition === 'copa') && !cupNextRound && <p className="setup-note">No hay más rondas por generar.</p>}
                </details>
                <details>
                  <summary>Supercopa de la Liga</summary>
                  <p>Cuando la Liga esté completa y la Copa tenga una final resuelta, genera las dos semifinales a ida y vuelta. Si un equipo ocupa más de una plaza, el sistema busca el siguiente equipo disponible en la clasificación para evitar duplicados.</p>
                  <button
                    className="primary"
                    disabled={busy || currentSeasonMatches.some((match) => match.competition === 'supercopa_liga')}
                    onClick={() => {
                      if (window.confirm('¿Generar las dos semifinales de la Supercopa de Liga usando la clasificación final de Liga y los finalistas de Copa?')) void mutate({ action: 'generateSupercopaLiga' })
                    }}
                  >
                    Generar semifinales de Supercopa de Liga
                  </button>
                  {currentSeasonMatches.some((match) => match.competition === 'supercopa_liga') && <p className="setup-note">La Supercopa de Liga ya tiene partidos en esta temporada.</p>}
                  <p>Después de terminar las dos semifinales, puedes generar la final.</p>
                  <button
                    className="primary"
                    disabled={busy || !['Semifinal 1 · Ida', 'Semifinal 1 · Vuelta', 'Semifinal 2 · Ida', 'Semifinal 2 · Vuelta'].every((roundName) => currentSeasonMatches.some((match) => match.competition === 'supercopa_liga' && match.round === roundName)) || currentSeasonMatches.some((match) => match.competition === 'supercopa_liga' && match.round.startsWith('Final · '))}
                    onClick={() => {
                      if (window.confirm('¿Generar la final de Supercopa de Liga con los ganadores de las dos semifinales?')) void mutate({ action: 'generateSupercopaLigaFinal' })
                    }}
                  >
                    Generar final de Supercopa de Liga
                  </button>
                  {currentSeasonMatches.some((match) => match.competition === 'supercopa_liga' && match.round.startsWith('Final · ')) && <p className="setup-note">La final de Supercopa de Liga ya existe.</p>}
                </details>
                <details>
                  <summary>Supercopa de Europa</summary>
                  <p>Genera la final a ida y vuelta entre los campeones de Champions y Europa League. Ambas finales continentales deben estar terminadas; si el global queda empatado, deben estar registrados los penaltis.</p>
                  <button
                    className="primary"
                    disabled={busy || currentSeasonMatches.some((match) => match.competition === 'supercopa_europa')}
                    onClick={() => {
                      if (window.confirm('¿Generar la final de Supercopa de Europa entre los campeones de Champions y Europa League?')) void mutate({ action: 'generateSupercopaEuropa' })
                    }}
                  >
                    Generar final de Supercopa de Europa
                  </button>
                  {currentSeasonMatches.some((match) => match.competition === 'supercopa_europa') && <p className="setup-note">La Supercopa de Europa ya tiene partidos en esta temporada.</p>}
                </details>
                <details>
                  <summary>Publicar partido de cualquier competición</summary>
                  <p>
                    Los partidos nuevos se guardan en la temporada marcada como actual.
                    Consulta la clasificación de esa temporada antes de publicar cruces.
                  </p>
                  <form
                    className="admin-form"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.currentTarget
                      const f = new FormData(form)
                      if (
                        await mutate({
                          action: 'match',
                          competition: f.get('competition'),
                          round: f.get('round'),
                          homeId: Number(f.get('home')),
                          awayId: Number(f.get('away')),
                          scheduledAt: f.get('date')
                            ? new Date(
                                String(f.get('date')) + 'Z',
                              ).toISOString()
                            : null,
                        })
                      )
                        form.reset()
                    }}
                  >
                    <label>
                      Competición
                      <select name="competition">
                        {competitions
                          .filter((c) => c.id !== 'liga')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Fase / jornada
                      <input
                        name="round"
                        required
                        maxLength={40}
                        placeholder="Repechaje, octavos, final…"
                      />
                    </label>
                    <label>
                      Local
                      <select required name="home">
                        <option value="">Seleccionar equipo</option>
                        {data.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Visitante
                      <select required name="away">
                        <option value="">Seleccionar equipo</option>
                        {data.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Fecha y hora (UTC)
                      <input name="date" type="datetime-local" />
                    </label>
                    <button className="primary" disabled={busy}>
                      Publicar partido
                    </button>
                  </form>
                </details>
                <details>
                  <summary>Resultados y fechas</summary>
                  <label className="field-label">
                    Selecciona un partido
                    <select
                      value={editing?.id || ''}
                      onChange={(e) =>
                        setEditing(
                          seasonMatches.find(
                            (m) => m.id === Number(e.target.value),
                          ) || null,
                        )
                      }
                    >
                      <option value="">Seleccionar…</option>
                      {seasonMatches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.competition} · {m.round} · {teamName(m.homeId)} vs{' '}
                          {teamName(m.awayId)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {editing && (
                    <MatchResultEditor
                      key={editing.id}
                      match={editing}
                      data={data}
                      busy={busy}
                      mutate={mutate}
                    />
                  )}
                </details>
              </>
            )}
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            {user && !isAdmin && (
              <button
                onClick={async () => {
                  await logout()
                  setUser(null)
                }}
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Shield size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function NewsPanel({ news, isAdmin }: { news: News[]; isAdmin: boolean }) {
  const today = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const articleDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  const paragraphs = (text: string) =>
    text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const [featured, ...rest] = news
  if (!featured) {
    return (
      <Empty
        title="El periódico aún no tiene portada"
        text="Cuando la organización publique la primera noticia, aparecerá aquí con su titular, imagen y desarrollo."
      />
    )
  }
  return (
    <div className="news-paper">
      <div className="news-masthead">
        <span className="news-kicker">Boletín oficial de la liga</span>
        <h2>NOTICIAS UFL</h2>
        <span className="news-masthead-date">{today}</span>
      </div>
      {isAdmin && (
        <p className="news-admin-hint">
          Para publicar, editar o eliminar noticias, abre el acceso de
          administración al pie de la página.
        </p>
      )}
      <article className="news-article news-featured">
        {featured.imageKey && (
          <img
            className="news-photo"
            src={mediaUrl(featured.imageKey)}
            alt=""
          />
        )}
        <div className="news-article-text">
          <p className="news-dateline">
            Portada · {articleDate(featured.createdAt)} · Redacción UFL
          </p>
          <h3 className="news-headline">{featured.title}</h3>
          <div className="news-body">
            {paragraphs(featured.body).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </article>
      {rest.length > 0 && (
        <div className="news-rest-grid">
          {rest.map((item) => (
            <article className="news-article news-item" key={item.id}>
              {item.imageKey && (
                <img className="news-photo" src={mediaUrl(item.imageKey)} alt="" />
              )}
              <p className="news-dateline">{articleDate(item.createdAt)}</p>
              <h4>{item.title}</h4>
              <div className="news-body">
                {paragraphs(item.body).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}


function HallOfFamePanel({
  record,
  players,
  teams,
  isAdmin,
  seasonId,
  busy,
  onSave,
}: {
  record: { awards: Record<string, unknown>; ballonDorPlayerId: number | null; startingXi: number[]; substitutes: number[] } | undefined
  players: { id: number; name: string; teamId: number }[]
  teams: { id: number; name: string }[]
  isAdmin: boolean
  seasonId: number | null
  busy: boolean
  onSave: (payload: { action: string; seasonId: number; awards: Record<string, unknown>; ballonDorPlayerId: number | null; startingXi: number[]; substitutes: number[] }) => Promise<boolean>
}) {
  const [ballonDor, setBallonDor] = useState(record?.ballonDorPlayerId ? String(record.ballonDorPlayerId) : '')
  const [startingXi, setStartingXi] = useState<number[]>(record?.startingXi ?? [])
  const [substitutes, setSubstitutes] = useState<number[]>(record?.substitutes ?? [])
  const playerName = (id: number | null) => {
    if (id === null) return 'Pendiente de selección'
    const player = players.find((item) => item.id === id)
    if (!player) return 'Jugador no disponible'
    const team = teams.find((item) => item.id === player.teamId)
    return team ? `${player.name} · ${team.name}` : player.name
  }
  const options = [...players].sort((a, b) => a.name.localeCompare(b.name))
  const awardLabels: Record<string, string> = {
    leagueChampion: 'Campeón de Liga', leagueRunnerUp: 'Subcampeón de Liga',
    cupChampion: 'Campeón de Copa', leagueSuperCupChampion: 'Campeón de Supercopa de Liga',
    europeSuperCupChampion: 'Campeón de Supercopa de Europa', championsChampion: 'Campeón de Champions League',
    europaChampion: 'Campeón de Europa League', goldenBoot: 'Bota de Oro',
  }
  const formatAward = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'Pendiente'
    if (typeof value === 'number') {
      const player = players.find((item) => item.id === value)
      const team = player && teams.find((item) => item.id === player.teamId)
      return player ? `${player.name}${team ? ` · ${team.name}` : ''}` : String(value)
    }
    if (Array.isArray(value)) return value.map((item) => formatAward(item)).join(', ')
    if (typeof value === 'object') {
      const award = value as Record<string, unknown>
      if (typeof award.playerName === 'string' && typeof award.goals === 'number') return `${award.playerName} (${award.goals} goles)`
      return JSON.stringify(value)
    }
    return String(value)
  }
  const playerSelect = (label: string, values: number[], setValues: (value: number[]) => void, max: number) => (
    <label className="hall-admin-field">
      <span>{label} ({values.length}/{max})</span>
      <select multiple value={values.map(String)} onChange={(event) => {
        const selected = Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value))
        if (selected.length <= max) setValues(selected)
      }} size={Math.min(8, Math.max(4, options.length))}>
        {options.map((player) => <option key={player.id} value={player.id}>{player.name} — {teams.find((team) => team.id === player.teamId)?.name ?? 'Sin equipo'}</option>)}
      </select>
      <small>Mantén pulsada la tecla Ctrl (o ⌘ en Mac) para seleccionar varios jugadores.</small>
    </label>
  )
  return (
    <div className="hall-of-fame-content">
      <section className="hall-awards panel">
        <div className="panel-heading"><h3><Trophy size={20} /> Palmarés de la temporada</h3><span className="tag">HISTÓRICO GUARDADO</span></div>
        {record && Object.keys(record.awards || {}).length ? (
          <div className="hall-awards-grid">
            {Object.entries(record.awards).map(([key, value]) => <article className="hall-award" key={key}><span className="hall-award-icon"><Trophy size={19} /></span><div><span className="eyebrow">{awardLabels[key] || key}</span><strong>{formatAward(value)}</strong></div></article>)}
          </div>
        ) : <p className="hall-empty-note">Los premios automáticos aún no se han guardado para esta temporada.</p>}
        <div className="hall-special-award"><span className="eyebrow">BALÓN DE ORO</span><strong>{playerName(record?.ballonDorPlayerId ?? null)}</strong></div>
      </section>
      <section className="hall-xi-grid">
        <div className="panel"><h3>XI ideal · Titulares</h3><ol className="hall-player-list">{(record?.startingXi ?? []).map((id) => <li key={id}>{playerName(id)}</li>)}</ol>{(record?.startingXi ?? []).length !== 11 && <p className="hall-empty-note">Selección incompleta: hay {(record?.startingXi ?? []).length} de 11 titulares.</p>}</div>
        <div className="panel"><h3>XI ideal · Suplentes</h3><ol className="hall-player-list">{(record?.substitutes ?? []).map((id) => <li key={id}>{playerName(id)}</li>)}</ol>{(record?.substitutes ?? []).length !== 7 && <p className="hall-empty-note">Selección incompleta: hay {(record?.substitutes ?? []).length} de 7 suplentes.</p>}</div>
      </section>
      {isAdmin && <section className="panel hall-admin-editor">
        <div className="panel-heading"><h3>Administrar premios históricos</h3><span className="tag">SOLO ADMIN</span></div>
        <p>Calcula campeones y Bota de Oro con los resultados y estadísticas guardados de esta temporada. Si faltan datos o no se puede resolver un empate, ese premio queda pendiente y se conserva el último valor histórico guardado. El cálculo no borra el Balón de Oro ni el XI ideal.</p>
        <button type="button" disabled={busy || seasonId === null} onClick={() => { if (seasonId !== null) void onSave({ action: 'calculateHallOfFame', seasonId, awards: {}, ballonDorPlayerId: null, startingXi: [], substitutes: [] }) }}>{busy ? 'Calculando…' : 'Calcular y guardar premios automáticos'}</button>
        <label className="hall-admin-field"><span>Balón de Oro</span><select value={ballonDor} onChange={(event) => setBallonDor(event.target.value)}><option value="">Pendiente de selección</option>{options.map((player) => <option key={player.id} value={player.id}>{player.name} — {teams.find((team) => team.id === player.teamId)?.name ?? 'Sin equipo'}</option>)}</select></label>
        {playerSelect('Titulares', startingXi, setStartingXi, 11)}
        {playerSelect('Suplentes', substitutes, setSubstitutes, 7)}
        <p className="hall-empty-note">Para guardar, selecciona exactamente 11 titulares y 7 suplentes, sin repetir jugadores.</p>
        <button type="button" disabled={busy || seasonId === null || startingXi.length !== 11 || substitutes.length !== 7 || new Set([...startingXi, ...substitutes]).size !== 18} onClick={() => { if (seasonId === null) return; void onSave({ action: 'saveHallOfFame', seasonId, awards: record?.awards ?? {}, ballonDorPlayerId: ballonDor ? Number(ballonDor) : null, startingXi, substitutes }) }}> {busy ? 'Guardando…' : 'Guardar selección histórica'} </button>
      </section>}
    </div>
  )
}



function TeamStatisticsPanel({ teams, seasons, matches, selectedSeasonId }: {
  teams: Team[]
  seasons: Season[]
  matches: Match[]
  selectedSeasonId: number | null
}) {
  const [seasonFilter, setSeasonFilter] = useState(selectedSeasonId === null ? 'all' : String(selectedSeasonId))
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')

  const completed = matches.filter((match) =>
    match.homeScore !== null && match.awayScore !== null &&
    (seasonFilter === 'all' || match.seasonId === Number(seasonFilter)) &&
    (competitionFilter === 'all' || match.competition === competitionFilter),
  )
  const seasonName = seasonFilter === 'all' ? 'Todas las temporadas' : seasons.find((season) => season.id === Number(seasonFilter))?.name ?? 'Temporada seleccionada'
  const competitionName = competitionFilter === 'all' ? 'Todas las competiciones' : competitions.find((competition) => competition.id === competitionFilter)?.name ?? competitionFilter
  const teamRows = teams.map((team) => {
    const played = completed.filter((match) => match.homeId === team.id || match.awayId === team.id)
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, points = 0
    for (const match of played) {
      const isHome = match.homeId === team.id
      const scored = isHome ? match.homeScore! : match.awayScore!
      const conceded = isHome ? match.awayScore! : match.homeScore!
      goalsFor += scored
      goalsAgainst += conceded
      if (scored > conceded) { wins += 1; points += 3 }
      else if (scored === conceded) { draws += 1; points += 1 }
      else losses += 1
    }
    return { team, played: played.length, wins, draws, losses, goalsFor, goalsAgainst, difference: goalsFor - goalsAgainst, points, winRate: played.length ? Math.round(wins / played.length * 1000) / 10 : 0 }
  }).sort((a, b) => b.points - a.points || b.difference - a.difference || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name))
  const chosenHomeId = homeTeamId ? Number(homeTeamId) : teams[0]?.id
  const requestedAwayId = awayTeamId ? Number(awayTeamId) : undefined
  const chosenAwayId = requestedAwayId !== undefined && requestedAwayId !== chosenHomeId
    ? requestedAwayId
    : teams.find((team) => team.id !== chosenHomeId)?.id
  const headToHead = completed.filter((match) =>
    chosenHomeId !== undefined && chosenAwayId !== undefined &&
    ((match.homeId === chosenHomeId && match.awayId === chosenAwayId) || (match.homeId === chosenAwayId && match.awayId === chosenHomeId)),
  ).sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? '') || b.id - a.id)
  const homeTeam = teams.find((team) => team.id === chosenHomeId)
  const awayTeam = teams.find((team) => team.id === chosenAwayId)
  const summary = (teamId: number | undefined) => {
    const row = teamRows.find((item) => item.team.id === teamId)
    return row ? `${row.wins} victorias · ${row.draws} empates · ${row.losses} derrotas` : 'Sin datos'
  }

  return <section className="panel team-statistics-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Estadísticas de equipos</h2><p className="stats-intro">Rendimiento calculado a partir de resultados guardados en partidos finalizados. Los puntos se calculan con el sistema habitual de 3 por victoria y 1 por empate.</p></div><span className="tag">{completed.length} partidos finalizados</span></div>
    <div className="team-stat-filters">
      <label className="player-stat-filter">Temporada<select aria-label="Temporada de estadísticas de equipos" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a,b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id-a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
      <label className="player-stat-filter">Competición<select aria-label="Competición de estadísticas de equipos" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></label>
    </div>
    <div className="team-stat-summary-grid"><div><span>Partidos</span><strong>{completed.length}</strong></div><div><span>Goles</span><strong>{completed.reduce((sum, match) => sum + match.homeScore! + match.awayScore!, 0)}</strong></div><div><span>Equipos con partidos</span><strong>{teamRows.filter((row) => row.played > 0).length}</strong></div></div>
    <div className="section-heading team-stat-table-heading"><div><h3>Tabla de rendimiento</h3><p className="stats-intro">{seasonName} · {competitionName}. Orden: puntos, diferencia de goles, goles a favor y nombre.</p></div><span className="tag">{teamRows.filter((row) => row.played > 0).length} equipos activos</span></div>
    {teamRows.some((row) => row.played > 0) ? <div className="ranking-scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">G</th><th scope="col">E</th><th scope="col">P</th><th scope="col">GF</th><th scope="col">GC</th><th scope="col">DG</th><th scope="col">Pts</th><th scope="col">% victorias</th></tr></thead><tbody>{teamRows.filter((row) => row.played > 0).map((row, index) => <tr key={row.team.id}><td>{index + 1}</td><th scope="row">{row.team.name}</th><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.difference > 0 ? `+${row.difference}` : row.difference}</td><td><strong>{row.points}</strong></td><td>{row.winRate.toFixed(1)}%</td></tr>)}</tbody></table></div> : <Empty title="Todavía no hay resultados" text="Cuando se registren resultados de partidos finalizados, aparecerán aquí las estadísticas de los equipos." />}
    <div className="team-head-to-head"><div className="section-heading"><div><h3>Historial de enfrentamientos</h3><p className="stats-intro">Consulta los duelos directos dentro del periodo y la competición seleccionados.</p></div></div>
      <div className="team-stat-filters"><label className="player-stat-filter">Equipo A<select aria-label="Primer equipo del enfrentamiento" value={chosenHomeId ?? ''} onChange={(event) => setHomeTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="player-stat-filter">Equipo B<select aria-label="Segundo equipo del enfrentamiento" value={chosenAwayId ?? ''} onChange={(event) => setAwayTeamId(event.target.value)}>{teams.filter((team) => team.id !== chosenHomeId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>
      {homeTeam && awayTeam && <p className="team-head-to-head-summary"><strong>{homeTeam.name}:</strong> {summary(homeTeam.id)} <span>·</span> <strong>{awayTeam.name}:</strong> {summary(awayTeam.id)}</p>}
      {headToHead.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Fecha</th><th scope="col">Competición</th><th scope="col">Local</th><th scope="col">Resultado</th><th scope="col">Visitante</th></tr></thead><tbody>{headToHead.map((match) => <tr key={match.id}><td>{match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString() : 'Sin fecha'}</td><td>{competitions.find((item) => item.id === match.competition)?.name ?? match.competition}</td><td>{teams.find((team) => team.id === match.homeId)?.name ?? 'Equipo'}</td><td><strong>{match.homeScore} – {match.awayScore}</strong></td><td>{teams.find((team) => team.id === match.awayId)?.name ?? 'Equipo'}</td></tr>)}</tbody></table></div> : <Empty title="Sin enfrentamientos registrados" text="No hay partidos finalizados entre estos equipos con los filtros actuales." />}
    </div>
    <p className="stats-intro team-stat-note">Esta tabla es una comparación estadística general, no sustituye la clasificación oficial de una competición. Al combinar todas las competiciones, los resultados de torneos distintos se suman deliberadamente. Los títulos no se estiman: se muestran aquí únicamente métricas derivadas de resultados existentes.</p>
  </section>
}


/** Fase 51: comparación de rendimiento entre dos equipos. */
function TeamComparisonPanel({ teams, seasons, matches, selectedSeasonId }: {
  teams: Team[]
  seasons: Season[]
  matches: Match[]
  selectedSeasonId: number | null
}) {
  const [teamAValue, setTeamAValue] = useState('')
  const [teamBValue, setTeamBValue] = useState('')
  const [seasonFilter, setSeasonFilter] = useState(selectedSeasonId === null ? 'all' : String(selectedSeasonId))
  const [competitionFilter, setCompetitionFilter] = useState('all')

  const teamAId = teamAValue ? Number(teamAValue) : teams[0]?.id
  const teamBRequested = teamBValue ? Number(teamBValue) : undefined
  const teamBId = teamBRequested !== undefined && teamBRequested !== teamAId
    ? teamBRequested
    : teams.find((team) => team.id !== teamAId)?.id
  const teamA = teams.find((team) => team.id === teamAId)
  const teamB = teams.find((team) => team.id === teamBId)
  const completed = matches.filter((match) =>
    match.homeScore !== null && match.awayScore !== null &&
    (seasonFilter === 'all' || match.seasonId === Number(seasonFilter)) &&
    (competitionFilter === 'all' || match.competition === competitionFilter),
  )
  const matchesForTeam = (teamId: number, venue: 'all' | 'home' | 'away') => completed.filter((match) =>
    venue === 'all' ? match.homeId === teamId || match.awayId === teamId
      : venue === 'home' ? match.homeId === teamId : match.awayId === teamId,
  )
  const calculate = (teamId: number, venue: 'all' | 'home' | 'away') => {
    const played = matchesForTeam(teamId, venue)
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, points = 0
    for (const match of played) {
      const isHome = match.homeId === teamId
      const scored = isHome ? match.homeScore! : match.awayScore!
      const conceded = isHome ? match.awayScore! : match.homeScore!
      goalsFor += scored
      goalsAgainst += conceded
      if (scored > conceded) { wins += 1; points += 3 }
      else if (scored === conceded) { draws += 1; points += 1 }
      else losses += 1
    }
    return {
      played: played.length, wins, draws, losses, goalsFor, goalsAgainst,
      difference: goalsFor - goalsAgainst, points,
      winRate: played.length ? Math.round(wins / played.length * 1000) / 10 : 0,
      goalsPerMatch: played.length ? (goalsFor / played.length).toFixed(2) : '—',
      recent: [...played].sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? '') || b.id - a.id).slice(0, 5),
    }
  }
  const statsA = teamA ? calculate(teamA.id, 'all') : null
  const statsB = teamB ? calculate(teamB.id, 'all') : null
  const homeA = teamA ? calculate(teamA.id, 'home') : null
  const awayA = teamA ? calculate(teamA.id, 'away') : null
  const homeB = teamB ? calculate(teamB.id, 'home') : null
  const awayB = teamB ? calculate(teamB.id, 'away') : null
  const directMatches = teamA && teamB ? completed.filter((match) =>
    (match.homeId === teamA.id && match.awayId === teamB.id) ||
    (match.homeId === teamB.id && match.awayId === teamA.id),
  ).sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? '') || b.id - a.id) : []
  const directSummary = (teamId: number) => {
    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
    for (const match of directMatches) {
      const isHome = match.homeId === teamId
      const scored = isHome ? match.homeScore! : match.awayScore!
      const conceded = isHome ? match.awayScore! : match.homeScore!
      gf += scored; ga += conceded
      if (scored > conceded) wins += 1
      else if (scored === conceded) draws += 1
      else losses += 1
    }
    return { wins, draws, losses, gf, ga }
  }
  const aDirect = teamA ? directSummary(teamA.id) : null
  const bDirect = teamB ? directSummary(teamB.id) : null
  const seasonLabel = seasonFilter === 'all' ? 'Todas las temporadas' : seasons.find((season) => season.id === Number(seasonFilter))?.name ?? 'Temporada seleccionada'
  const competitionLabel = competitionFilter === 'all' ? 'Todas las competiciones' : competitions.find((item) => item.id === competitionFilter)?.name ?? competitionFilter
  const formatDifference = (value: number) => value > 0 ? `+${value}` : String(value)
  const metrics: Array<{ label: string; a: string | number; b: string | number }> = statsA && statsB ? [
    { label: 'Partidos jugados', a: statsA.played, b: statsB.played },
    { label: 'Victorias', a: statsA.wins, b: statsB.wins },
    { label: 'Empates', a: statsA.draws, b: statsB.draws },
    { label: 'Derrotas', a: statsA.losses, b: statsB.losses },
    { label: 'Goles a favor', a: statsA.goalsFor, b: statsB.goalsFor },
    { label: 'Goles en contra', a: statsA.goalsAgainst, b: statsB.goalsAgainst },
    { label: 'Diferencia de goles', a: formatDifference(statsA.difference), b: formatDifference(statsB.difference) },
    { label: 'Puntos (3/1/0)', a: statsA.points, b: statsB.points },
    { label: 'Porcentaje de victorias', a: `${statsA.winRate.toFixed(1)}%`, b: `${statsB.winRate.toFixed(1)}%` },
    { label: 'Goles por partido', a: statsA.goalsPerMatch, b: statsB.goalsPerMatch },
  ] : []

  return <section className="panel team-comparison-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Comparar equipos</h2><p className="stats-intro">Compara resultados, rendimiento local y visitante y enfrentamientos directos. Solo se usan partidos finalizados; los títulos no se deducen de estas estadísticas.</p></div><span className="tag">{completed.length} partidos en el periodo</span></div>
    <div className="team-comparison-filters">
      <label>Equipo A<select aria-label="Equipo A para comparar" value={teamA?.id ?? ''} onChange={(event) => setTeamAValue(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Equipo B<select aria-label="Equipo B para comparar" value={teamB?.id ?? ''} onChange={(event) => setTeamBValue(event.target.value)}>{teams.filter((team) => team.id !== teamA?.id).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Temporada<select aria-label="Temporada de comparación de equipos" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
      <label>Competición<select aria-label="Competición de comparación de equipos" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <p className="stats-intro team-comparison-period">Periodo: <strong>{seasonLabel}</strong> · <strong>{competitionLabel}</strong></p>
    {teamA && teamB && statsA && statsB ? <>
      <div className="team-comparison-headings"><article><span className="eyebrow">EQUIPO A</span><h3>{teamA.name}</h3><p>{statsA.played} PJ · {statsA.points} puntos</p></article><span className="team-comparison-vs">VS</span><article><span className="eyebrow">EQUIPO B</span><h3>{teamB.name}</h3><p>{statsB.played} PJ · {statsB.points} puntos</p></article></div>
      <div className="ranking-scroll"><table className="team-comparison-table"><thead><tr><th scope="col">Métrica</th><th scope="col">{teamA.name}</th><th scope="col">{teamB.name}</th></tr></thead><tbody>{metrics.map((metric) => <tr key={metric.label}><th scope="row">{metric.label}</th><td>{metric.a}</td><td>{metric.b}</td></tr>)}</tbody></table></div>
      <div className="team-comparison-splits"><section><h3>Como local</h3><p><strong>{teamA.name}:</strong> {homeA?.played} PJ · {homeA?.wins} G · {homeA?.draws} E · {homeA?.losses} P · {homeA?.goalsFor} GF / {homeA?.goalsAgainst} GC</p><p><strong>{teamB.name}:</strong> {homeB?.played} PJ · {homeB?.wins} G · {homeB?.draws} E · {homeB?.losses} P · {homeB?.goalsFor} GF / {homeB?.goalsAgainst} GC</p></section><section><h3>Como visitante</h3><p><strong>{teamA.name}:</strong> {awayA?.played} PJ · {awayA?.wins} G · {awayA?.draws} E · {awayA?.losses} P · {awayA?.goalsFor} GF / {awayA?.goalsAgainst} GC</p><p><strong>{teamB.name}:</strong> {awayB?.played} PJ · {awayB?.wins} G · {awayB?.draws} E · {awayB?.losses} P · {awayB?.goalsFor} GF / {awayB?.goalsAgainst} GC</p></section></div>
      <section className="team-comparison-direct"><div className="section-heading"><div><h3>Enfrentamientos directos</h3><p className="stats-intro">{directMatches.length} partido(s) finalizado(s) entre ambos equipos dentro del periodo elegido.</p></div></div><div className="team-comparison-direct-summary"><p><strong>{teamA.name}:</strong> {aDirect?.wins} victorias · {aDirect?.draws} empates · {aDirect?.losses} derrotas · {aDirect?.gf} GF / {aDirect?.ga} GC</p><p><strong>{teamB.name}:</strong> {bDirect?.wins} victorias · {bDirect?.draws} empates · {bDirect?.losses} derrotas · {bDirect?.gf} GF / {bDirect?.ga} GC</p></div>{directMatches.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Fecha</th><th scope="col">Competición</th><th scope="col">Local</th><th scope="col">Resultado</th><th scope="col">Visitante</th></tr></thead><tbody>{directMatches.map((match) => <tr key={match.id}><td>{match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString() : 'Sin fecha'}</td><td>{competitions.find((item) => item.id === match.competition)?.name ?? match.competition}</td><td>{teams.find((team) => team.id === match.homeId)?.name ?? 'Equipo'}</td><td><strong>{match.homeScore} – {match.awayScore}</strong></td><td>{teams.find((team) => team.id === match.awayId)?.name ?? 'Equipo'}</td></tr>)}</tbody></table></div> : <Empty title="Sin enfrentamientos directos" text="No hay partidos finalizados entre estos equipos con los filtros actuales." />}</section>
      <div className="team-comparison-recent-grid"><section><h3>Últimos partidos · {teamA.name}</h3>{statsA.recent.length ? <ol>{statsA.recent.map((match) => <li key={match.id}>{teams.find((team) => team.id === match.homeId)?.name ?? 'Equipo'} <strong>{match.homeScore} – {match.awayScore}</strong> {teams.find((team) => team.id === match.awayId)?.name ?? 'Equipo'} <small>{competitions.find((item) => item.id === match.competition)?.name ?? match.competition}</small></li>)}</ol> : <p className="stats-intro">Sin resultados disponibles.</p>}</section><section><h3>Últimos partidos · {teamB.name}</h3>{statsB.recent.length ? <ol>{statsB.recent.map((match) => <li key={match.id}>{teams.find((team) => team.id === match.homeId)?.name ?? 'Equipo'} <strong>{match.homeScore} – {match.awayScore}</strong> {teams.find((team) => team.id === match.awayId)?.name ?? 'Equipo'} <small>{competitions.find((item) => item.id === match.competition)?.name ?? match.competition}</small></li>)}</ol> : <p className="stats-intro">Sin resultados disponibles.</p>}</section></div>
    </> : <Empty title="Se necesitan dos equipos" text="Añade al menos dos equipos para comparar sus resultados." />}
    <p className="stats-intro team-comparison-footnote">La comparación resume los resultados almacenados, no predice futuros partidos ni determina campeones. Si se seleccionan todas las competiciones, los resultados de torneos distintos se agregan de forma intencionada.</p>
  </section>
}


/** Fase 54: comparación local de escenarios y rangos de puntos. */
function ClassificationScenarioPanel({ teams, seasons, matches, selectedSeasonId }: {
  teams: Team[]
  seasons: Season[]
  matches: Match[]
  selectedSeasonId: number | null
}) {
  const [seasonFilter, setSeasonFilter] = useState(selectedSeasonId === null ? '' : String(selectedSeasonId))
  const [activeScenario, setActiveScenario] = useState<'A' | 'B'>('A')
  const [objectiveTeamId, setObjectiveTeamId] = useState('')
  const [objectivePosition, setObjectivePosition] = useState('1')
  const [comparisonPosition, setComparisonPosition] = useState('4')
  const [comparisonTeamIds, setComparisonTeamIds] = useState<string[]>([])
  const [combinationMatchIds, setCombinationMatchIds] = useState<number[]>([])
  const [predictionsByScenario, setPredictionsByScenario] = useState<Record<'A' | 'B', Record<number, { home: string; away: string }>>>({ A: {}, B: {} })
  const [snapshotName, setSnapshotName] = useState('')
  const [scenarioTransferMessage, setScenarioTransferMessage] = useState('')
  const [savedSnapshots, setSavedSnapshots] = useState<ClassificationScenarioSnapshot[]>(() =>
    seasonFilter === '' ? [] : loadScenariosFromStorage(Number(seasonFilter)))
  const [referenceSnapshotId, setReferenceSnapshotId] = useState('')
  const [comparisonSnapshotIds, setComparisonSnapshotIds] = useState<string[]>([])

  const seasonId = seasonFilter === '' ? null : Number(seasonFilter)

  // Fase 62: los escenarios se cargan al seleccionar temporada (montaje o cambio del selector),
  // nunca durante un render intermedio, para no escribir la temporada equivocada.
  const changeScenarioSeason = (value: string) => {
    setSeasonFilter(value)
    setPredictionsByScenario({ A: {}, B: {} })
    setObjectiveTeamId('')
    setComparisonTeamIds([])
    setCombinationMatchIds([])
    setReferenceSnapshotId('')
    setComparisonSnapshotIds([])
    setSavedSnapshots(value === '' ? [] : loadScenariosFromStorage(Number(value)))
  }

  useEffect(() => {
    if (seasonId === null) return
    saveScenariosToStorage(seasonId, savedSnapshots.filter((snapshot) => snapshot.seasonId === seasonId))
  }, [seasonId, savedSnapshots])

  const season = seasons.find((item) => item.id === seasonId)
  const seasonMatches = matches.filter((match) => match.seasonId === seasonId && match.competition === 'liga')
  const completed = seasonMatches.filter((match) => match.homeScore !== null && match.awayScore !== null)
  const pending = seasonMatches.filter((match) => match.homeScore === null && match.awayScore === null)
    .sort((a, b) => (a.round ?? '').localeCompare(b.round ?? '', 'es', { numeric: true }) || (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '') || a.id - b.id)
  const incomplete = seasonMatches.filter((match) => (match.homeScore === null) !== (match.awayScore === null))
  const teamName = (id: number) => teams.find((team) => team.id === id)?.name ?? `Equipo ${id}`
  const validScore = (value: string) => value.trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 20
  const getPredictedMatches = (predictions: Record<number, { home: string; away: string }>) => pending.filter((match) => {
    const prediction = predictions[match.id]
    return Boolean(prediction && validScore(prediction.home) && validScore(prediction.away))
  })
  const buildTable = (predictions: Record<number, { home: string; away: string }>) => {
    const predictedMatches = getPredictedMatches(predictions)
    const rows = teams.map((team) => ({ team, actualPlayed: 0, predictedPlayed: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }))
    const byId = new Map(rows.map((row) => [row.team.id, row]))
    const applyResult = (homeId: number, awayId: number, homeScore: number, awayScore: number, simulated: boolean) => {
      const home = byId.get(homeId), away = byId.get(awayId)
      if (!home || !away) return
      home.played += 1; away.played += 1
      if (simulated) { home.predictedPlayed += 1; away.predictedPlayed += 1 }
      else { home.actualPlayed += 1; away.actualPlayed += 1 }
      home.goalsFor += homeScore; home.goalsAgainst += awayScore
      away.goalsFor += awayScore; away.goalsAgainst += homeScore
      if (homeScore > awayScore) { home.wins += 1; home.points += 3; away.losses += 1 }
      else if (homeScore < awayScore) { away.wins += 1; away.points += 3; home.losses += 1 }
      else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1 }
    }
    for (const match of completed) applyResult(match.homeId, match.awayId, match.homeScore!, match.awayScore!, false)
    for (const match of predictedMatches) {
      const prediction = predictions[match.id]!
      applyResult(match.homeId, match.awayId, Number(prediction.home), Number(prediction.away), true)
    }
    const table = [...rows].filter((row) => row.played > 0 || seasonMatches.length > 0)
      .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name, 'es'))
    return { table, predictedMatches }
  }
  const scenarioA = buildTable(predictionsByScenario.A)
  const scenarioB = buildTable(predictionsByScenario.B)
  const currentPredictions = predictionsByScenario[activeScenario]
  const currentScenario = activeScenario === 'A' ? scenarioA : scenarioB
  const unpredicted = pending.length - currentScenario.predictedMatches.length
  const saveCurrentSnapshot = () => {
    if (!season || seasonId === null) return
    const name = snapshotName.trim() || `Escenario ${activeScenario} · ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    const snapshot = {
      id: createSnapshotId(), name, seasonId: season.id, scenario: activeScenario,
      predictions: { ...currentPredictions },
      rows: currentScenario.table.map((row, index) => ({ teamId: row.team.id, teamName: row.team.name, position: index + 1, points: row.points, predictedMatches: row.predictedPlayed })),
      createdAt: new Date().toLocaleString('es'),
    }
    setSavedSnapshots((current) => [...current, snapshot].filter((item) => item.seasonId === seasonId).slice(-MAX_SCENARIOS_PER_SEASON))
    setReferenceSnapshotId(String(snapshot.id))
    setComparisonSnapshotIds((current) => [...current.filter((id) => id !== String(snapshot.id)), String(snapshot.id)].slice(-4))
    setSnapshotName('')
  }

  const exportSavedScenarios = () => {
    if (seasonId === null) return
    const seasonSnapshotsToExport = savedSnapshots.filter((item) => item.seasonId === seasonId)
    const bundle = exportScenarioBundle(seasonSnapshotsToExport, seasonId, import.meta.env.VITE_APP_VERSION ?? 'unknown')
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ufl-escenarios-temporada-${seasonId}.json`
    link.click()
    URL.revokeObjectURL(url)
    setScenarioTransferMessage(`Exportados ${bundle.scenarios.length} escenario(s) de esta temporada.`)
  }

  const importScenarioFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || seasonId === null) return

    if (file.size > 2 * 1024 * 1024) {
      setScenarioTransferMessage('El archivo supera el límite de 2 MB.')
      return
    }

    try {
      const input: unknown = JSON.parse(await file.text())
      const validation = validateScenarioBundle(input, seasonId)
      if (!validation.ok) {
        setScenarioTransferMessage(validation.error)
        return
      }

      const signatures = new Set(savedSnapshots.map(getScenarioImportSignature))
      const uniqueImports = validation.scenarios.filter((item) => {
        const signature = getScenarioImportSignature(item)
        if (signatures.has(signature)) return false
        signatures.add(signature)
        return true
      })
      const nextId = Math.max(Date.now(), ...savedSnapshots.map((item) => item.id + 1))
      const importedSnapshots = uniqueImports.map((item, index) => ({ ...item, id: nextId + index, seasonId }))
      const mergedSnapshots = [...savedSnapshots, ...importedSnapshots].slice(-MAX_SCENARIOS_PER_SEASON)
      const droppedCount = Math.max(0, savedSnapshots.length + importedSnapshots.length - MAX_SCENARIOS_PER_SEASON)

      setSavedSnapshots(mergedSnapshots)
      setReferenceSnapshotId(importedSnapshots.length ? String(mergedSnapshots[mergedSnapshots.length - 1]?.id ?? '') : referenceSnapshotId)
      setComparisonSnapshotIds((current) => [
        ...current.filter((id) => mergedSnapshots.some((item) => String(item.id) === id)),
        ...importedSnapshots.map((item) => String(item.id)),
      ].slice(-4))

      const details = [
        `${importedSnapshots.length} escenario(s) importado(s)`,
        uniqueImports.length < validation.scenarios.length ? `${validation.scenarios.length - uniqueImports.length} duplicado(s) omitido(s)` : '',
        droppedCount ? `se eliminaron ${droppedCount} escenario(s) antiguo(s) por el límite de ocho` : '',
        validation.warning ?? '',
      ].filter(Boolean).join('; ')
      setScenarioTransferMessage(details || 'No había escenarios nuevos para importar.')
    } catch (error) {
      console.error('No se pudo importar el paquete de escenarios:', error)
      setScenarioTransferMessage('No se pudo leer el archivo JSON. Comprueba que no esté dañado.')
    }
  }

  const referenceSnapshot = savedSnapshots.find((snapshot) => String(snapshot.id) === referenceSnapshotId && snapshot.seasonId === seasonId)
  const referenceRowsByTeam = new Map((referenceSnapshot?.rows ?? []).map((row) => [row.teamId, row]))
  const seasonSnapshots = savedSnapshots.filter((item) => item.seasonId === seasonId)
  const selectedSnapshots = comparisonSnapshotIds.map((id) => seasonSnapshots.find((item) => String(item.id) === id)).filter((item): item is typeof seasonSnapshots[number] => Boolean(item))
  const multiSnapshotTeamRows = teams.map((team) => {
    const teamRows = selectedSnapshots.map((snapshot) => ({ snapshot, row: snapshot.rows.find((row) => row.teamId === team.id) })).filter((item): item is { snapshot: typeof selectedSnapshots[number]; row: NonNullable<typeof item.row> } => Boolean(item.row))
    const positions = teamRows.map((item) => item.row.position)
    const points = teamRows.map((item) => item.row.points)
    return { teamId: team.id, teamName: team.name, positions, points, bestPosition: positions.length ? Math.min(...positions) : null, worstPosition: positions.length ? Math.max(...positions) : null, averagePosition: positions.length ? positions.reduce((sum, value) => sum + value, 0) / positions.length : null, minPoints: points.length ? Math.min(...points) : null, maxPoints: points.length ? Math.max(...points) : null, positionSpread: positions.length ? Math.max(...positions) - Math.min(...positions) : null }
  }).filter((row) => row.positions.length > 0).sort((a, b) => (b.positionSpread ?? 0) - (a.positionSpread ?? 0) || (a.averagePosition ?? 999) - (b.averagePosition ?? 999))
  const differingSnapshotFixtures = pending.map((match) => {
    const outcomes = selectedSnapshots.map((snapshot) => {
      const prediction = snapshot.predictions[match.id]
      const complete = Boolean(prediction && validScore(prediction.home) && validScore(prediction.away))
      return { snapshot, label: complete ? `${prediction!.home}–${prediction!.away}` : 'Sin pronóstico', key: complete ? `${prediction!.home}-${prediction!.away}` : 'none' }
    })
    return { match, outcomes }
  }).filter((item) => new Set(item.outcomes.map((outcome) => outcome.key)).size > 1)
  const updateScore = (matchId: number, side: 'home' | 'away', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return
    setPredictionsByScenario((current) => ({
      ...current,
      [activeScenario]: { ...current[activeScenario], [matchId]: { home: current[activeScenario][matchId]?.home ?? '', away: current[activeScenario][matchId]?.away ?? '', [side]: value } },
    }))
  }
  const scenarioRanges = currentScenario.table.map((row, index) => {
    const remainingForTeam = pending.filter((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id) && (match.homeId === row.team.id || match.awayId === row.team.id)).length
    const minPoints = row.points
    const maxPoints = row.points + remainingForTeam * 3
    return { ...row, currentPosition: index + 1, minPoints, maxPoints }
  })
  const scenarioBPosition = new Map(scenarioB.table.map((row, index) => [row.team.id, index + 1]))
  const scenarioBPoints = new Map(scenarioB.table.map((row) => [row.team.id, row.points]))
  const availableCombinationMatches = pending.filter((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id))
  const selectedCombinationMatches = combinationMatchIds.map((id) => availableCombinationMatches.find((match) => match.id === id)).filter((match): match is typeof pending[number] => Boolean(match))
  const combinationOutcomes = [
    { label: 'victoria local', homePoints: 3, awayPoints: 0 },
    { label: 'empate', homePoints: 1, awayPoints: 1 },
    { label: 'victoria visitante', homePoints: 0, awayPoints: 3 },
  ]
  const outcomeCombinations: Array<Array<{ match: typeof pending[number]; label: string; homePoints: number; awayPoints: number }>> = []
  const enumerateOutcomes = (index: number, picks: Array<{ match: typeof pending[number]; label: string; homePoints: number; awayPoints: number }>) => {
    if (index >= selectedCombinationMatches.length) { outcomeCombinations.push([...picks]); return }
    const match = selectedCombinationMatches[index]
    for (const outcome of combinationOutcomes) enumerateOutcomes(index + 1, [...picks, { match, ...outcome, label: `${teamName(match.homeId)} vs. ${teamName(match.awayId)}: ${outcome.label}` }])
  }
  if (selectedCombinationMatches.length > 0) enumerateOutcomes(0, [])
  const evaluatedCombinations = outcomeCombinations.map((picks) => {
    const pointDeltas = new Map<number, number>()
    const selectedMatchCounts = new Map<number, number>()
    for (const pick of picks) {
      pointDeltas.set(pick.match.homeId, (pointDeltas.get(pick.match.homeId) ?? 0) + pick.homePoints)
      pointDeltas.set(pick.match.awayId, (pointDeltas.get(pick.match.awayId) ?? 0) + pick.awayPoints)
      selectedMatchCounts.set(pick.match.homeId, (selectedMatchCounts.get(pick.match.homeId) ?? 0) + 1)
      selectedMatchCounts.set(pick.match.awayId, (selectedMatchCounts.get(pick.match.awayId) ?? 0) + 1)
    }
    const projections = scenarioRanges.map((row) => ({
      ...row,
      projectedPoints: row.points + (pointDeltas.get(row.team.id) ?? 0),
      projectedMaxPoints: row.maxPoints - 3 * (selectedMatchCounts.get(row.team.id) ?? 0) + (pointDeltas.get(row.team.id) ?? 0),
    }))
    const eliminatedNames = comparisonTeamIds.map((id) => projections.find((row) => String(row.team.id) === id)).filter((row): row is typeof projections[number] => Boolean(row)).filter((target) => projections.filter((other) => other.team.id !== target.team.id && other.projectedPoints > target.projectedMaxPoints).length >= Math.max(1, Number(comparisonPosition) || 1)).map((row) => row.team.name)
    const selectedPointsGained = comparisonTeamIds.reduce((total, id) => {
      const teamId = Number(id)
      return total + (pointDeltas.get(teamId) ?? 0)
    }, 0)
    return { label: picks.map((pick) => pick.label).join(' · '), eliminatedNames, selectedPointsGained }
  })
  const combinationsWithNoElimination = evaluatedCombinations.filter((item) => item.eliminatedNames.length === 0).length
  // Fase 58: clasifica automáticamente escenarios por objetivos conservados y puntos obtenidos por los clubes seleccionados.
  const rankedBestCombinations = [...evaluatedCombinations].sort((a, b) => a.eliminatedNames.length - b.eliminatedNames.length || b.selectedPointsGained - a.selectedPointsGained || a.label.localeCompare(b.label, 'es')).slice(0, 5)
  const rankedWorstCombinations = [...evaluatedCombinations].sort((a, b) => b.eliminatedNames.length - a.eliminatedNames.length || a.selectedPointsGained - b.selectedPointsGained || a.label.localeCompare(b.label, 'es')).slice(0, 5)

  return <section className="panel classification-scenario-panel">
    <div className="section-heading"><div><span className="eyebrow">SIMULACIÓN · NO OFICIAL</span><h2>Escenarios de clasificación</h2><p className="stats-intro">Crea dos escenarios independientes, compara sus clasificaciones y consulta rangos de puntos posibles para los partidos aún sin pronóstico. Nada se guarda como resultado oficial.</p></div><span className="tag">{currentScenario.predictedMatches.length} / {pending.length} partidos simulados</span></div>
    <div className="season-analysis-filters"><label>Temporada<select aria-label="Temporada de escenarios" value={seasonFilter} onChange={(event) => changeScenarioSeason(event.target.value)}><option value="">Seleccionar temporada</option>{[...seasons].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id).map((item) => <option key={item.id} value={item.id}>{item.name}{item.isCurrent ? ' · Actual' : ''}</option>)}</select></label></div>
    {!season ? <Empty title="Selecciona una temporada" text="Elige una temporada para calcular su clasificación real y probar escenarios de los partidos pendientes de Liga." /> : <>
      <div className="team-stat-summary-grid season-analysis-summary"><div><span>Partidos finalizados</span><strong>{completed.length}</strong></div><div><span>Partidos pendientes</span><strong>{pending.length}</strong></div><div><span>Marcadores incompletos</span><strong>{incomplete.length}</strong></div><div><span>Pronósticos completos · {activeScenario}</span><strong>{currentScenario.predictedMatches.length}</strong></div><div><span>Sin pronóstico · {activeScenario}</span><strong>{unpredicted}</strong></div></div>
      <div className="scenario-switcher" role="group" aria-label="Escenario que se está editando"><span>Editar escenario:</span><button type="button" className={activeScenario === 'A' ? 'active' : 'secondary-button'} aria-pressed={activeScenario === 'A'} onClick={() => setActiveScenario('A')}>Escenario A</button><button type="button" className={activeScenario === 'B' ? 'active' : 'secondary-button'} aria-pressed={activeScenario === 'B'} onClick={() => setActiveScenario('B')}>Escenario B</button><button type="button" className="secondary-button" onClick={() => setPredictionsByScenario((current) => ({ ...current, [activeScenario]: {} }))}>Borrar escenario {activeScenario}</button><button type="button" className="secondary-button" onClick={() => setPredictionsByScenario({ A: {}, B: {} })}>Borrar ambos</button></div>
      <section className="season-analysis-section saved-scenario-panel"><div className="section-heading"><div><h3>Guardar y comparar simulaciones</h3><p className="stats-intro">Guarda una fotografía local del escenario actual para compararla con otras hipótesis. Los escenarios sobreviven a las recargas de este navegador y no cambian los resultados oficiales.</p></div><span className="tag">{savedSnapshots.filter((item) => item.seasonId === seasonId).length}/8 guardados</span></div>
        <div className="saved-scenario-controls"><label>Nombre de la simulación<input aria-label="Nombre de la simulación" value={snapshotName} maxLength={60} onChange={(event) => setSnapshotName(event.target.value)} placeholder={`Ej. ${activeScenario === 'A' ? 'Victoria del favorito' : 'Escenario alternativo'}`} /></label><button type="button" className="secondary-button" onClick={saveCurrentSnapshot}>Guardar escenario {activeScenario}</button></div>
        <div className="saved-scenario-controls scenario-transfer-controls"><button type="button" className="secondary-button" onClick={exportSavedScenarios}>Exportar JSON</button><label>Importar paquete JSON<input type="file" accept=".json,application/json" onChange={importScenarioFile} /></label></div>
        {scenarioTransferMessage ? <p className="stats-intro" role="status">{scenarioTransferMessage}</p> : null}
        {savedSnapshots.filter((item) => item.seasonId === seasonId).length > 0 ? <><div className="saved-scenario-list" aria-label="Simulaciones guardadas">{savedSnapshots.filter((item) => item.seasonId === seasonId).map((item) => <div className="saved-scenario-item" key={item.id}><div><strong>{item.name}</strong><span>Escenario {item.scenario} · {item.createdAt} · {item.rows.reduce((sum, row) => sum + row.predictedMatches, 0) / 2} partido(s) simulados</span></div><button type="button" className="secondary-button" onClick={() => { setPredictionsByScenario((current) => ({ ...current, [item.scenario]: { ...item.predictions } })); setActiveScenario(item.scenario); setReferenceSnapshotId(String(item.id)) }}>Cargar</button><button type="button" className="secondary-button" aria-label={`Eliminar ${item.name}`} onClick={() => { setSavedSnapshots((current) => current.filter((saved) => saved.id !== item.id)); if (referenceSnapshotId === String(item.id)) setReferenceSnapshotId('') }}>Eliminar</button></div>)}</div>
        <div className="saved-scenario-controls"><label>Comparar la clasificación actual con<select aria-label="Escenario de referencia" value={referenceSnapshotId} onChange={(event) => setReferenceSnapshotId(event.target.value)}><option value="">Seleccionar referencia</option>{savedSnapshots.filter((item) => item.seasonId === seasonId).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.scenario}</option>)}</select></label></div>
        {referenceSnapshot ? <div className="ranking-scroll"><table className="saved-scenario-comparison"><thead><tr><th>Equipo</th><th>Pos. actual</th><th>Pos. referencia</th><th>Δ posición</th><th>Puntos actuales</th><th>Puntos referencia</th><th>Δ puntos</th></tr></thead><tbody>{currentScenario.table.map((row, index) => { const reference = referenceRowsByTeam.get(row.team.id); const positionDelta = reference ? reference.position - (index + 1) : null; const pointsDelta = reference ? row.points - reference.points : null; return <tr key={row.team.id}><th scope="row">{row.team.name}</th><td>{index + 1}</td><td>{reference?.position ?? '—'}</td><td>{positionDelta === null ? '—' : positionDelta > 0 ? `↑ ${positionDelta}` : positionDelta < 0 ? `↓ ${Math.abs(positionDelta)}` : '—'}</td><td>{row.points}</td><td>{reference?.points ?? '—'}</td><td>{pointsDelta === null ? '—' : pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta}</td></tr> })}</tbody></table></div> : <p className="stats-intro">Guarda una simulación y selecciónala como referencia para comparar posiciones y puntos.</p>}</> : <p className="stats-intro">Todavía no hay simulaciones guardadas para esta temporada.</p>}
        <p className="stats-intro objective-caveat">Las simulaciones se guardan únicamente en este navegador, separadas por temporada; no se envían al servidor ni alteran resultados oficiales. Se conservan como máximo ocho por temporada y, al guardar una novena, se elimina la más antigua. El cambio de posición se expresa como posición de referencia menos posición actual: un valor positivo indica que el escenario actual mejora puestos.</p>
      </section>
      <section className="season-analysis-section saved-scenario-panel multi-snapshot-analysis"><div className="section-heading"><div><h3>Centro comparativo de escenarios</h3><p className="stats-intro">Selecciona hasta cuatro simulaciones guardadas para comparar la estabilidad de cada equipo y localizar los partidos cuyos pronósticos cambian entre hipótesis.</p></div><span className="tag">{selectedSnapshots.length}/4 seleccionados</span></div>
        {seasonSnapshots.length ? <>
          <div className="multi-snapshot-picker" aria-label="Seleccionar escenarios para comparar">{seasonSnapshots.map((snapshot) => { const checked = comparisonSnapshotIds.includes(String(snapshot.id)); return <label key={snapshot.id}><input type="checkbox" checked={checked} disabled={!checked && comparisonSnapshotIds.length >= 4} onChange={(event) => setComparisonSnapshotIds((current) => event.target.checked ? [...current, String(snapshot.id)].slice(-4) : current.filter((id) => id !== String(snapshot.id)))} /><span><strong>{snapshot.name}</strong><small>Escenario {snapshot.scenario} · {snapshot.createdAt}</small></span></label> })}</div>
          {selectedSnapshots.length >= 2 ? <>
            <div className="team-stat-summary-grid multi-snapshot-summary"><div><span>Escenarios comparados</span><strong>{selectedSnapshots.length}</strong></div><div><span>Equipos analizados</span><strong>{multiSnapshotTeamRows.length}</strong></div><div><span>Mayor variación de puesto</span><strong>{Math.max(0, ...multiSnapshotTeamRows.map((row) => row.positionSpread ?? 0))} puestos</strong></div><div><span>Partidos con pronóstico distinto</span><strong>{differingSnapshotFixtures.length}</strong></div></div>
            <div className="ranking-scroll"><table className="multi-snapshot-table"><thead><tr><th>Equipo</th><th>Mejor puesto</th><th>Peor puesto</th><th>Variación</th><th>Puesto medio</th><th>Puntos mínimos</th><th>Puntos máximos</th>{selectedSnapshots.map((snapshot) => <th key={snapshot.id}>{snapshot.name}</th>)}</tr></thead><tbody>{multiSnapshotTeamRows.map((row) => <tr key={row.teamId}><th scope="row">{row.teamName}</th><td>{row.bestPosition ?? '—'}</td><td>{row.worstPosition ?? '—'}</td><td>{row.positionSpread ?? '—'}</td><td>{row.averagePosition === null ? '—' : row.averagePosition.toFixed(1)}</td><td>{row.minPoints ?? '—'}</td><td>{row.maxPoints ?? '—'}</td>{selectedSnapshots.map((snapshot) => { const snapshotRow = snapshot.rows.find((item) => item.teamId === row.teamId); return <td key={snapshot.id}>{snapshotRow ? `#${snapshotRow.position} · ${snapshotRow.points} pts` : '—'}</td> })}</tr>)}</tbody></table></div>
            <section className="multi-snapshot-fixtures"><h4>Partidos que explican diferencias</h4>{differingSnapshotFixtures.length ? <div className="ranking-scroll"><table><thead><tr><th>Partido</th>{selectedSnapshots.map((snapshot) => <th key={snapshot.id}>{snapshot.name}</th>)}</tr></thead><tbody>{differingSnapshotFixtures.map(({ match, outcomes }) => <tr key={match.id}><th scope="row">{teamName(match.homeId)} vs. {teamName(match.awayId)}</th>{outcomes.map((outcome) => <td key={outcome.snapshot.id}>{outcome.label}</td>)}</tr>)}</tbody></table></div> : <p className="stats-intro">Los escenarios seleccionados tienen los mismos pronósticos para todos los partidos pendientes.</p>}</section>
            <p className="stats-intro objective-caveat">El mejor y peor puesto se refieren solo a las simulaciones seleccionadas, no a todos los resultados matemáticamente posibles. El puesto medio es descriptivo, no una probabilidad. Los escenarios son locales y no oficiales.</p>
          </> : <p className="stats-intro">Selecciona al menos dos escenarios guardados para ver rangos de posiciones, puntos y partidos que cambian entre hipótesis.</p>}
        </> : <p className="stats-intro">Guarda al menos dos simulaciones de esta temporada para activar la comparación múltiple.</p>}
      </section>
      <section className="season-analysis-section"><div className="section-heading"><div><h3>Partidos pendientes · {season.name}</h3><p className="stats-intro">Introduce goles de local y visitante (0–20). Solo se simulan partidos con ambos marcadores completos.</p></div></div>
        {pending.length ? <div className="scenario-fixtures">{pending.map((match) => { const prediction = currentPredictions[match.id] ?? { home: '', away: '' }; const completePrediction = validScore(prediction.home) && validScore(prediction.away); return <article className={`scenario-fixture ${completePrediction ? 'predicted' : ''}`} key={match.id}><div className="scenario-fixture-meta"><span>{match.round?.trim() || 'Ronda sin nombre'}</span>{match.scheduledAt && <time dateTime={match.scheduledAt}>{new Date(match.scheduledAt).toLocaleDateString('es-ES')}</time>}</div><div className="scenario-fixture-score"><strong>{teamName(match.homeId)}</strong><label><span className="sr-only">Goles de {teamName(match.homeId)}</span><input aria-label={`Escenario ${activeScenario}: goles de ${teamName(match.homeId)} contra ${teamName(match.awayId)}`} type="number" min="0" max="20" step="1" inputMode="numeric" value={prediction.home} onChange={(event) => updateScore(match.id, 'home', event.target.value)} /></label><span>—</span><label><span className="sr-only">Goles de {teamName(match.awayId)}</span><input aria-label={`Escenario ${activeScenario}: goles de ${teamName(match.awayId)} contra ${teamName(match.homeId)}`} type="number" min="0" max="20" step="1" inputMode="numeric" value={prediction.away} onChange={(event) => updateScore(match.id, 'away', event.target.value)} /></label><strong>{teamName(match.awayId)}</strong></div><span className="scenario-fixture-status">{completePrediction ? `Incluido en escenario ${activeScenario}` : 'Esperando pronóstico'}</span></article> })}</div> : <Empty title="No hay partidos pendientes" text="Todos los partidos de Liga de esta temporada tienen marcador guardado." />}
      </section>
      <section className="season-analysis-section"><div className="section-heading"><div><h3>Comparación de escenarios A y B</h3><p className="stats-intro">Los puntos de cada escenario combinan resultados reales y pronósticos completos. Las diferencias no alteran la clasificación oficial.</p></div></div><div className="ranking-scroll"><table><thead><tr><th>Equipo</th><th>Pos. A</th><th>Pts. A</th><th>Pos. B</th><th>Pts. B</th><th>Δ puntos (B−A)</th></tr></thead><tbody>{scenarioA.table.map((row, index) => { const posA = index + 1; const posB = scenarioBPosition.get(row.team.id) ?? '—'; const pointsB = scenarioBPoints.get(row.team.id) ?? 0; return <tr key={row.team.id}><th scope="row">{row.team.name}</th><td>{posA}</td><td>{row.points}</td><td>{posB}</td><td>{pointsB}</td><td>{typeof pointsB === 'number' ? (pointsB - row.points > 0 ? `+${pointsB - row.points}` : pointsB - row.points) : '—'}</td></tr> })}</tbody></table></div></section>
      <section className="season-analysis-section classification-objectives"><div className="section-heading"><div><h3>Objetivos de clasificación · escenario {activeScenario}</h3><p className="stats-intro">Comprueba si un equipo sigue teniendo opciones de alcanzar un puesto por puntos, tomando como base los resultados oficiales y los pronósticos completos del escenario seleccionado.</p></div></div>
        <div className="season-analysis-filters objective-filters"><label>Equipo que quieres analizar<select aria-label="Equipo para el objetivo de clasificación" value={objectiveTeamId || String(currentScenario.table[0]?.team.id ?? '')} onChange={(event) => setObjectiveTeamId(event.target.value)}>{currentScenario.table.map((row) => <option key={row.team.id} value={row.team.id}>{row.team.name}</option>)}</select></label><label>Puesto objetivo<select aria-label="Puesto objetivo de clasificación" value={objectivePosition} onChange={(event) => setObjectivePosition(event.target.value)}>{currentScenario.table.map((row, index) => <option key={row.team.id} value={index + 1}>{index + 1}{index === 0 ? ' · Campeón' : '.º puesto'}</option>)}</select></label></div>
        {(() => { const selectedId = Number(objectiveTeamId || currentScenario.table[0]?.team.id); const target = scenarioRanges.find((row) => row.team.id === selectedId); const goalPosition = Math.max(1, Number(objectivePosition) || 1); const blockers = target ? scenarioRanges.filter((row) => row.team.id !== selectedId && row.points > target.maxPoints).sort((a, b) => b.points - a.points) : []; const impossible = blockers.length >= goalPosition; return target ? <><div className={`objective-verdict ${impossible ? 'objective-impossible' : 'objective-open'}`} role="status"><strong>{impossible ? 'Objetivo imposible por puntos en este escenario' : 'El objetivo todavía no está descartado por puntos'}</strong><p>{impossible ? `${blockers.length} equipos ya tienen más puntos que el máximo alcanzable por ${target.team.name}; eso basta para descartar el puesto ${goalPosition}.` : `Con un máximo teórico de ${target.maxPoints} puntos, ${target.team.name} aún no queda matemáticamente fuera del top ${goalPosition} según los puntos considerados aquí. Esto no garantiza que pueda alcanzar ese puesto.`}</p></div><div className="team-stat-summary-grid objective-summary"><div><span>Puntos en escenario {activeScenario}</span><strong>{target.points}</strong></div><div><span>Máximo teórico</span><strong>{target.maxPoints}</strong></div><div><span>Partidos sin pronóstico</span><strong>{pending.filter((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id) && (match.homeId === target.team.id || match.awayId === target.team.id)).length}</strong></div><div><span>Equipos por encima de su máximo</span><strong>{blockers.length}</strong></div></div>{blockers.length > 0 && <div className="ranking-scroll"><table><thead><tr><th>Equipo que ya supera el máximo</th><th>Puntos en escenario {activeScenario}</th><th>Diferencia sobre el máximo de {target.team.name}</th></tr></thead><tbody>{blockers.map((row) => <tr key={row.team.id}><th scope="row">{row.team.name}</th><td>{row.points}</td><td>+{row.points - target.maxPoints}</td></tr>)}</tbody></table></div>}</> : <p className="stats-intro">No hay equipos disponibles para evaluar este objetivo.</p> })()}
        <p className="stats-intro objective-caveat">Criterio conservador: el máximo suma 3 puntos por cada partido de Liga que siga sin pronóstico completo. Si al menos tantos equipos como el puesto objetivo ya superan ese máximo, el objetivo es imposible por puntos. No se consideran desempates, y los partidos con marcador incompleto no se proyectan. El análisis depende de los pronósticos de {activeScenario}; no modifica la clasificación oficial.</p>
      </section>
      <section className="season-analysis-section multi-objective-panel"><div className="section-heading"><div><h3>Comparador de objetivos para varios equipos</h3><p className="stats-intro">Selecciona varios clubes para evaluar el mismo objetivo dentro del escenario {activeScenario}. Puedes comparar hasta cinco equipos a la vez.</p></div></div>
        <div className="season-analysis-filters objective-filters"><label>Puesto que persiguen<select aria-label="Puesto común para comparar objetivos" value={comparisonPosition} onChange={(event) => setComparisonPosition(event.target.value)}>{currentScenario.table.map((row, index) => <option key={row.team.id} value={index + 1}>{index + 1}{index === 0 ? ' · Campeón' : '.º puesto'}</option>)}</select></label></div>
        <fieldset className="multi-objective-team-picker"><legend>Equipos a comparar (máximo 5)</legend><div className="multi-objective-team-list">{currentScenario.table.map((row) => { const checked = comparisonTeamIds.includes(String(row.team.id)); return <label key={row.team.id}><input type="checkbox" checked={checked} disabled={!checked && comparisonTeamIds.length >= 5} onChange={(event) => setComparisonTeamIds((current) => event.target.checked ? [...current, String(row.team.id)] : current.filter((id) => id !== String(row.team.id)))} /><span>{row.team.name}</span></label> })}</div></fieldset>
        {comparisonTeamIds.length ? <div className="ranking-scroll"><table className="multi-objective-table"><thead><tr><th>Equipo</th><th>Puntos en escenario {activeScenario}</th><th>Máximo teórico</th><th>Equipos que ya superan su máximo</th><th>Objetivo top {Math.max(1, Number(comparisonPosition) || 1)}</th></tr></thead><tbody>{comparisonTeamIds.map((id) => { const target = scenarioRanges.find((row) => String(row.team.id) === id); if (!target) return null; const blockers = scenarioRanges.filter((row) => row.team.id !== target.team.id && row.points > target.maxPoints).length; const impossible = blockers >= Math.max(1, Number(comparisonPosition) || 1); return <tr key={id}><th scope="row">{target.team.name}</th><td>{target.points}</td><td>{target.maxPoints}</td><td>{blockers}</td><td><span className={`objective-badge ${impossible ? 'impossible' : 'open'}`}>{impossible ? 'Descartado por puntos' : 'Aún no descartado'}</span></td></tr> })}</tbody></table></div> : <p className="stats-intro">Marca uno o más equipos para compararlos. La comparación no cambia los pronósticos ni los resultados oficiales.</p>}
        <div className="section-heading multi-objective-impact-heading"><div><h3>Cómo influirían los próximos resultados</h3><p className="stats-intro">Cada fila prueba un único resultado alternativo para un partido todavía sin pronóstico completo, manteniendo el resto de partidos sin pronóstico abiertos. Muestra cuántos de los equipos seleccionados quedarían descartados del puesto elegido por puntos.</p></div></div>
        {comparisonTeamIds.length && pending.some((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id)) ? <div className="ranking-scroll"><table className="multi-objective-impact-table"><thead><tr><th>Partido pendiente</th><th>Resultado hipotético</th><th>Equipos seleccionados descartados</th><th>Lectura</th></tr></thead><tbody>{pending.filter((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id)).flatMap((match) => ([{ label: `${teamName(match.homeId)} gana`, home: 3, away: 0 }, { label: 'Empate', home: 1, away: 1 }, { label: `${teamName(match.awayId)} gana`, home: 0, away: 3 }].map((outcome) => { const projectedPoints = new Map<number, number>(); const projectedMax = new Map<number, number>(); for (const row of scenarioRanges) { const isHome = row.team.id === match.homeId; const isAway = row.team.id === match.awayId; const award = isHome ? outcome.home : isAway ? outcome.away : 0; projectedPoints.set(row.team.id, row.points + award); projectedMax.set(row.team.id, isHome || isAway ? row.maxPoints - 3 + award : row.maxPoints); } const eliminated = comparisonTeamIds.map((id) => scenarioRanges.find((row) => String(row.team.id) === id)).filter((target): target is typeof scenarioRanges[number] => Boolean(target)).filter((target) => scenarioRanges.filter((other) => other.team.id !== target.team.id && (projectedPoints.get(other.team.id) ?? other.points) > (projectedMax.get(target.team.id) ?? target.maxPoints)).length >= Math.max(1, Number(comparisonPosition) || 1)); const eliminatedNames = eliminated.map((row) => row.team.name); return <tr key={`${match.id}-${outcome.label}`}><td>{teamName(match.homeId)} vs. {teamName(match.awayId)}</td><td>{outcome.label}</td><td>{eliminatedNames.length ? eliminatedNames.join(', ') : 'Ninguno'}</td><td><span className={`objective-badge ${eliminatedNames.length ? 'impossible' : 'open'}`}>{eliminatedNames.length ? `${eliminatedNames.length} de ${comparisonTeamIds.length} descartado(s)` : 'Ninguno descartado'}</span></td></tr> })))}</tbody></table></div> : <p className="stats-intro">Selecciona equipos y asegúrate de que queden partidos sin pronóstico para explorar los efectos hipotéticos.</p>}
        <p className="stats-intro objective-caveat">Análisis de sensibilidad: se cambia un solo partido cada vez, no se simula una jornada completa ni se consideran dependencias entre resultados futuros o desempates. Un equipo no descartado sigue sin tener garantizado el puesto. Todo permanece en esta pantalla y no se guarda como resultado oficial.</p>
      </section>
      <section className="season-analysis-section combination-explorer-panel"><div className="section-heading"><div><h3>Explorador de combinaciones de resultados</h3><p className="stats-intro">Selecciona hasta cuatro partidos todavía sin pronóstico para evaluar todas las combinaciones de victoria local, empate o victoria visitante. Se calculan 3ⁿ combinaciones (máximo 81) y se evalúa si los equipos comparados quedan descartados por puntos.</p></div><span className="tag">{selectedCombinationMatches.length ? `${evaluatedCombinations.length} combinaciones` : 'Sin partidos seleccionados'}</span></div>
        <fieldset className="multi-objective-team-picker combination-match-picker"><legend>Partidos que formarán parte de la combinación (máximo 4)</legend>
          {availableCombinationMatches.length ? <div className="multi-objective-team-list">{availableCombinationMatches.map((match) => { const checked = combinationMatchIds.includes(match.id); return <label key={match.id}><input type="checkbox" checked={checked} disabled={!checked && selectedCombinationMatches.length >= 4} onChange={(event) => setCombinationMatchIds((current) => event.target.checked ? [...current, match.id] : current.filter((id) => id !== match.id))} /><span>{match.round?.trim() || 'Sin ronda'} · {teamName(match.homeId)} vs. {teamName(match.awayId)}</span></label> })}</div> : <p className="stats-intro">No quedan partidos sin pronóstico completo para explorar.</p>}
          {combinationMatchIds.length > 0 && <button type="button" className="secondary-button combination-clear-button" onClick={() => setCombinationMatchIds([])}>Limpiar selección de partidos</button>}
        </fieldset>
        {!comparisonTeamIds.length ? <p className="stats-intro">Primero selecciona uno o más equipos en el comparador de objetivos para evaluar qué combinaciones podrían descartarlos del puesto elegido.</p> : selectedCombinationMatches.length ? <><div className="team-stat-summary-grid combination-summary"><div><span>Partidos seleccionados</span><strong>{selectedCombinationMatches.length}</strong></div><div><span>Combinaciones evaluadas</span><strong>{evaluatedCombinations.length}</strong></div><div><span>Combinaciones sin nuevos descartes</span><strong>{combinationsWithNoElimination}</strong></div><div><span>Objetivo evaluado</span><strong>Top {Math.max(1, Number(comparisonPosition) || 1)}</strong></div></div><div className="ranking-scroll"><table className="multi-objective-impact-table combination-results-table"><thead><tr><th>#</th><th>Combinación de resultados</th><th>Equipos seleccionados descartados</th><th>Evaluación</th></tr></thead><tbody>{evaluatedCombinations.map((item, index) => <tr key={`${index}-${item.label}`}><td>{index + 1}</td><td>{item.label}</td><td>{item.eliminatedNames.length ? item.eliminatedNames.join(', ') : 'Ninguno'}</td><td><span className={`objective-badge ${item.eliminatedNames.length ? 'impossible' : 'open'}`}>{item.eliminatedNames.length ? `${item.eliminatedNames.length} equipo(s) descartado(s)` : 'Sin nuevos descartes por puntos'}</span></td></tr>)}</tbody></table></div><section className="scenario-ranking-grid" aria-label="Mejores y peores combinaciones"><div className="scenario-ranking-card"><h4>Escenarios más favorables</h4><p className="stats-intro">Prioriza menos equipos descartados y más puntos ganados por los clubes seleccionados.</p><div className="ranking-scroll"><table><thead><tr><th>#</th><th>Resultados</th><th>Descartados</th><th>Puntos ganados</th></tr></thead><tbody>{rankedBestCombinations.map((item, index) => <tr key={`best-${index}-${item.label}`}><td>{index + 1}</td><td>{item.label}</td><td>{item.eliminatedNames.length ? item.eliminatedNames.join(', ') : 'Ninguno'}</td><td>+{item.selectedPointsGained}</td></tr>)}</tbody></table></div></div><div className="scenario-ranking-card"><h4>Escenarios más desfavorables</h4><p className="stats-intro">Prioriza más equipos descartados y menos puntos ganados por los clubes seleccionados.</p><div className="ranking-scroll"><table><thead><tr><th>#</th><th>Resultados</th><th>Descartados</th><th>Puntos ganados</th></tr></thead><tbody>{rankedWorstCombinations.map((item, index) => <tr key={`worst-${index}-${item.label}`}><td>{index + 1}</td><td>{item.label}</td><td>{item.eliminatedNames.length ? item.eliminatedNames.join(', ') : 'Ninguno'}</td><td>+{item.selectedPointsGained}</td></tr>)}</tbody></table></div></div></section></> : <p className="stats-intro">Marca entre uno y cuatro partidos para generar las combinaciones. Cada selección adicional triplica el número de escenarios evaluados.</p>}
        <p className="stats-intro objective-caveat">Cada combinación aplica un resultado hipotético a los partidos seleccionados a la vez; los partidos restantes siguen abiertos y se incluyen en el máximo teórico. Los listados favorables y desfavorables son una clasificación heurística: primero cuentan los objetivos descartados y después los puntos obtenidos por los equipos seleccionados; no son probabilidades ni recomendaciones predictivas. “Sin nuevos descartes” no significa que el objetivo esté garantizado. No se consideran desempates, ni se guardan estos resultados simulados.</p>
      </section>
      <section className="season-analysis-section"><div className="section-heading"><div><h3>Rangos posibles · escenario {activeScenario}</h3><p className="stats-intro">El mínimo mantiene los puntos actuales del escenario; el máximo supone ganar todos los partidos todavía sin pronóstico. Los rangos son individuales y no garantizan posiciones simultáneas.</p></div></div><div className="ranking-scroll"><table><thead><tr><th>Pos. escenario</th><th>Equipo</th><th>Puntos actuales</th><th>Puntos mínimos</th><th>Puntos máximos</th><th>Partidos sin pronóstico</th><th>¿Puede variar el orden?</th></tr></thead><tbody>{scenarioRanges.map((row) => { const orderMayChange = scenarioRanges.some((other) => other.team.id !== row.team.id && other.maxPoints >= row.minPoints && other.minPoints <= row.maxPoints); const remaining = pending.filter((match) => !currentScenario.predictedMatches.some((predicted) => predicted.id === match.id) && (match.homeId === row.team.id || match.awayId === row.team.id)).length; return <tr key={row.team.id}><td>{row.currentPosition}</td><th scope="row">{row.team.name}</th><td>{row.points}</td><td>{row.minPoints}</td><td>{row.maxPoints}</td><td>{remaining}</td><td>{orderMayChange ? 'Sí · rangos solapados' : 'No según rangos actuales'}</td></tr> })}</tbody></table></div></section>
      <p className="stats-intro season-analysis-footnote">Simulación estadística no oficial. Los rangos de puntos se calculan por equipo de forma independiente; no representan probabilidades ni posiciones garantizadas. Los desempates oficiales pueden requerir criterios adicionales. Los pronósticos viven solo en esta pantalla y no se envían al servidor.</p>
    </>}
  </section>
}

/** Fase 52: análisis histórico y evolución por temporada. */
function SeasonAnalysisPanel({ teams, seasons, matches, selectedSeasonId }: {
  teams: Team[]
  seasons: Season[]
  matches: Match[]
  selectedSeasonId: number | null
}) {
  const [teamFilter, setTeamFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState(selectedSeasonId === null ? 'all' : String(selectedSeasonId))
  const [competitionFilter, setCompetitionFilter] = useState('liga')

  const selectedTeamId = teamFilter === 'all' ? undefined : Number(teamFilter)
  const teamName = (id: number) => teams.find((team) => team.id === id)?.name ?? `Equipo ${id}`
  const seasonName = (id: number) => seasons.find((season) => season.id === id)?.name ?? `Temporada ${id}`
  const competitionName = competitionFilter === 'all'
    ? 'Todas las competiciones'
    : competitions.find((item) => item.id === competitionFilter)?.name ?? competitionFilter
  const seasonScopedMatches = matches.filter((match) =>
    match.homeScore !== null && match.awayScore !== null &&
    (seasonFilter === 'all' || match.seasonId === Number(seasonFilter)) &&
    (competitionFilter === 'all' || match.competition === competitionFilter),
  )
  const getTeamSummary = (teamId: number, rows: Match[]) => {
    const played = rows.filter((match) => match.homeId === teamId || match.awayId === teamId)
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, points = 0
    for (const match of played) {
      const home = match.homeId === teamId
      const scored = home ? match.homeScore! : match.awayScore!
      const conceded = home ? match.awayScore! : match.homeScore!
      goalsFor += scored
      goalsAgainst += conceded
      if (scored > conceded) { wins += 1; points += 3 }
      else if (scored === conceded) { draws += 1; points += 1 }
      else losses += 1
    }
    return { played: played.length, wins, draws, losses, goalsFor, goalsAgainst, difference: goalsFor - goalsAgainst, points, pointsPerMatch: played.length ? points / played.length : 0 }
  }
  const seasonRows = [...seasons]
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id - b.id)
    .filter((season) => seasonFilter === 'all' || season.id === Number(seasonFilter))
    .map((season) => {
      const seasonMatches = matches.filter((match) => match.seasonId === season.id && match.homeScore !== null && match.awayScore !== null && (competitionFilter === 'all' || match.competition === competitionFilter))
      const teamRows = teams.map((team) => ({ team, ...getTeamSummary(team.id, seasonMatches) }))
        .filter((row) => row.played > 0)
        .sort((a, b) => b.points - a.points || b.difference - a.difference || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name))
      const selected = selectedTeamId === undefined ? undefined : teamRows.find((row) => row.team.id === selectedTeamId)
      return { season, matches: seasonMatches, teamRows, selected, rank: selected ? teamRows.findIndex((row) => row.team.id === selectedTeamId) + 1 : null }
    })
  const roundRows = (() => {
    if (seasonFilter === 'all' || competitionFilter === 'all' || selectedTeamId === undefined) return []
    const teamMatches = seasonScopedMatches.filter((match) => match.homeId === selectedTeamId || match.awayId === selectedTeamId)
    const roundLabel = (match: Match) => match.round?.trim() || 'Ronda sin nombre'
    const roundSortValue = (value: string) => {
      const numeric = value.match(/\d+/)
      return numeric ? Number(numeric[0]) : Number.MAX_SAFE_INTEGER
    }
    const labels = [...new Set(teamMatches.map(roundLabel))].sort((a, b) => roundSortValue(a) - roundSortValue(b) || a.localeCompare(b, 'es', { numeric: true }))
    let cumulativePoints = 0, cumulativeDifference = 0, cumulativeGoalsFor = 0, cumulativeGoalsAgainst = 0
    return labels.map((label) => {
      const inRound = teamMatches.filter((match) => roundLabel(match) === label).sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '') || a.id - b.id)
      let roundPoints = 0, roundGoalsFor = 0, roundGoalsAgainst = 0
      for (const match of inRound) {
        const home = match.homeId === selectedTeamId
        const scored = home ? match.homeScore! : match.awayScore!
        const conceded = home ? match.awayScore! : match.homeScore!
        roundGoalsFor += scored
        roundGoalsAgainst += conceded
        if (scored > conceded) roundPoints += 3
        else if (scored === conceded) roundPoints += 1
      }
      const roundDifference = roundGoalsFor - roundGoalsAgainst
      cumulativePoints += roundPoints
      cumulativeDifference += roundDifference
      cumulativeGoalsFor += roundGoalsFor
      cumulativeGoalsAgainst += roundGoalsAgainst
      return { label, played: inRound.length, roundPoints, cumulativePoints, roundDifference, cumulativeDifference, cumulativeGoalsFor, cumulativeGoalsAgainst }
    })
  })()

  const currentTeamSummary = selectedTeamId === undefined ? null : getTeamSummary(selectedTeamId, seasonScopedMatches)
  const seasonRowsWithData = seasonRows.filter((row) => row.matches.length > 0)

  return <section className="panel season-analysis-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Análisis de temporadas</h2><p className="stats-intro">Compara la evolución de los clubes entre temporadas y revisa los resultados acumulados por ronda. Solo se utilizan partidos finalizados con marcador guardado.</p></div><span className="tag">{seasonScopedMatches.length} partidos en el periodo</span></div>
    <div className="season-analysis-filters">
      <label>Equipo<select aria-label="Equipo del análisis histórico" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="all">Todos los equipos</option>{[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Temporada<select aria-label="Temporada del análisis histórico" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
      <label>Competición<select aria-label="Competición del análisis histórico" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <div className="team-stat-summary-grid season-analysis-summary"><div><span>Partidos finalizados</span><strong>{seasonScopedMatches.length}</strong></div><div><span>Goles registrados</span><strong>{seasonScopedMatches.reduce((sum, match) => sum + match.homeScore! + match.awayScore!, 0)}</strong></div><div><span>Temporadas con resultados</span><strong>{new Set(seasonScopedMatches.map((match) => match.seasonId)).size}</strong></div></div>

    <section className="season-analysis-section"><div className="section-heading"><div><h3>Evolución entre temporadas</h3><p className="stats-intro">{selectedTeamId === undefined ? 'Selecciona un equipo para revisar su trayectoria anual, o deja “Todos los equipos” para ver los líderes de cada temporada.' : `Rendimiento de ${teamName(selectedTeamId)} en ${competitionName.toLowerCase()}.`}</p></div></div>
      {selectedTeamId !== undefined ? (seasonRowsWithData.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Temporada</th><th scope="col">PJ</th><th scope="col">G</th><th scope="col">E</th><th scope="col">P</th><th scope="col">GF</th><th scope="col">GC</th><th scope="col">DG</th><th scope="col">Pts</th><th scope="col">Pts/PJ</th><th scope="col">Pos. Liga*</th></tr></thead><tbody>{seasonRowsWithData.map((row) => { const stats = getTeamSummary(selectedTeamId, row.matches); return <tr key={row.season.id}><th scope="row">{row.season.name}</th><td>{stats.played}</td><td>{stats.wins}</td><td>{stats.draws}</td><td>{stats.losses}</td><td>{stats.goalsFor}</td><td>{stats.goalsAgainst}</td><td>{stats.difference > 0 ? `+${stats.difference}` : stats.difference}</td><td><strong>{stats.points}</strong></td><td>{stats.pointsPerMatch.toFixed(2)}</td><td>{competitionFilter === 'liga' ? row.rank ?? '—' : '—'}</td></tr> })}</tbody></table></div> : <Empty title="Sin historial disponible" text="No hay partidos finalizados para este equipo con los filtros actuales." />) : (seasonRowsWithData.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Temporada</th><th scope="col">Partidos</th><th scope="col">Club líder por puntos</th><th scope="col">Pts</th><th scope="col">DG</th><th scope="col">GF</th></tr></thead><tbody>{seasonRowsWithData.map((row) => { const leader = row.teamRows[0]; return <tr key={row.season.id}><th scope="row">{row.season.name}</th><td>{row.matches.length}</td><td>{leader?.team.name ?? '—'}</td><td>{leader?.points ?? '—'}</td><td>{leader ? (leader.difference > 0 ? `+${leader.difference}` : leader.difference) : '—'}</td><td>{leader?.goalsFor ?? '—'}</td></tr> })}</tbody></table></div> : <Empty title="Sin temporadas con resultados" text="Cuando haya partidos finalizados, se mostrarán aquí las comparaciones históricas." />)}
      <p className="stats-intro">* La posición solo se muestra al seleccionar Liga; en otras competiciones se evita presentar una clasificación no oficial.</p>
    </section>

    {seasonFilter !== 'all' && selectedTeamId !== undefined && currentTeamSummary && <section className="season-analysis-section"><div className="section-heading"><div><h3>Balance de {teamName(selectedTeamId)} · {seasonName(Number(seasonFilter))}</h3><p className="stats-intro">{competitionName}. Incluye exclusivamente partidos finalizados del periodo seleccionado.</p></div></div><div className="season-analysis-metrics"><article><span>Victorias</span><strong>{currentTeamSummary.wins}</strong></article><article><span>Empates</span><strong>{currentTeamSummary.draws}</strong></article><article><span>Derrotas</span><strong>{currentTeamSummary.losses}</strong></article><article><span>Goles a favor / en contra</span><strong>{currentTeamSummary.goalsFor} / {currentTeamSummary.goalsAgainst}</strong></article><article><span>Diferencia de goles</span><strong>{currentTeamSummary.difference > 0 ? `+${currentTeamSummary.difference}` : currentTeamSummary.difference}</strong></article><article><span>Puntos por partido</span><strong>{currentTeamSummary.pointsPerMatch.toFixed(2)}</strong></article></div></section>}

    {seasonFilter !== 'all' && competitionFilter !== 'all' && selectedTeamId !== undefined && <section className="season-analysis-section"><div className="section-heading"><div><h3>Evolución acumulada por ronda</h3><p className="stats-intro">Se agrupan los partidos del equipo por el texto de ronda guardado. En torneos eliminatorios, estos puntos son un resumen estadístico y no equivalen a una clasificación oficial.</p></div></div>{roundRows.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Ronda</th><th scope="col">PJ en ronda</th><th scope="col">Pts ronda</th><th scope="col">Pts acumulados</th><th scope="col">DG ronda</th><th scope="col">DG acumulada</th><th scope="col">GF acumulados</th><th scope="col">GC acumulados</th></tr></thead><tbody>{roundRows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.played}</td><td>{row.roundPoints}</td><td><strong>{row.cumulativePoints}</strong></td><td>{row.roundDifference > 0 ? `+${row.roundDifference}` : row.roundDifference}</td><td>{row.cumulativeDifference > 0 ? `+${row.cumulativeDifference}` : row.cumulativeDifference}</td><td>{row.cumulativeGoalsFor}</td><td>{row.cumulativeGoalsAgainst}</td></tr>)}</tbody></table></div> : <Empty title="Sin rondas registradas" text="No hay partidos finalizados con los filtros seleccionados." />}</section>}
    <p className="stats-intro season-analysis-footnote">Los valores se calculan desde los marcadores almacenados. El sistema no reconstruye partidos ausentes, no estima temporadas incompletas y no presenta los líderes estadísticos como campeones oficiales.</p>
  </section>
}


/** Fase 44: auditoría de integridad del historial de finales. */
type HistoricalIntegrityIssue = {
  id: string
  severity: 'error' | 'warning' | 'info'
  seasonId: number
  competition: string
  title: string
  detail: string
  finalId?: number
}

function HistoricalIntegrityPanel({ finals, seasons, teams, matches }: {
  finals: HistoricalFinal[]
  seasons: Season[]
  teams: Team[]
  matches: Match[]
}) {
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const teamNames = new Map(teams.map((team) => [team.id, team.name]))
  const seasonNames = new Map(seasons.map((season) => [season.id, season.name]))
  const competitionName = (id: string) => competitions.find((item) => item.id === id)?.name ?? id
  const allCompetitions = competitions.map((item) => item.id)
  const issues: HistoricalIntegrityIssue[] = []
  const add = (issue: HistoricalIntegrityIssue) => issues.push(issue)

  // Missing records are review prompts, not proof that the competition was played.
  for (const season of seasons) {
    for (const competition of allCompetitions) {
      if (!finals.some((item) => item.seasonId === season.id && item.competition === competition)) {
        add({ id: `missing-${season.id}-${competition}`, severity: 'warning', seasonId: season.id, competition, title: 'Campeón no documentado', detail: `No hay registro de campeón para ${competitionName(competition)} en ${season.name}. Confirma si la competición se disputó y, si corresponde, registra el resultado.` })
      }
    }
  }

  for (const final of finals) {
    const seasonName = seasonNames.get(final.seasonId) ?? `Temporada #${final.seasonId}`
    if (final.finalFormat === 'league') {
      if (final.matchId !== null || final.leg1MatchId !== null || final.leg2MatchId !== null) {
        add({ id: `league-links-${final.id}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: 'La Liga tiene vínculos de final', detail: `El campeonato de Liga de ${seasonName} no debe apuntar a partidos de final.` })
      }
      continue
    }

    const links = final.finalFormat === 'single'
      ? [{ slot: 'Final', id: final.matchId, championScore: final.leg1ChampionScore, runnerUpScore: final.leg1RunnerUpScore }]
      : [
          { slot: 'Ida', id: final.leg1MatchId, championScore: final.leg1ChampionScore, runnerUpScore: final.leg1RunnerUpScore },
          { slot: 'Vuelta', id: final.leg2MatchId, championScore: final.leg2ChampionScore, runnerUpScore: final.leg2RunnerUpScore },
        ]
    if (links.every((link) => link.id === null)) {
      add({ id: `unlinked-${final.id}`, severity: 'warning', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: 'Registro manual sin partidos vinculados', detail: `${competitionName(final.competition)} · ${seasonName}: la final está documentada manualmente. Vincula partidos si existen en el calendario.` })
    }
    if (final.finalFormat === 'two_leg' && (final.leg1MatchId === null || final.leg2MatchId === null || final.leg1MatchId === final.leg2MatchId)) {
      add({ id: `two-leg-links-${final.id}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: 'Vínculos de ida y vuelta incompletos', detail: `La eliminatoria de ${seasonName} debe tener dos partidos distintos.` })
    }

    for (const link of links) {
      if (link.id === null) continue
      const match = matches.find((item) => item.id === link.id)
      if (!match) {
        add({ id: `missing-match-${final.id}-${link.slot}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: `Partido vinculado inexistente (${link.slot})`, detail: `La referencia al partido #${link.id} no aparece en los datos cargados.` })
        continue
      }
      if (match.homeScore === null || match.awayScore === null) {
        add({ id: `unfinished-${final.id}-${link.slot}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: `Partido vinculado sin resultado (${link.slot})`, detail: `El partido #${match.id} no tiene ambos marcadores registrados.` })
        continue
      }
      const problems: string[] = []
      if (match.seasonId !== final.seasonId) problems.push('pertenece a otra temporada')
      if (match.competition !== final.competition) problems.push('pertenece a otra competición')
      if (!/^final(?:\s|$|[·-])/i.test(match.round)) problems.push('su ronda ya no figura como final')
      const homeName = teamNames.get(match.homeId)?.trim().toLocaleLowerCase()
      const awayName = teamNames.get(match.awayId)?.trim().toLocaleLowerCase()
      const champion = final.championName.trim().toLocaleLowerCase()
      const runnerUp = final.runnerUpName.trim().toLocaleLowerCase()
      let scoreMatches = false
      if (homeName === champion && awayName === runnerUp) scoreMatches = match.homeScore === link.championScore && match.awayScore === link.runnerUpScore
      else if (awayName === champion && homeName === runnerUp) scoreMatches = match.awayScore === link.championScore && match.homeScore === link.runnerUpScore
      else problems.push('los clubes no coinciden con campeón y subcampeón registrados')
      if (!problems.includes('los clubes no coinciden con campeón y subcampeón registrados') && !scoreMatches) problems.push('el marcador guardado difiere del resultado actual del partido')
      if (problems.length) add({ id: `mismatch-${final.id}-${link.slot}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: `Vínculo inconsistente (${link.slot})`, detail: `Partido #${match.id}: ${problems.join('; ')}.` })
    }

    if (final.leg1ChampionScore !== null && final.leg1RunnerUpScore !== null) {
      const championTotal = final.leg1ChampionScore + (final.finalFormat === 'two_leg' ? final.leg2ChampionScore ?? 0 : 0)
      const runnerUpTotal = final.leg1RunnerUpScore + (final.finalFormat === 'two_leg' ? final.leg2RunnerUpScore ?? 0 : 0)
      if (final.finalFormat === 'two_leg' && (final.leg2ChampionScore === null || final.leg2RunnerUpScore === null)) {
        add({ id: `missing-leg-score-${final.id}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: 'Marcador de vuelta incompleto', detail: `La eliminatoria de ${seasonName} no tiene ambos marcadores de vuelta.` })
      } else if (championTotal < runnerUpTotal || (championTotal === runnerUpTotal && (final.penaltyChampionScore === null || final.penaltyRunnerUpScore === null || final.penaltyChampionScore <= final.penaltyRunnerUpScore))) {
        add({ id: `winner-mismatch-${final.id}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: 'Campeón no respaldado por el resultado', detail: `El marcador global es ${championTotal}–${runnerUpTotal}; revisa el campeón registrado y, si hubo empate, la tanda de penaltis.` })
      } else if (championTotal !== runnerUpTotal && (final.penaltyChampionScore !== null || final.penaltyRunnerUpScore !== null)) {
        add({ id: `unexpected-penalties-${final.id}`, severity: 'error', seasonId: final.seasonId, competition: final.competition, finalId: final.id, title: 'Penaltis sin empate global', detail: 'Hay una tanda registrada aunque el marcador global no terminó empatado.' })
      }
    }
  }

  const filtered = issues.filter((issue) =>
    (seasonFilter === 'all' || issue.seasonId === Number(seasonFilter)) &&
    (competitionFilter === 'all' || issue.competition === competitionFilter) &&
    (severityFilter === 'all' || issue.severity === severityFilter),
  ).sort((a, b) => ({ error: 0, warning: 1, info: 2 }[a.severity] - { error: 0, warning: 1, info: 2 }[b.severity]) || b.seasonId - a.seasonId || a.title.localeCompare(b.title))
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  return <section className="panel historical-integrity-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Integridad del historial</h2><p className="stats-intro">Auditoría de consistencia de finales, partidos vinculados, marcadores y temporadas sin campeón documentado. Es un diagnóstico de solo lectura: no modifica los registros.</p></div><span className={`tag ${errors ? 'integrity-tag-error' : 'integrity-tag-ok'}`}>{errors ? `${errors} errores por revisar` : 'Sin inconsistencias detectadas'}</span></div>
    <div className="team-stat-summary-grid historical-integrity-summary"><div><span>Errores</span><strong>{errors}</strong></div><div><span>Advertencias</span><strong>{warnings}</strong></div><div><span>Finales auditadas</span><strong>{finals.length}</strong></div></div>
    <div className="team-stat-filters historical-integrity-filters">
      <label className="player-stat-filter">Temporada<select aria-label="Filtrar integridad por temporada" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a,b) => b.id-a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
      <label className="player-stat-filter">Competición<select aria-label="Filtrar integridad por competición" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="player-stat-filter">Tipo de incidencia<select aria-label="Filtrar incidencias por tipo" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option value="all">Todas las incidencias</option><option value="error">Errores</option><option value="warning">Advertencias</option><option value="info">Información</option></select></label>
    </div>
    <div className="section-heading historical-integrity-list-heading"><div><h3>Incidencias detectadas</h3><p className="stats-intro">{filtered.length} elementos para revisar con los filtros actuales.</p></div></div>
    {filtered.length ? <div className="historical-integrity-issues">{filtered.map((issue) => <article className={`historical-integrity-issue integrity-${issue.severity}`} key={issue.id}><div><span className="integrity-severity">{issue.severity === 'error' ? 'Error' : issue.severity === 'warning' ? 'Advertencia' : 'Información'}</span><h4>{issue.title}</h4><p>{issue.detail}</p></div><div className="integrity-issue-meta"><span>{seasonNames.get(issue.seasonId) ?? `Temporada #${issue.seasonId}`}</span><span>{competitionName(issue.competition)}</span>{issue.finalId !== undefined && <span>Registro #{issue.finalId}</span>}</div></article>)}</div> : <Empty title="No hay incidencias con estos filtros" text="No se encontraron incidencias para la selección actual. Recuerda que las advertencias de temporadas sin registro requieren confirmar si la competición se disputó." />}
    <p className="stats-intro historical-integrity-footnote">Una temporada sin registro no demuestra que una competición se haya disputado o que falte necesariamente un campeón: es una señal para revisión administrativa. El panel no modifica ni corrige datos automáticamente.</p>
  </section>
}

type HistoricalFinalAudit = {
  id: number
  finalId: number
  action: 'created' | 'updated' | 'deleted'
  actorId: string | null
  actorEmail: string | null
  beforeSnapshot: Record<string, unknown> | null
  afterSnapshot: Record<string, unknown> | null
  createdAt: string
}

type AdminAuditEvent = {
  id: number
  entityType: 'match' | 'roster' | 'transfer' | 'market_proposal' | 'team' | 'player'
  entityId: number
  seasonId: number | null
  action: 'created' | 'updated' | 'deleted' | 'accepted' | 'rejected' | 'withdrawn'
  actorId: string | null
  actorEmail: string | null
  beforeSnapshot: Record<string, unknown> | null
  afterSnapshot: Record<string, unknown> | null
  createdAt: string
}

function HistoricalFinalAuditPanel({ audits, events, seasons, teams, players }: {
  audits: HistoricalFinalAudit[]
  events: AdminAuditEvent[]
  seasons: Season[]
  teams: Team[]
  players: Player[]
}) {
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [eventEntityFilter, setEventEntityFilter] = useState('all')
  const [eventActionFilter, setEventActionFilter] = useState('all')
  const [eventSearch, setEventSearch] = useState('')
  const teamNames = new Map(teams.map((team) => [team.id, team.name]))
  const playerNames = new Map(players.map((player) => [player.id, player.name]))
  const seasonName = (snapshot: Record<string, unknown> | null) => {
    const seasonId = Number(snapshot?.seasonId)
    return seasons.find((season) => season.id === seasonId)?.name ?? (seasonId ? `Temporada #${seasonId}` : '—')
  }
  const snapshotLabel = (snapshot: Record<string, unknown> | null) => {
    if (!snapshot) return '—'
    return `${String(snapshot.championName ?? 'Sin campeón')} vs. ${String(snapshot.runnerUpName ?? 'Sin subcampeón')} · ${String(snapshot.competition ?? 'Sin competición')} · ${seasonName(snapshot)}`
  }
  const filtered = audits.filter((audit) =>
    (actionFilter === 'all' || audit.action === actionFilter) &&
    `${audit.actorEmail ?? ''} ${audit.actorId ?? ''} ${audit.finalId} ${snapshotLabel(audit.beforeSnapshot)} ${snapshotLabel(audit.afterSnapshot)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  )
  const entityLabel: Record<AdminAuditEvent['entityType'], string> = {
    match: 'Partido', roster: 'Plantilla', transfer: 'Traspaso', market_proposal: 'Propuesta', team: 'Equipo', player: 'Jugador',
  }
  const actionLabel: Record<AdminAuditEvent['action'], string> = {
    created: 'Creación', updated: 'Edición', deleted: 'Eliminación', accepted: 'Aceptada', rejected: 'Rechazada', withdrawn: 'Retirada',
  }
  const brief = (event: AdminAuditEvent, snapshot: Record<string, unknown> | null) => {
    if (!snapshot) return '—'
    if (event.entityType === 'match') {
      const home = teamNames.get(Number(snapshot.homeId)) ?? `Equipo #${String(snapshot.homeId ?? '—')}`
      const away = teamNames.get(Number(snapshot.awayId)) ?? `Equipo #${String(snapshot.awayId ?? '—')}`
      return `${home} ${String(snapshot.homeScore ?? '—')} - ${String(snapshot.awayScore ?? '—')} ${away} · ${String(snapshot.round ?? '')}`
    }
    if (event.entityType === 'roster') return `${playerNames.get(Number(snapshot.playerId)) ?? `Jugador #${String(snapshot.playerId ?? '—')}`} · ${teamNames.get(Number(snapshot.teamId)) ?? `Equipo #${String(snapshot.teamId ?? '—')}`}`
    if (event.entityType === 'transfer') return `${playerNames.get(Number(snapshot.playerId)) ?? `Jugador #${String(snapshot.playerId ?? '—')}`}: ${teamNames.get(Number(snapshot.fromTeamId)) ?? `Equipo #${String(snapshot.fromTeamId ?? '—')}`} → ${teamNames.get(Number(snapshot.toTeamId)) ?? `Equipo #${String(snapshot.toTeamId ?? '—')}`}`
    if (event.entityType === 'team') return String(snapshot.name ?? 'Equipo')
    if (event.entityType === 'player') return `${String(snapshot.name ?? playerNames.get(event.entityId) ?? `Jugador #${event.entityId}`)} · ${teamNames.get(Number(snapshot.teamId)) ?? `Equipo #${String(snapshot.teamId ?? '—')}`}`
    if (event.entityType === 'market_proposal') return `${String(snapshot.status ?? '—')} · ${playerNames.get(Number(snapshot.playerId)) ?? `Jugador #${String(snapshot.playerId ?? '—')}`} · ${teamNames.get(Number(snapshot.fromTeamId)) ?? `Equipo #${String(snapshot.fromTeamId ?? '—')}`} → ${teamNames.get(Number(snapshot.toTeamId)) ?? `Equipo #${String(snapshot.toTeamId ?? '—')}`}`
    return JSON.stringify(snapshot).slice(0, 160)
  }
  const filteredEvents = events.filter((event) =>
    (eventEntityFilter === 'all' || event.entityType === eventEntityFilter) &&
    (eventActionFilter === 'all' || event.action === eventActionFilter) &&
    `${event.actorEmail ?? ''} ${event.actorId ?? ''} ${event.entityId} ${entityLabel[event.entityType]} ${seasons.find((season) => season.id === event.seasonId)?.name ?? ''} ${brief(event, event.beforeSnapshot)} ${brief(event, event.afterSnapshot)} ${JSON.stringify(event.beforeSnapshot ?? {})} ${JSON.stringify(event.afterSnapshot ?? {})}`.toLocaleLowerCase().includes(eventSearch.toLocaleLowerCase()),
  )
  function downloadCsv(filename: string, rows: unknown[][]) {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const blob = new Blob(['\ufeff' + rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
  function exportCsv() {
    downloadCsv('ufl-auditoria-administrativa.csv', [
      ['Fecha', 'Acción', 'ID final', 'Administrador', 'ID usuario', 'Antes', 'Después'],
      ...filtered.map((audit) => [audit.createdAt, audit.action, audit.finalId, audit.actorEmail, audit.actorId, snapshotLabel(audit.beforeSnapshot), snapshotLabel(audit.afterSnapshot)]),
    ])
  }
  function exportEventsCsv() {
    downloadCsv('ufl-auditoria-transversal.csv', [
      ['Fecha', 'Entidad', 'ID registro', 'Temporada', 'Acción', 'Administrador', 'ID usuario', 'Antes', 'Después'],
      ...filteredEvents.map((event) => [event.createdAt, entityLabel[event.entityType], event.entityId, seasons.find((season) => season.id === event.seasonId)?.name ?? event.seasonId ?? '', actionLabel[event.action], event.actorEmail, event.actorId, brief(event, event.beforeSnapshot), brief(event, event.afterSnapshot)]),
    ])
  }
  return <section className="panel historical-audit-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Auditoría administrativa</h2><p className="stats-intro">Registro de creación, edición y eliminación de finales históricas, con actor, fecha y snapshots anteriores y posteriores. Solo los administradores pueden consultar esta información.</p></div><span className="tag">{audits.length} eventos</span></div>
    <div className="team-stat-filters historical-audit-filters">
      <label className="player-stat-filter">Acción<select aria-label="Filtrar auditoría por acción" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="all">Todas las acciones</option><option value="created">Creaciones</option><option value="updated">Ediciones</option><option value="deleted">Eliminaciones</option></select></label>
      <label className="player-stat-filter">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Administrador, club, temporada…" /></label>
      <button type="button" className="secondary-button" onClick={exportCsv} disabled={!filtered.length}>Exportar CSV</button>
    </div>
    {filtered.length ? <div className="ranking-scroll"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Registro</th><th>Administrador</th><th>Antes</th><th>Después</th></tr></thead><tbody>{filtered.map((audit) => <tr key={audit.id}><td>{new Date(audit.createdAt).toLocaleString()}</td><td>{audit.action === 'created' ? 'Creación' : audit.action === 'updated' ? 'Edición' : 'Eliminación'}</td><td>Final #{audit.finalId}</td><td>{audit.actorEmail ?? audit.actorId ?? 'Identidad no disponible'}</td><td>{snapshotLabel(audit.beforeSnapshot)}</td><td>{snapshotLabel(audit.afterSnapshot)}</td></tr>)}</tbody></table></div> : <Empty title="No hay eventos para mostrar" text="Las modificaciones futuras de finales históricas se registrarán aquí cuando la migración de auditoría esté aplicada." />}
    <p className="stats-intro historical-audit-footnote">La auditoría de finales cubre cambios guardados a través de la API. No reconstruye modificaciones anteriores a su instalación.</p>
    <div className="section-heading historical-integrity-list-heading"><div><h3>Auditoría transversal</h3><p className="stats-intro">Creaciones y cambios de partidos, jugadores, equipos, plantillas, traspasos y propuestas de mercado.</p></div><span className="tag">{events.length} eventos</span></div>
    <div className="team-stat-filters historical-audit-filters">
      <label className="player-stat-filter">Entidad<select aria-label="Filtrar auditoría transversal por entidad" value={eventEntityFilter} onChange={(event) => setEventEntityFilter(event.target.value)}><option value="all">Todas las entidades</option><option value="match">Partidos</option><option value="player">Jugadores</option><option value="team">Equipos</option><option value="roster">Plantillas</option><option value="transfer">Traspasos</option><option value="market_proposal">Propuestas de mercado</option></select></label>
      <label className="player-stat-filter">Acción<select aria-label="Filtrar auditoría transversal por acción" value={eventActionFilter} onChange={(event) => setEventActionFilter(event.target.value)}><option value="all">Todas las acciones</option><option value="created">Creaciones</option><option value="updated">Ediciones</option><option value="deleted">Eliminaciones</option><option value="accepted">Aceptadas</option><option value="rejected">Rechazadas</option><option value="withdrawn">Retiradas</option></select></label>
      <label className="player-stat-filter">Buscar<input value={eventSearch} onChange={(event) => setEventSearch(event.target.value)} placeholder="Club, jugador, usuario o registro…" /></label>
      <button type="button" className="secondary-button" onClick={exportEventsCsv} disabled={!filteredEvents.length}>Exportar eventos CSV</button>
    </div>
    {filteredEvents.length ? <div className="ranking-scroll"><table><thead><tr><th>Fecha</th><th>Entidad</th><th>Registro</th><th>Temporada</th><th>Acción</th><th>Administrador</th><th>Antes</th><th>Después</th></tr></thead><tbody>{filteredEvents.map((event) => {
      const season = seasons.find((item) => item.id === event.seasonId)?.name ?? (event.seasonId ? `Temporada #${event.seasonId}` : '—')
      return <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString()}</td><td>{entityLabel[event.entityType]}</td><td>#{event.entityId}</td><td>{season}</td><td>{actionLabel[event.action]}</td><td>{event.actorEmail ?? event.actorId ?? 'Identidad no disponible'}</td><td>{brief(event, event.beforeSnapshot)}</td><td>{brief(event, event.afterSnapshot)}</td></tr>
    })}</tbody></table></div> : <Empty title="No hay eventos para mostrar" text="No hay eventos transversales que coincidan con los filtros. Los nuevos cambios instrumentados se registrarán cuando la migración de auditoría esté aplicada." />}
    <p className="stats-intro historical-audit-footnote">La auditoría transversal registra operaciones realizadas a través de las rutas instrumentadas de la aplicación. No registra escrituras directas en la base de datos ni reconstruye eventos anteriores a la instalación.</p>
  </section>
}

/** Fase 41: palmarés derivado exclusivamente de premios históricos guardados. */
type HistoricalFinal = {
  id: number
  seasonId: number
  competition: string
  finalFormat: 'league' | 'single' | 'two_leg'
  matchId: number | null
  leg1MatchId: number | null
  leg2MatchId: number | null
  championName: string
  runnerUpName: string
  leg1ChampionScore: number | null
  leg1RunnerUpScore: number | null
  leg2ChampionScore: number | null
  leg2RunnerUpScore: number | null
  penaltyChampionScore: number | null
  penaltyRunnerUpScore: number | null
  note: string
  updatedAt: string
}

function HistoricalFinalsPanel({ finals, seasons, teams, matches, isAdmin, busy, onMutate }: {
  finals: HistoricalFinal[]
  seasons: Season[]
  teams: Team[]
  matches: Match[]
  isAdmin: boolean
  busy: boolean
  onMutate: (payload: unknown) => Promise<boolean>
}) {
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const blankForm = () => ({
    seasonId: seasons.find((season) => season.isCurrent)?.id ?? seasons[0]?.id ?? 0,
    competition: 'liga', finalFormat: 'league' as 'league' | 'single' | 'two_leg',
    matchId: '', leg1MatchId: '', leg2MatchId: '',
    championName: '', runnerUpName: '', leg1ChampionScore: '', leg1RunnerUpScore: '',
    leg2ChampionScore: '', leg2RunnerUpScore: '', penaltyChampionScore: '', penaltyRunnerUpScore: '', note: '',
  })
  const [form, setForm] = useState(blankForm)
  const competitionName = (id: string) => competitions.find((competition) => competition.id === id)?.name ?? id
  const sortedFinals = [...finals].filter((item) => (seasonFilter === 'all' || item.seasonId === Number(seasonFilter)) && (competitionFilter === 'all' || item.competition === competitionFilter)).sort((a, b) => b.seasonId - a.seasonId || a.competition.localeCompare(b.competition))
  const seasonName = (id: number) => seasons.find((season) => season.id === id)?.name ?? `Temporada #${id}`
  const score = (value: number | null) => value === null ? '' : String(value)
  const aggregate = form.finalFormat === 'two_leg' && form.leg1ChampionScore !== '' && form.leg1RunnerUpScore !== '' && form.leg2ChampionScore !== '' && form.leg2RunnerUpScore !== ''
    ? Number(form.leg1ChampionScore) + Number(form.leg2ChampionScore) === Number(form.leg1RunnerUpScore) + Number(form.leg2RunnerUpScore)
    : form.finalFormat === 'single' && form.leg1ChampionScore !== '' && form.leg1RunnerUpScore !== '' && Number(form.leg1ChampionScore) === Number(form.leg1RunnerUpScore)
  function beginEdit(item: HistoricalFinal) {
    setEditingId(item.id)
    setForm({
      seasonId: item.seasonId, competition: item.competition, finalFormat: item.finalFormat,
      matchId: item.matchId === null ? '' : String(item.matchId), leg1MatchId: item.leg1MatchId === null ? '' : String(item.leg1MatchId), leg2MatchId: item.leg2MatchId === null ? '' : String(item.leg2MatchId),
      championName: item.championName, runnerUpName: item.runnerUpName,
      leg1ChampionScore: score(item.leg1ChampionScore), leg1RunnerUpScore: score(item.leg1RunnerUpScore),
      leg2ChampionScore: score(item.leg2ChampionScore), leg2RunnerUpScore: score(item.leg2RunnerUpScore),
      penaltyChampionScore: score(item.penaltyChampionScore), penaltyRunnerUpScore: score(item.penaltyRunnerUpScore), note: item.note,
    })
  }
  function resetForm() { setEditingId(null); setForm(blankForm()) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value)
    const finalFormat = form.competition === 'liga' ? 'league' : form.finalFormat === 'league' ? 'single' : form.finalFormat
    const payload = {
      action: 'saveHistoricalFinal', ...(editingId ? { id: editingId } : {}), seasonId: Number(form.seasonId),
      competition: form.competition, finalFormat,
      matchId: finalFormat === 'single' && form.matchId ? Number(form.matchId) : null,
      leg1MatchId: finalFormat === 'two_leg' && form.leg1MatchId ? Number(form.leg1MatchId) : null,
      leg2MatchId: finalFormat === 'two_leg' && form.leg2MatchId ? Number(form.leg2MatchId) : null,
      championName: form.championName.trim(), runnerUpName: form.runnerUpName.trim(),
      leg1ChampionScore: finalFormat === 'league' ? null : numberOrNull(form.leg1ChampionScore),
      leg1RunnerUpScore: finalFormat === 'league' ? null : numberOrNull(form.leg1RunnerUpScore),
      leg2ChampionScore: finalFormat === 'two_leg' ? numberOrNull(form.leg2ChampionScore) : null,
      leg2RunnerUpScore: finalFormat === 'two_leg' ? numberOrNull(form.leg2RunnerUpScore) : null,
      penaltyChampionScore: aggregate ? numberOrNull(form.penaltyChampionScore) : null,
      penaltyRunnerUpScore: aggregate ? numberOrNull(form.penaltyRunnerUpScore) : null,
      note: form.note.trim(),
    }
    if (await onMutate(payload)) resetForm()
  }
  async function remove(item: HistoricalFinal) {
    if (!window.confirm(`¿Eliminar el registro de ${competitionName(item.competition)} de ${seasonName(item.seasonId)}? Esta acción no se puede deshacer.`)) return
    if (await onMutate({ action: 'deleteHistoricalFinal', id: item.id }) && editingId === item.id) resetForm()
  }
  const teamNames = new Map(teams.map((team) => [team.id, team.name]))
  const matchOptions = matches.filter((match) => match.seasonId === Number(form.seasonId) && match.competition === form.competition && /^final(?:\s|$|[·-])/i.test(match.round) && match.homeScore !== null && match.awayScore !== null)
  function matchLabel(match: Match) {
    const date = match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString() : match.round
    return `${date} · ${teamNames.get(match.homeId) ?? `#${match.homeId}`} ${match.homeScore}–${match.awayScore} ${teamNames.get(match.awayId) ?? `#${match.awayId}`}`
  }
  function selectLinkedMatch(slot: 'matchId' | 'leg1MatchId' | 'leg2MatchId', value: string, nameOverrides: { championName?: string; runnerUpName?: string } = {}) {
    const next = { ...form, ...nameOverrides, [slot]: value }
    const champion = (nameOverrides.championName ?? form.championName).trim().toLocaleLowerCase()
    const runnerUp = (nameOverrides.runnerUpName ?? form.runnerUpName).trim().toLocaleLowerCase()
    for (const linkedSlot of ['matchId', 'leg1MatchId', 'leg2MatchId'] as const) {
      const linkedValue = next[linkedSlot]
      const selected = matchOptions.find((match) => match.id === Number(linkedValue))
      const isSecondLeg = linkedSlot === 'leg2MatchId'
      const clearScores = () => {
        if (isSecondLeg) { next.leg2ChampionScore = ''; next.leg2RunnerUpScore = '' }
        else { next.leg1ChampionScore = ''; next.leg1RunnerUpScore = '' }
      }
      if (!selected) { if (linkedSlot === slot || !linkedValue) clearScores(); continue }
      const home = teamNames.get(selected.homeId)?.toLocaleLowerCase()
      const away = teamNames.get(selected.awayId)?.toLocaleLowerCase()
      if (home === champion && away === runnerUp) {
        if (isSecondLeg) { next.leg2ChampionScore = String(selected.homeScore); next.leg2RunnerUpScore = String(selected.awayScore) }
        else { next.leg1ChampionScore = String(selected.homeScore); next.leg1RunnerUpScore = String(selected.awayScore) }
      } else if (away === champion && home === runnerUp) {
        if (isSecondLeg) { next.leg2ChampionScore = String(selected.awayScore); next.leg2RunnerUpScore = String(selected.homeScore) }
        else { next.leg1ChampionScore = String(selected.awayScore); next.leg1RunnerUpScore = String(selected.homeScore) }
      } else clearScores()
    }
    next.penaltyChampionScore = ''; next.penaltyRunnerUpScore = ''
    setForm(next)
  }
  function resultText(item: HistoricalFinal) {
    if (item.finalFormat === 'league') return 'Campeonato por clasificación'
    const first = `${item.leg1ChampionScore}–${item.leg1RunnerUpScore}`
    if (item.finalFormat === 'single') return item.penaltyChampionScore === null ? first : `${first} (pen. ${item.penaltyChampionScore}–${item.penaltyRunnerUpScore})`
    const second = `${item.leg2ChampionScore}–${item.leg2RunnerUpScore}`
    const championTotal = (item.leg1ChampionScore ?? 0) + (item.leg2ChampionScore ?? 0)
    const runnerUpTotal = (item.leg1RunnerUpScore ?? 0) + (item.leg2RunnerUpScore ?? 0)
    return `${first} / ${second} · Global ${championTotal}–${runnerUpTotal}${item.penaltyChampionScore === null ? '' : ` (pen. ${item.penaltyChampionScore}–${item.penaltyRunnerUpScore})`}`
  }
  return <section className="panel historical-finals-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Historial oficial de finales</h2><p className="stats-intro">Registro explícito de campeones, subcampeones y marcadores. Los nombres se conservan como fueron escritos para proteger el historial de clubes.</p></div><span className="tag">{finals.length} registros</span></div>
    {isAdmin && <form className="historical-finals-form" onSubmit={(event) => void submit(event)}>
      <div className="section-heading"><div><h3>{editingId ? 'Editar registro histórico' : 'Registrar campeón y subcampeón'}</h3><p className="stats-intro">Los registros oficiales solo se guardan cuando los confirma un administrador.</p></div>{editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancelar edición</button>}</div>
      <div className="historical-finals-fields">
        <label>Temporada<select required value={form.seasonId} onChange={(event) => setForm({ ...form, seasonId: Number(event.target.value), matchId: '', leg1MatchId: '', leg2MatchId: '', leg1ChampionScore: '', leg1RunnerUpScore: '', leg2ChampionScore: '', leg2RunnerUpScore: '', penaltyChampionScore: '', penaltyRunnerUpScore: '' })}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
        <label>Competición<select value={form.competition} onChange={(event) => setForm({ ...form, competition: event.target.value, finalFormat: event.target.value === 'liga' ? 'league' : form.finalFormat === 'league' ? 'single' : form.finalFormat, matchId: '', leg1MatchId: '', leg2MatchId: '', leg2ChampionScore: '', leg2RunnerUpScore: '', penaltyChampionScore: '', penaltyRunnerUpScore: '' })}>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></label>
        {form.competition !== 'liga' && <label>Formato<select value={form.finalFormat === 'league' ? 'single' : form.finalFormat} onChange={(event) => setForm({ ...form, finalFormat: event.target.value as 'single' | 'two_leg', matchId: '', leg1MatchId: '', leg2MatchId: '', leg2ChampionScore: '', leg2RunnerUpScore: '', penaltyChampionScore: '', penaltyRunnerUpScore: '' })}><option value="single">Partido único</option><option value="two_leg">Ida y vuelta</option></select></label>}
        <label>Campeón<input list="historical-club-names" required maxLength={100} value={form.championName} onChange={(event) => { const value = event.target.value; const linkedId = form.finalFormat === 'single' ? form.matchId : form.leg1MatchId; if (linkedId) selectLinkedMatch(form.finalFormat === 'single' ? 'matchId' : 'leg1MatchId', linkedId, { championName: value }); else setForm({ ...form, championName: value }) }} placeholder="Nombre histórico del campeón" /></label>
        <label>Subcampeón<input list="historical-club-names" required maxLength={100} value={form.runnerUpName} onChange={(event) => { const value = event.target.value; const linkedId = form.finalFormat === 'single' ? form.matchId : form.leg1MatchId; if (linkedId) selectLinkedMatch(form.finalFormat === 'single' ? 'matchId' : 'leg1MatchId', linkedId, { runnerUpName: value }); else setForm({ ...form, runnerUpName: value }) }} placeholder="Nombre histórico del subcampeón" /></label>
        <datalist id="historical-club-names">{teams.map((team) => <option key={team.id} value={team.name} />)}</datalist>
        {form.finalFormat === 'single' && <label>Partido oficial vinculado (opcional)<select value={form.matchId} onChange={(event) => selectLinkedMatch('matchId', event.target.value)}><option value="">Registro manual, sin vincular</option>{matchOptions.map((match) => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}</select></label>}
        {form.finalFormat === 'two_leg' && <><label>Partido oficial · ida (opcional)<select value={form.leg1MatchId} onChange={(event) => selectLinkedMatch('leg1MatchId', event.target.value)}><option value="">Registro manual, sin vincular</option>{matchOptions.filter((match) => match.id !== Number(form.leg2MatchId)).map((match) => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}</select></label><label>Partido oficial · vuelta (opcional)<select value={form.leg2MatchId} onChange={(event) => selectLinkedMatch('leg2MatchId', event.target.value)}><option value="">Registro manual, sin vincular</option>{matchOptions.filter((match) => match.id !== Number(form.leg1MatchId)).map((match) => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}</select></label></>}
      </div>
      {form.finalFormat !== 'league' && <div className="historical-finals-score-grid">
        <label>{form.finalFormat === 'two_leg' ? 'Ida · goles del campeón' : 'Goles del campeón'}<input type="number" min="0" max="99" required value={form.leg1ChampionScore} onChange={(event) => setForm({ ...form, leg1ChampionScore: event.target.value, penaltyChampionScore: '', penaltyRunnerUpScore: '' })} /></label>
        <label>{form.finalFormat === 'two_leg' ? 'Ida · goles del subcampeón' : 'Goles del subcampeón'}<input type="number" min="0" max="99" required value={form.leg1RunnerUpScore} onChange={(event) => setForm({ ...form, leg1RunnerUpScore: event.target.value, penaltyChampionScore: '', penaltyRunnerUpScore: '' })} /></label>
        {form.finalFormat === 'two_leg' && <>
          <label>Vuelta · goles del campeón<input type="number" min="0" max="99" required value={form.leg2ChampionScore} onChange={(event) => setForm({ ...form, leg2ChampionScore: event.target.value, penaltyChampionScore: '', penaltyRunnerUpScore: '' })} /></label>
          <label>Vuelta · goles del subcampeón<input type="number" min="0" max="99" required value={form.leg2RunnerUpScore} onChange={(event) => setForm({ ...form, leg2RunnerUpScore: event.target.value, penaltyChampionScore: '', penaltyRunnerUpScore: '' })} /></label>
        </>}
        {aggregate && <><label>Penaltis · campeón<input type="number" min="0" max="99" required value={form.penaltyChampionScore} onChange={(event) => setForm({ ...form, penaltyChampionScore: event.target.value })} /></label><label>Penaltis · subcampeón<input type="number" min="0" max="99" required value={form.penaltyRunnerUpScore} onChange={(event) => setForm({ ...form, penaltyRunnerUpScore: event.target.value })} /></label><p className="historical-finals-validation">El global está empatado. Registra una tanda ganada por el campeón.</p></>}
      </div>}
      <label className="historical-finals-note-label">Nota histórica (opcional)<textarea maxLength={500} rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Fuente, observaciones o detalle del título" /></label>
      <div className="historical-finals-actions"><button type="submit" disabled={busy || !seasons.length}>{busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar final'}</button></div>
    </form>}
    <div className="club-palmares-filters"><label className="player-stat-filter">Temporada<select aria-label="Filtrar finales por temporada" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a, b) => b.id - a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label><label className="player-stat-filter">Competición<select aria-label="Filtrar finales por competición" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></label></div>
    {sortedFinals.length ? <div className="ranking-scroll"><table><thead><tr><th>Temporada</th><th>Competición</th><th>Campeón</th><th>Subcampeón</th><th>Resultado</th><th>Partidos vinculados</th><th>Nota</th>{isAdmin && <th>Acciones</th>}</tr></thead><tbody>{sortedFinals.map((item) => <tr key={item.id}><td>{seasonName(item.seasonId)}</td><td>{competitionName(item.competition)}</td><td><strong>{item.championName}</strong></td><td>{item.runnerUpName}</td><td>{resultText(item)}</td><td>{[item.matchId, item.leg1MatchId, item.leg2MatchId].filter((id): id is number => id !== null).map((id) => { const match = matches.find((candidate) => candidate.id === id); return match ? `${match.round} (#${match.id})` : `Partido #${id}` }).join(' · ') || 'Registro manual'}</td><td>{item.note || '—'}</td>{isAdmin && <td><div className="historical-finals-row-actions"><button type="button" className="secondary-button" onClick={() => beginEdit(item)}>Editar</button><button type="button" className="danger-button" disabled={busy} onClick={() => void remove(item)}>Eliminar</button></div></td>}</tr>)}</tbody></table></div> : <Empty title="Todavía no hay finales registradas" text={isAdmin ? 'Usa el formulario para registrar campeones, subcampeones y resultados oficiales.' : 'Los registros aparecerán aquí cuando la administración los haya guardado.'} />}
    <p className="stats-intro historical-finals-footnote">El registro conserva los nombres escritos por la administración. Los marcadores se validan antes de guardar; si el global termina empatado, debe registrarse una tanda de penaltis ganada por el campeón.</p>
  </section>
}

function ClubPalmaresPanel({ teams, seasons, records, finals }: {
  teams: Team[]
  seasons: Season[]
  records: { id: number; seasonId: number; awards: Record<string, unknown>; updatedAt: string }[]
  finals: HistoricalFinal[]
}) {
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [selectedClub, setSelectedClub] = useState('all')
  const awardTypes = [
    { key: 'leagueChampion', competition: 'liga', label: 'Liga', kind: 'champion' },
    { key: 'cupChampion', competition: 'copa', label: 'Copa', kind: 'champion' },
    { key: 'championsChampion', competition: 'champions', label: 'Champions League', kind: 'champion' },
    { key: 'europaChampion', competition: 'europa', label: 'Europa League', kind: 'champion' },
    { key: 'leagueSuperCupChampion', competition: 'supercopa_liga', label: 'Supercopa de la Liga', kind: 'champion' },
    { key: 'europeSuperCupChampion', competition: 'supercopa_europa', label: 'Supercopa de Europa', kind: 'champion' },
    { key: 'leagueRunnerUp', competition: 'liga', label: 'Liga', kind: 'runnerUp' },
  ] as const
  const seasonNames = new Map(seasons.map((season) => [season.id, season.name]))
  const entries = records.flatMap((record) => awardTypes.flatMap((type) => {
    if (seasonFilter !== 'all' && record.seasonId !== Number(seasonFilter)) return []
    if (competitionFilter !== 'all' && type.competition !== competitionFilter) return []
    const value = record.awards?.[type.key]
    // Premios automáticos guardan el nombre histórico del club; no inferimos
    // campeones a partir de tablas o resultados actuales.
    if (typeof value !== 'string' || !value.trim()) return []
    return [{ seasonId: record.seasonId, seasonName: seasonNames.get(record.seasonId) ?? `Temporada #${record.seasonId}`, clubName: value.trim(), competition: type.competition, competitionName: type.label, kind: type.kind, awardKey: type.key }]
  })).sort((a, b) => b.seasonId - a.seasonId || a.competitionName.localeCompare(b.competitionName) || a.clubName.localeCompare(b.clubName))
  const allClubNames = [...new Set([...teams.map((team) => team.name), ...entries.map((entry) => entry.clubName), ...finals.flatMap((final) => [final.championName, final.runnerUpName])])].sort((a, b) => a.localeCompare(b))
  const visibleEntries = entries.filter((entry) => selectedClub === 'all' || entry.clubName === selectedClub)
  const rows = allClubNames.map((clubName) => {
    const clubEntries = visibleEntries.filter((entry) => entry.clubName === clubName)
    const titles = clubEntries.filter((entry) => entry.kind === 'champion')
    const runnersUp = clubEntries.filter((entry) => entry.kind === 'runnerUp')
    return { clubName, titles, runnersUp, titleCount: titles.length }
  }).filter((row) => selectedClub !== 'all' || row.titleCount > 0 || row.runnersUp.length > 0)
    .sort((a, b) => b.titleCount - a.titleCount || b.runnersUp.length - a.runnersUp.length || a.clubName.localeCompare(b.clubName))
  const selectedClubEntries = visibleEntries.filter((entry) => selectedClub !== 'all' && entry.clubName === selectedClub)
  const seasonLabel = seasonFilter === 'all' ? 'Todas las temporadas' : seasonNames.get(Number(seasonFilter)) ?? 'Temporada seleccionada'
  const competitionLabel = competitionFilter === 'all' ? 'Todas las competiciones' : competitions.find((competition) => competition.id === competitionFilter)?.name ?? competitionFilter
  return <section className="panel club-palmares-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Palmarés histórico de clubes</h2><p className="stats-intro">Campeonatos y subcampeonatos recuperados de los premios históricos guardados en cada temporada.</p></div><span className="tag">{entries.filter((entry) => entry.kind === 'champion').length} títulos registrados</span></div>
    <div className="club-palmares-filters">
      <label className="player-stat-filter">Temporada<select aria-label="Temporada del palmarés" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a,b) => b.id-a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
      <label className="player-stat-filter">Competición<select aria-label="Competición del palmarés" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></label>
      <label className="player-stat-filter">Club<select aria-label="Club del palmarés" value={selectedClub} onChange={(event) => setSelectedClub(event.target.value)}><option value="all">Todos los clubes</option>{allClubNames.map((club) => <option key={club} value={club}>{club}</option>)}</select></label>
    </div>
    <div className="team-stat-summary-grid club-palmares-summary"><div><span>Campeonatos registrados</span><strong>{entries.filter((entry) => entry.kind === 'champion').length}</strong></div><div><span>Subcampeonatos de Liga</span><strong>{entries.filter((entry) => entry.kind === 'runnerUp').length}</strong></div><div><span>Temporadas con premios guardados</span><strong>{new Set(entries.map((entry) => entry.seasonId)).size}</strong></div></div>
    <div className="section-heading club-palmares-table-heading"><div><h3>Ranking de clubes</h3><p className="stats-intro">{seasonLabel} · {competitionLabel}. Solo cuentan premios existentes en el histórico guardado.</p></div></div>
    {rows.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">Títulos</th><th scope="col">Subcampeonatos de Liga</th><th scope="col">Competiciones ganadas</th><th scope="col">Último título registrado</th></tr></thead><tbody>{rows.map((row, index) => { const latest = [...row.titles].sort((a,b) => b.seasonId-a.seasonId)[0]; const competitionsWon = [...new Set(row.titles.map((entry) => entry.competitionName))]; return <tr key={row.clubName}><td>{index + 1}</td><th scope="row">{row.clubName}</th><td><strong>{row.titleCount}</strong></td><td>{row.runnersUp.length}</td><td>{competitionsWon.length ? competitionsWon.join(', ') : '—'}</td><td>{latest ? `${latest.competitionName} · ${latest.seasonName}` : '—'}</td></tr> })}</tbody></table></div> : <Empty title="Todavía no hay palmarés guardado" text="Cuando los premios automáticos se guarden desde el Salón de la Fama de una temporada, sus campeones aparecerán aquí." />}
    {selectedClub !== 'all' && <div className="historical-finals-club-history"><h3>Finales oficiales de {selectedClub}</h3>{finals.filter((final) => final.championName === selectedClub || final.runnerUpName === selectedClub).sort((a,b) => b.seasonId-a.seasonId).length ? <div className="ranking-scroll"><table><thead><tr><th>Temporada</th><th>Competición</th><th>Resultado</th><th>Posición</th><th>Partido vinculado</th></tr></thead><tbody>{finals.filter((final) => final.championName === selectedClub || final.runnerUpName === selectedClub).sort((a,b) => b.seasonId-a.seasonId).map((final) => <tr key={final.id}><td>{seasonNames.get(final.seasonId) ?? `Temporada #${final.seasonId}`}</td><td>{competitions.find((competition) => competition.id === final.competition)?.name ?? final.competition}</td><td>{final.finalFormat === 'league' ? 'Campeonato por clasificación' : `${final.leg1ChampionScore}–${final.leg1RunnerUpScore}${final.finalFormat === 'two_leg' ? ` / ${final.leg2ChampionScore}–${final.leg2RunnerUpScore}` : ''}`}</td><td>{final.championName === selectedClub ? 'Campeón' : 'Subcampeón'}</td><td>{[final.matchId, final.leg1MatchId, final.leg2MatchId].filter((id): id is number => id !== null).map((id) => `#${id}`).join(', ') || 'Registro manual'}</td></tr>)}</tbody></table></div> : <p className="stats-intro">Este club no tiene finales históricas registradas.</p>}</div>}
    {selectedClub !== 'all' && <div className="club-palmares-history"><div className="section-heading"><div><h3>Historial de {selectedClub}</h3><p className="stats-intro">Títulos y subcampeonatos que constan en los registros guardados.</p></div><span className="tag">{selectedClubEntries.length} registros</span></div>{selectedClubEntries.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Temporada</th><th scope="col">Competición</th><th scope="col">Distinción</th></tr></thead><tbody>{selectedClubEntries.map((entry, index) => <tr key={`${entry.seasonId}-${entry.awardKey}-${index}`}><td>{entry.seasonName}</td><td>{entry.competitionName}</td><td><strong>{entry.kind === 'champion' ? 'Campeón' : 'Subcampeón'}</strong></td></tr>)}</tbody></table></div> : <Empty title="Sin distinciones en este filtro" text="Este club no tiene títulos ni subcampeonatos registrados para la selección actual." />}</div>}
    <p className="stats-intro club-palmares-note">El sistema actual conserva el subcampeón de Liga, pero no todos los subcampeones de las competiciones eliminatorias ni todas las finales disputadas. Esos datos no se muestran como si estuvieran registrados. Los nombres de clubes se leen tal como quedaron guardados en cada premio histórico.</p>
  </section>
}

function HistoricalRecordsPanel({ players, seasons, matches, stats }: {
  players: Player[]
  seasons: Season[]
  matches: Match[]
  stats: MatchStat[]
}) {
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [recordType, setRecordType] = useState<'goals' | 'assists' | 'appearances' | 'minutes' | 'mvp'>('goals')
  const seasonMatches = matches.filter((match) =>
    (seasonFilter === 'all' || match.seasonId === Number(seasonFilter)) &&
    match.homeScore !== null && match.awayScore !== null,
  )
  const completedById = new Map(seasonMatches.map((match) => [match.id, match]))
  const labels: Record<typeof recordType, string> = {
    goals: 'Máximos goleadores', assists: 'Máximos asistentes', appearances: 'Más apariciones',
    minutes: 'Más minutos jugados', mvp: 'Más premios MVP',
  }
  const valueLabels: Record<typeof recordType, string> = {
    goals: 'Goles', assists: 'Asistencias', appearances: 'Apariciones', minutes: 'Minutos', mvp: 'MVP',
  }
  const rows = players.map((player) => {
    const entries = stats.filter((stat) => stat.playerId === player.id && completedById.has(stat.matchId))
    return {
      player,
      value: recordType === 'appearances'
        ? new Set(entries.filter((entry) => entry.appeared === true).map((entry) => entry.matchId)).size
        : entries.reduce((total, entry) => total + (recordType === 'minutes' ? (entry.minutes ?? 0) : entry[recordType]), 0),
      goals: entries.reduce((total, entry) => total + entry.goals, 0),
      assists: entries.reduce((total, entry) => total + entry.assists, 0),
      appearances: new Set(entries.filter((entry) => entry.appeared === true).map((entry) => entry.matchId)).size,
      minutes: entries.reduce((total, entry) => total + (entry.minutes ?? 0), 0),
      mvp: entries.reduce((total, entry) => total + entry.mvp, 0),
      hasRecords: entries.length > 0,
    }
  }).filter((row) => row.hasRecords).sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name))
  const totalFinished = seasonMatches.length
  const periodLabel = seasonFilter === 'all' ? 'todas las temporadas' : (seasons.find((season) => season.id === Number(seasonFilter))?.name ?? 'temporada seleccionada')
  return <section className="panel historical-records-panel">
    <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Récords históricos</h2><p className="stats-intro">Rankings calculados a partir de las estadísticas registradas en partidos finalizados. No se completan datos que no existan.</p></div><span className="tag">{totalFinished} partidos finalizados</span></div>
    <label className="player-stat-filter historical-season-filter">Periodo<select aria-label="Filtrar récords por temporada" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id).map((season) => <option value={season.id} key={season.id}>{season.name}</option>)}</select></label>
    <div className="historical-record-tabs" role="group" aria-label="Tipo de récord">{(Object.keys(labels) as (typeof recordType)[]).map((key) => <button type="button" key={key} className={recordType === key ? 'selected' : ''} aria-pressed={recordType === key} onClick={() => setRecordType(key)}>{valueLabels[key]}</button>)}</div>
    <div className="section-heading historical-ranking-heading"><div><h3>{labels[recordType]}</h3><p className="stats-intro">Periodo: {periodLabel}. Empates ordenados alfabéticamente.</p></div><span className="tag">{rows.length} jugadores con registros</span></div>
    {rows.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Jugador</th><th scope="col">{valueLabels[recordType]}</th><th scope="col">Goles</th><th scope="col">Asistencias</th><th scope="col">Apariciones</th><th scope="col">Minutos</th><th scope="col">MVP</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.player.id}><td>{index + 1}</td><th scope="row">{row.player.name}</th><td><strong>{row.value}</strong></td><td>{row.goals}</td><td>{row.assists}</td><td>{row.appearances}</td><td>{row.minutes}</td><td>{row.mvp}</td></tr>)}</tbody></table></div> : <Empty title="Todavía no hay récords" text="Cuando existan estadísticas guardadas en partidos finalizados, los rankings aparecerán aquí." />}
    <p className="stats-intro historical-records-note">Las apariciones solo cuentan cuando la participación está marcada explícitamente. Los minutos no registrados se consideran cero únicamente para la suma; no implican que el jugador no haya participado. Los premios MVP se suman desde los registros de estadísticas disponibles.</p>
  </section>
}

function PlayerProfilesPanel({
  players, teams, seasons, selectedSeasonId, seasonRoster, transferHistory, matches, stats, adminAuditEvents,
}: {
  players: Player[]
  teams: Team[]
  seasons: Season[]
  selectedSeasonId: number | null
  seasonRoster: { id: number; seasonId: number; playerId: number; teamId: number; createdAt: string }[]
  transferHistory: { id: number; proposalId: number; seasonId: number; playerId: number; fromTeamId: number; toTeamId: number; note: string; transferredAt: string }[]
  matches: Match[]
  stats: MatchStat[]
  adminAuditEvents: AdminAuditEvent[]
}) {
  const [query, setQuery] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [statsCompetition, setStatsCompetition] = useState('all')
  const teamName = (id: number) => teams.find((team) => team.id === id)?.name ?? `Equipo #${id}`
  const seasonName = (id: number) => seasons.find((season) => season.id === id)?.name ?? `Temporada #${id}`
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredPlayers = [...players]
    .filter((player) => player.name.toLocaleLowerCase().includes(normalizedQuery))
    .sort((a, b) => a.name.localeCompare(b.name))
  const activePlayer = players.find((player) => player.id === selectedPlayerId) ?? filteredPlayers[0] ?? null
  const currentRoster = activePlayer
    ? seasonRoster.find((row) => row.playerId === activePlayer.id && row.seasonId === selectedSeasonId)
    : undefined
  const playerTransfers = activePlayer
    ? transferHistory.filter((row) => row.playerId === activePlayer.id).sort((a, b) => {
      const timeDifference = new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime()
      return timeDifference || b.id - a.id
    })
    : []
  const playerSeasonAssignments = activePlayer
    ? seasonRoster.filter((row) => row.playerId === activePlayer.id).sort((a, b) => {
      const seasonA = seasons.find((season) => season.id === a.seasonId)?.createdAt ?? ''
      const seasonB = seasons.find((season) => season.id === b.seasonId)?.createdAt ?? ''
      return seasonB.localeCompare(seasonA) || b.seasonId - a.seasonId
    })
    : []
  const playerAuditEvents = activePlayer ? adminAuditEvents.filter((event) => {
    if (event.entityType === 'player') return event.entityId === activePlayer.id
    const snapshots = [event.beforeSnapshot, event.afterSnapshot].filter(Boolean) as Record<string, unknown>[]
    return ['roster', 'transfer', 'market_proposal'].includes(event.entityType) && snapshots.some((snapshot) => Number(snapshot.playerId) === activePlayer.id)
  }) : []
  const playerTimeline = activePlayer ? [
    ...playerSeasonAssignments.map((row) => ({
      key: `roster-${row.id}`, date: row.createdAt, category: 'Plantilla',
      title: `Asignación a ${teamName(row.teamId)}`, detail: seasonName(row.seasonId),
    })),
    ...playerTransfers.map((transfer) => ({
      key: `transfer-${transfer.id}`, date: transfer.transferredAt, category: 'Traspaso oficial',
      title: `${teamName(transfer.fromTeamId)} → ${teamName(transfer.toTeamId)}`,
      detail: `${seasonName(transfer.seasonId)}${transfer.note ? ` · ${transfer.note}` : ''}`,
    })),
    ...playerAuditEvents.map((event) => {
      const snapshot = event.afterSnapshot ?? event.beforeSnapshot
      const actionLabel = event.action === 'created' ? 'Creación' : event.action === 'updated' ? 'Modificación' : event.action === 'deleted' ? 'Eliminación' : event.action === 'accepted' ? 'Aceptación' : event.action === 'rejected' ? 'Rechazo' : 'Retirada'
      const entityLabel = event.entityType === 'player' ? 'Ficha de jugador' : event.entityType === 'roster' ? 'Plantilla' : event.entityType === 'transfer' ? 'Traspaso' : 'Propuesta de mercado'
      const detail = event.entityType === 'player'
        ? `${String(event.beforeSnapshot?.name ?? snapshot?.name ?? activePlayer.name)}${event.actorEmail ? ` · ${event.actorEmail}` : ''}`
        : event.entityType === 'roster'
          ? `${teamName(Number(snapshot?.teamId ?? event.beforeSnapshot?.teamId ?? 0))}${event.actorEmail ? ` · ${event.actorEmail}` : ''}`
          : event.entityType === 'transfer'
            ? `${teamName(Number(snapshot?.fromTeamId ?? 0))} → ${teamName(Number(snapshot?.toTeamId ?? 0))}${event.actorEmail ? ` · ${event.actorEmail}` : ''}`
            : `${String(snapshot?.status ?? 'Propuesta')}${event.actorEmail ? ` · ${event.actorEmail}` : ''}`
      return { key: `audit-${event.id}`, date: event.createdAt, category: `Auditoría · ${entityLabel}`, title: actionLabel, detail }
    }),
  ].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
    return (Number.isFinite(dateDiff) ? dateDiff : 0) || b.key.localeCompare(a.key)
  }) : []
  return (
    <div className="player-profiles-layout">
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Fichas de jugadores</h2></div><span className="tag">{players.length} jugadores</span></div>
        <label className="player-search-label">Buscar jugador<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedPlayerId(null) }} placeholder="Escribe un nombre…" /></label>
        {filteredPlayers.length ? <div className="player-profile-picker" role="list" aria-label="Resultados de jugadores">
          {filteredPlayers.map((player) => {
            const roster = seasonRoster.find((row) => row.playerId === player.id && row.seasonId === selectedSeasonId)
            return <button type="button" role="listitem" className={`player-profile-option ${activePlayer?.id === player.id ? 'selected' : ''}`} key={player.id} onClick={() => setSelectedPlayerId(player.id)}>
              <span className="player-profile-option-main"><PlayerAvatar name={player.name} image={player.photoImage} small /><span><strong>{player.name}</strong><small>{roster ? teamName(roster.teamId) : 'Sin asignación en esta temporada'}</small></span></span><ChevronRight size={17} />
            </button>
          })}
        </div> : <Empty title="No hay coincidencias" text="Prueba con otro nombre o borra la búsqueda." />}
      </section>
      <section className="panel player-profile-detail">
        {activePlayer ? <>
          <span className="eyebrow">FICHA DEL JUGADOR</span>
          <div className="player-profile-heading">
            <PlayerAvatar name={activePlayer.name} image={activePlayer.photoImage} />
            <h2>{activePlayer.name}</h2>
          </div>
          <p className="player-current-team">Equipo en {seasonName(selectedSeasonId ?? -1)}: <strong>{currentRoster ? teamName(currentRoster.teamId) : 'Sin asignación registrada'}</strong></p>
          <div className="player-profile-subsection player-stat-profile">
            <div className="section-heading"><h3>Estadísticas de temporada</h3><label className="player-stat-filter">Competición<select value={statsCompetition} onChange={(event) => setStatsCompetition(event.target.value)}><option value="all">Todas las competiciones</option>{competitions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
            {(() => {
              const completedMatches = new Map(matches.filter((match) => match.seasonId === selectedSeasonId && match.homeScore !== null && match.awayScore !== null && (statsCompetition === 'all' || match.competition === statsCompetition)).map((match) => [match.id, match]))
              const playerStats = stats.filter((stat) => stat.playerId === activePlayer.id && completedMatches.has(stat.matchId))
              const totals = playerStats.reduce((acc, stat) => ({ goals: acc.goals + stat.goals, assists: acc.assists + stat.assists, mvp: acc.mvp + stat.mvp, minutes: acc.minutes + (stat.minutes ?? 0) }), { goals: 0, assists: 0, mvp: 0, minutes: 0 })
              const appearances = new Set(playerStats.filter((stat) => stat.appeared === true).map((stat) => stat.matchId)).size
              return <>
                <div className="player-stat-cards"><div><span>Goles</span><strong>{totals.goals}</strong></div><div><span>Asistencias</span><strong>{totals.assists}</strong></div><div><span>Premios MVP</span><strong>{totals.mvp}</strong></div><div><span>Apariciones</span><strong>{appearances}</strong></div><div><span>Minutos</span><strong>{totals.minutes}</strong></div></div>
                <p className="stats-intro">Solo se cuentan partidos finalizados de {seasonName(selectedSeasonId ?? -1)}. “Partidos con registro” no equivale necesariamente a apariciones. Las apariciones se cuentan únicamente cuando la organización marcó que el jugador participó. Los registros históricos anteriores a esta función no se convierten automáticamente en apariciones.</p>
                {playerStats.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Competición</th><th scope="col">Apariciones</th><th scope="col">Minutos</th><th scope="col">Goles</th><th scope="col">Asistencias</th><th scope="col">MVP</th></tr></thead><tbody>{competitions.filter((item) => statsCompetition === 'all' || item.id === statsCompetition).map((item) => { const competitionMatches = new Set([...completedMatches.values()].filter((match) => match.competition === item.id).map((match) => match.id)); const entries = playerStats.filter((stat) => competitionMatches.has(stat.matchId)); if (!entries.length) return null; return <tr key={item.id}><th scope="row">{item.name}</th><td>{new Set(entries.filter((entry) => entry.appeared === true).map((entry) => entry.matchId)).size}</td><td>{entries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0)}</td><td>{entries.reduce((sum, entry) => sum + entry.goals, 0)}</td><td>{entries.reduce((sum, entry) => sum + entry.assists, 0)}</td><td>{entries.reduce((sum, entry) => sum + entry.mvp, 0)}</td></tr> })}</tbody></table></div> : <Empty title="Sin estadísticas registradas" text="Este jugador no tiene estadísticas guardadas en partidos finalizados para esta temporada y competición." />}
              </>
            })()}
          </div>
          <div className="player-profile-subsection player-career-history">
            <div className="section-heading"><div><h3>Trayectoria estadística</h3><p className="stats-intro">Resumen acumulado de todas las temporadas con partidos finalizados y registros estadísticos.</p></div><span className="tag">{seasons.length} temporadas</span></div>
            {(() => {
              const careerRows = [...seasons].sort((a, b) => {
                const dateA = a.createdAt ?? ''
                const dateB = b.createdAt ?? ''
                return dateB.localeCompare(dateA) || b.id - a.id
              }).map((season) => {
                const seasonMatchMap = new Map(matches.filter((match) => match.seasonId === season.id && match.homeScore !== null && match.awayScore !== null).map((match) => [match.id, match]))
                const entries = stats.filter((stat) => stat.playerId === activePlayer.id && seasonMatchMap.has(stat.matchId))
                return {
                  season,
                  appearances: new Set(entries.filter((entry) => entry.appeared === true).map((entry) => entry.matchId)).size,
                  minutes: entries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0),
                  goals: entries.reduce((sum, entry) => sum + entry.goals, 0),
                  assists: entries.reduce((sum, entry) => sum + entry.assists, 0),
                  mvp: entries.reduce((sum, entry) => sum + entry.mvp, 0),
                  hasRecords: entries.length > 0,
                }
              })
              const careerTotals = careerRows.reduce((sum, row) => ({ appearances: sum.appearances + row.appearances, minutes: sum.minutes + row.minutes, goals: sum.goals + row.goals, assists: sum.assists + row.assists, mvp: sum.mvp + row.mvp }), { appearances: 0, minutes: 0, goals: 0, assists: 0, mvp: 0 })
              const recordedCareerRows = careerRows.filter((row) => row.hasRecords)
              return <>
                <div className="player-stat-cards player-career-cards"><div><span>Goles totales</span><strong>{careerTotals.goals}</strong></div><div><span>Asistencias</span><strong>{careerTotals.assists}</strong></div><div><span>Apariciones</span><strong>{careerTotals.appearances}</strong></div><div><span>Minutos</span><strong>{careerTotals.minutes}</strong></div><div><span>MVP</span><strong>{careerTotals.mvp}</strong></div></div>
                {recordedCareerRows.length ? <div className="ranking-scroll"><table><thead><tr><th scope="col">Temporada</th><th scope="col">Apariciones</th><th scope="col">Minutos</th><th scope="col">Goles</th><th scope="col">Asistencias</th><th scope="col">MVP</th></tr></thead><tbody>{recordedCareerRows.map((row) => <tr key={row.season.id}><th scope="row">{row.season.name}</th><td>{row.appearances}</td><td>{row.minutes}</td><td>{row.goals}</td><td>{row.assists}</td><td>{row.mvp}</td></tr>)}</tbody></table></div> : <Empty title="Sin trayectoria estadística" text="Cuando haya estadísticas guardadas en partidos finalizados, el historial aparecerá aquí." />}
                <p className="stats-intro">Las cifras históricas dependen de los registros guardados. Las apariciones se cuentan solo si se marcó explícitamente la participación; los datos antiguos no se reconstruyen ni se inventan.</p>
              </>
            })()}
          </div>
          <div className="player-profile-subsection">
            <div className="section-heading"><h3>Plantillas por temporada</h3><span className="tag">{playerSeasonAssignments.length}</span></div>
            {playerSeasonAssignments.length ? <div className="player-season-list">{playerSeasonAssignments.map((row) => <div className="player-season-row" key={row.id}><span>{seasonName(row.seasonId)}</span><strong>{teamName(row.teamId)}</strong></div>)}</div> : <Empty title="Sin historial de plantillas" text="No hay asignaciones de temporada para este jugador." />}
          </div>
          <div className="player-profile-subsection">
            <div className="section-heading"><h3>Historial de traspasos</h3><span className="tag">{playerTransfers.length}</span></div>
            {playerTransfers.length ? <div className="market-list">{playerTransfers.map((transfer) => <article className="market-item" key={transfer.id}>
              <div><strong>{teamName(transfer.fromTeamId)} <ArrowRight size={14} /> {teamName(transfer.toTeamId)}</strong><p>{seasonName(transfer.seasonId)}</p>{transfer.note && <small>{transfer.note}</small>}</div>
              <time className="market-transfer-date" dateTime={transfer.transferredAt}>{new Date(transfer.transferredAt).toLocaleString()}</time>
            </article>)}</div> : <Empty title="Sin traspasos registrados" text="Los traspasos completados aparecerán aquí por jugador y temporada." />}
          </div>
          <div className="player-profile-subsection player-dossier-timeline">
            <div className="section-heading"><div><h3>Expediente cronológico</h3><p className="stats-intro">Trayectoria deportiva y cambios administrativos disponibles para este jugador.</p></div><span className="tag">{playerTimeline.length} eventos</span></div>
            {playerTimeline.length ? <ol className="player-timeline" aria-label={`Cronología de ${activePlayer.name}`}>
              {playerTimeline.map((event) => <li key={event.key} className="player-timeline-event">
                <span className="player-timeline-marker" aria-hidden="true" />
                <div className="player-timeline-content"><div className="player-timeline-heading"><span className="tag">{event.category}</span><time dateTime={event.date}>{Number.isFinite(new Date(event.date).getTime()) ? new Date(event.date).toLocaleString() : 'Fecha no disponible'}</time></div><strong>{event.title}</strong><p>{event.detail}</p></div>
              </li>)}
            </ol> : <Empty title="Sin eventos cronológicos" text="Cuando existan asignaciones, traspasos o eventos administrativos registrados, aparecerán en este expediente." />}
            <p className="stats-intro">La cronología combina fuentes disponibles y puede contener eventos de auditoría además del registro deportivo original. Los cambios anteriores a la activación de la auditoría no se reconstruyen.</p>
          </div>
        </> : <Empty title="Selecciona un jugador" text="Busca un nombre para consultar su equipo por temporada y sus traspasos completados." />}
      </section>
    </div>
  )
}


function PlayerComparisonPanel({ players, teams, seasons, selectedSeasonId, seasonRoster, transferHistory, matches, stats }: {
  players: Player[]
  teams: Team[]
  seasons: Season[]
  selectedSeasonId: number | null
  seasonRoster: { id: number; seasonId: number; playerId: number; teamId: number; createdAt: string }[]
  transferHistory: { id: number; proposalId: number; seasonId: number; playerId: number; fromTeamId: number; toTeamId: number; note: string; transferredAt: string }[]
  matches: Match[]
  stats: MatchStat[]
}) {
  const [leftPlayerId, setLeftPlayerId] = useState<number | null>(null)
  const [rightPlayerId, setRightPlayerId] = useState<number | null>(null)
  const [seasonFilter, setSeasonFilter] = useState<string>(selectedSeasonId === null ? 'all' : String(selectedSeasonId))
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name))
  const firstPlayerId = sortedPlayers[0]?.id ?? null
  const secondPlayerId = sortedPlayers.find((player) => player.id !== firstPlayerId)?.id ?? firstPlayerId
  const playerA = players.find((player) => player.id === leftPlayerId) ?? players.find((player) => player.id === firstPlayerId) ?? null
  const playerB = players.find((player) => player.id === rightPlayerId) ?? players.find((player) => player.id === secondPlayerId) ?? null
  const competitionLabels: Record<string, string> = {
    liga: 'Liga', champions: 'Champions League', europa: 'Europa League', copa: 'Copa',
    supercopa_liga: 'Supercopa de la Liga', supercopa_europa: 'Supercopa de Europa',
  }
  const includedMatches = matches.filter((match) =>
    match.homeScore !== null && match.awayScore !== null &&
    (seasonFilter === 'all' || match.seasonId === Number(seasonFilter)) &&
    (competitionFilter === 'all' || match.competition === competitionFilter),
  )
  const matchMap = new Map(includedMatches.map((match) => [match.id, match]))
  const summarize = (player: Player | null) => {
    if (!player) return { goals: 0, assists: 0, appearances: 0, minutes: 0, mvp: 0, statMatches: 0, competitions: {} as Record<string, { goals: number; assists: number; appearances: number; minutes: number; mvp: number }> }
    const entries = stats.filter((stat) => stat.playerId === player.id && matchMap.has(stat.matchId))
    const competitions = Object.fromEntries(Object.keys(competitionLabels).map((competition) => [competition, { goals: 0, assists: 0, appearances: 0, minutes: 0, mvp: 0 }])) as Record<string, { goals: number; assists: number; appearances: number; minutes: number; mvp: number }>
    for (const entry of entries) {
      const match = matchMap.get(entry.matchId)
      if (!match) continue
      const row = competitions[match.competition]
      if (!row) continue
      row.goals += entry.goals
      row.assists += entry.assists
      row.appearances += entry.appeared === true ? 1 : 0
      row.minutes += entry.minutes ?? 0
      row.mvp += entry.mvp
    }
    return {
      goals: entries.reduce((sum, row) => sum + row.goals, 0),
      assists: entries.reduce((sum, row) => sum + row.assists, 0),
      appearances: new Set(entries.filter((row) => row.appeared === true).map((row) => row.matchId)).size,
      minutes: entries.reduce((sum, row) => sum + (row.minutes ?? 0), 0),
      mvp: entries.reduce((sum, row) => sum + row.mvp, 0),
      statMatches: new Set(entries.map((row) => row.matchId)).size,
      competitions,
    }
  }
  const summaryA = summarize(playerA)
  const summaryB = summarize(playerB)
  const teamName = (id: number) => teams.find((team) => team.id === id)?.name ?? `Equipo #${id}`
  const seasonName = (id: number) => seasons.find((season) => season.id === id)?.name ?? `Temporada #${id}`
  const clubJourney = (player: Player | null) => {
    if (!player) return 'Sin datos de clubes'
    const teamsFromRoster = seasonRoster.filter((row) => row.playerId === player.id && (seasonFilter === 'all' || row.seasonId === Number(seasonFilter)))
      .sort((a, b) => b.seasonId - a.seasonId)
      .map((row) => `${teamName(row.teamId)} (${seasonName(row.seasonId)})`)
    const transfers = transferHistory.filter((row) => row.playerId === player.id && (seasonFilter === 'all' || row.seasonId === Number(seasonFilter)))
    if (!teamsFromRoster.length && !transfers.length) return 'Sin historial de clubes registrado en el periodo'
    const unique = [...new Set(teamsFromRoster)]
    const moveText = transfers.map((row) => `${teamName(row.fromTeamId)} → ${teamName(row.toTeamId)}`)
    return [...unique, ...moveText].join(' · ')
  }
  const metricRows: { label: string; key: 'goals' | 'assists' | 'appearances' | 'minutes' | 'mvp' }[] = [
    { label: 'Goles', key: 'goals' }, { label: 'Asistencias', key: 'assists' },
    { label: 'Apariciones registradas', key: 'appearances' }, { label: 'Minutos jugados', key: 'minutes' },
    { label: 'Premios MVP', key: 'mvp' },
  ]
  return <div className="player-comparison-layout">
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Comparar jugadores</h2><p className="stats-intro">Compara rendimiento, competiciones y trayectoria con los registros disponibles. Los datos faltantes no se estiman.</p></div><span className="tag">{players.length} jugadores</span></div>
      <div className="player-comparison-filters">
        <label>Jugador A<select aria-label="Jugador A" value={playerA?.id ?? ''} onChange={(event) => setLeftPlayerId(event.target.value ? Number(event.target.value) : null)}><option value="">Seleccionar jugador</option>{sortedPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
        <label>Jugador B<select aria-label="Jugador B" value={playerB?.id ?? ''} onChange={(event) => setRightPlayerId(event.target.value ? Number(event.target.value) : null)}><option value="">Seleccionar jugador</option>{sortedPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
        <label>Periodo<select aria-label="Periodo estadístico" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}><option value="all">Todas las temporadas</option>{[...seasons].sort((a, b) => b.id - a.id).map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
        <label>Competición<select aria-label="Competición estadística" value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competiciones</option>{Object.entries(competitionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
      {!playerA || !playerB ? <Empty title="No hay suficientes jugadores" text="Añade al menos un jugador para consultar una comparación." /> : playerA.id === playerB.id ? <div className="error-box" role="status">Selecciona dos jugadores diferentes para comparar sus estadísticas.</div> : <>
        <div className="player-comparison-headings"><div><span className="eyebrow">JUGADOR A</span><h3>{playerA.name}</h3></div><span className="player-comparison-vs">VS</span><div><span className="eyebrow">JUGADOR B</span><h3>{playerB.name}</h3></div></div>
        <div className="ranking-scroll"><table className="player-comparison-table"><thead><tr><th scope="col">Estadística</th><th scope="col">{playerA.name}</th><th scope="col">{playerB.name}</th><th scope="col">Diferencia A − B</th></tr></thead><tbody>{metricRows.map((metric) => {
          const a = summaryA[metric.key], b = summaryB[metric.key]
          return <tr key={metric.key}><th scope="row">{metric.label}</th><td>{a.toLocaleString()}</td><td>{b.toLocaleString()}</td><td>{(a - b).toLocaleString()}</td></tr>
        })}</tbody></table></div>
        <p className="stats-intro">Partidos con registros estadísticos: {summaryA.statMatches} para {playerA.name} y {summaryB.statMatches} para {playerB.name}. Las apariciones solo cuentan cuando se registró explícitamente la participación.</p>
        <div className="player-profile-subsection"><div className="section-heading"><h3>Comparación por competición</h3><span className="tag">{seasonFilter === 'all' ? 'Todas las temporadas' : seasonName(Number(seasonFilter))}</span></div><div className="ranking-scroll"><table><thead><tr><th scope="col">Competición</th><th scope="col">{playerA.name} · G/A/MVP</th><th scope="col">{playerB.name} · G/A/MVP</th></tr></thead><tbody>{Object.entries(competitionLabels).filter(([id]) => competitionFilter === 'all' || competitionFilter === id).map(([id, label]) => { const a = summaryA.competitions[id] ?? { goals: 0, assists: 0, mvp: 0 }; const b = summaryB.competitions[id] ?? { goals: 0, assists: 0, mvp: 0 }; return <tr key={id}><th scope="row">{label}</th><td>{a.goals} / {a.assists} / {a.mvp}</td><td>{b.goals} / {b.assists} / {b.mvp}</td></tr> })}</tbody></table></div></div>
        <div className="player-comparison-clubs"><article><h3>Trayectoria de {playerA.name}</h3><p>{clubJourney(playerA)}</p><span className="tag">{transferHistory.filter((row) => row.playerId === playerA.id && (seasonFilter === 'all' || row.seasonId === Number(seasonFilter))).length} traspasos registrados</span></article><article><h3>Trayectoria de {playerB.name}</h3><p>{clubJourney(playerB)}</p><span className="tag">{transferHistory.filter((row) => row.playerId === playerB.id && (seasonFilter === 'all' || row.seasonId === Number(seasonFilter))).length} traspasos registrados</span></article></div>
      </>}
    </section>
  </div>
}


function MarketPanel({
  seasonId, proposals, seasonRoster, transferHistory, players, teams, isAdmin, busy, onMutate,
}: {
  seasonId: number | null
  proposals: { id: number; seasonId: number; playerId: number; fromTeamId: number; toTeamId: number; note: string; status: 'pending' | 'withdrawn' | 'accepted' | 'rejected'; createdAt: string; updatedAt: string }[]
  seasonRoster: { id: number; seasonId: number; playerId: number; teamId: number; createdAt: string }[]
  transferHistory: { id: number; proposalId: number; seasonId: number; playerId: number; fromTeamId: number; toTeamId: number; note: string; transferredAt: string }[]
  players: Player[]
  teams: Team[]
  isAdmin: boolean
  busy: boolean
  onMutate: (body: unknown) => Promise<boolean>
}) {
  const [playerId, setPlayerId] = useState('')
  const [toTeamId, setToTeamId] = useState('')
  const [note, setNote] = useState('')
  const teamName = (id: number) => teams.find((team) => team.id === id)?.name ?? `Equipo #${id}`
  const playerName = (id: number) => players.find((player) => player.id === id)?.name ?? `Jugador #${id}`
  const selectedPlayer = players.find((player) => player.id === Number(playerId))
  const teamForPlayer = (id: number) => seasonRoster.find((row) => row.playerId === id)?.teamId
  const availablePlayers = players.filter((player) => teamForPlayer(player.id) !== undefined)
  return (
    <div className="market-layout">
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">UNIVERSE FAMILY LEAGUE</span><h2>Mercado de jugadores</h2></div>
          <span className="tag">{proposals.filter((item) => item.status === 'pending').length} pendientes</span>
        </div>
        <p>Registra propuestas y resuelve traspasos de esta temporada. Al aceptar, cambia únicamente la plantilla de esta temporada; las estadísticas y temporadas anteriores se conservan.</p>
        {isAdmin ? (
          <form className="admin-form" onSubmit={async (event) => {
            event.preventDefault()
            if (!seasonId || !selectedPlayer || !toTeamId) return
            const ok = await onMutate({ action: 'createMarketProposal', seasonId, playerId: selectedPlayer.id, toTeamId: Number(toTeamId), note })
            if (ok) { setPlayerId(''); setToTeamId(''); setNote('') }
          }}>
            <label>Jugador<select required value={playerId} onChange={(event) => { setPlayerId(event.target.value); setToTeamId('') }}><option value="">Seleccionar jugador</option>{[...availablePlayers].sort((a,b) => a.name.localeCompare(b.name)).map((player) => <option key={player.id} value={player.id}>{player.name} · {teamName(teamForPlayer(player.id) ?? player.teamId)}</option>)}</select></label>
            <label>Equipo de destino<select required value={toTeamId} onChange={(event) => setToTeamId(event.target.value)}><option value="">Seleccionar destino</option>{teams.filter((team) => team.id !== (selectedPlayer ? teamForPlayer(selectedPlayer.id) : null)).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <label>Nota (opcional)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} placeholder="Condiciones o comentarios de la propuesta" /></label>
            <button className="primary" disabled={busy || !seasonId || !selectedPlayer || !toTeamId}>Registrar propuesta</button>
          </form>
        ) : <p className="tag">Solo la administración puede registrar o retirar propuestas.</p>}
      </section>
      <section className="panel">
        <h3>Propuestas de la temporada</h3>
        {proposals.length ? <div className="market-list">{proposals.map((proposal) => (
          <article className="market-item" key={proposal.id}>
            <div><strong>{playerName(proposal.playerId)}</strong><p>{teamName(proposal.fromTeamId)} <ArrowRight size={14} /> {teamName(proposal.toTeamId)}</p>{proposal.note && <small>{proposal.note}</small>}</div>
            <div className="market-item-actions">
              <span className={`tag ${proposal.status === 'pending' ? 'pending' : ''}`}>{proposal.status === 'pending' ? 'Pendiente' : proposal.status === 'withdrawn' ? 'Retirada' : proposal.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span>
              {isAdmin && proposal.status === 'pending' && <>
                <button disabled={busy} onClick={() => { if (window.confirm('¿Aceptar el traspaso? Solo cambiará la plantilla de esta temporada.')) void onMutate({ action: 'decideMarketProposal', id: proposal.id, decision: 'accept' }) }}>Aceptar</button>
                <button disabled={busy} onClick={() => void onMutate({ action: 'decideMarketProposal', id: proposal.id, decision: 'reject' })}>Rechazar</button>
                <button disabled={busy} onClick={() => void onMutate({ action: 'withdrawMarketProposal', id: proposal.id })}>Retirar</button>
              </>}
            </div>
          </article>
        ))}</div> : <Empty title="El mercado está tranquilo" text="Todavía no hay propuestas registradas para esta temporada." />}
      </section>
      <section className="panel market-history-panel">
        <div className="section-heading"><div><span className="eyebrow">REGISTRO HISTÓRICO</span><h3>Traspasos completados</h3></div><span className="tag">{transferHistory.length} operaciones</span></div>
        {transferHistory.length ? <div className="market-list">{transferHistory.map((transfer) => (
          <article className="market-item" key={transfer.id}>
            <div><strong>{playerName(transfer.playerId)}</strong><p>{teamName(transfer.fromTeamId)} <ArrowRight size={14} /> {teamName(transfer.toTeamId)}</p>{transfer.note && <small>{transfer.note}</small>}</div>
            <time className="market-transfer-date" dateTime={transfer.transferredAt}>{new Date(transfer.transferredAt).toLocaleString()}</time>
          </article>
        ))}</div> : <Empty title="Sin traspasos completados" text="Los traspasos aceptados aparecerán aquí con su fecha y equipos de origen y destino." />}
      </section>
    </div>
  )
}
