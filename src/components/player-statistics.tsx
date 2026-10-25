import { useState } from 'react'
import {
  playerStandings,
  type Match,
  type MatchStat,
  type Player,
  type Team,
} from '@/lib/tournament'
import { Crest, PlayerAvatar } from '@/components/media'

type Data = {
  teams: Team[]
  matches: Match[]
  players: Player[]
  stats: MatchStat[]
}

export function PlayerTables({
  data,
  competition,
}: {
  data: Data
  competition: string
}) {
  const rows = playerStandings(
    data.players,
    data.matches,
    data.stats,
    competition,
  )
  return (
    <div className="player-tables">
      <p className="stats-intro">
        Cada actuación cuenta. Goles, asistencias y premios MVP de los partidos
        finalizados de esta competición. Los empates comparten posición.
      </p>
      {(
        [
          { key: 'goals', title: 'Goleadores', unit: 'Goles', number: '01' },
          {
            key: 'assists',
            title: 'Asistidores',
            unit: 'Asistencias',
            number: '02',
          },
          { key: 'mvp', title: 'MVP', unit: 'Premios MVP', number: '03' },
        ] as const
      ).map(({ key, title, unit, number }) => {
        const ranked = rows
          .filter((r) => r[key] > 0)
          .sort(
            (a, b) =>
              b[key] - a[key] || a.name.localeCompare(b.name) || a.id - b.id,
          )
        return (
          <section
            className="panel player-ranking"
            key={key}
            aria-label={title}
          >
            <div className="panel-heading">
              <h3>{title}</h3>
              <span className="ranking-number">{number}</span>
            </div>
            {ranked.length ? (
              <div className="ranking-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Pos.</th>
                      <th scope="col">Jugador</th>
                      <th scope="col">Equipo</th>
                      <th scope="col">{unit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((p) => {
                      const team = data.teams.find((t) => t.id === p.teamId)
                      return (
                        <tr key={p.id}>
                          <td>
                            {ranked.findIndex((r) => r[key] === p[key]) + 1}
                          </td>
                          <th scope="row">
                            <span className="table-player">
                              <PlayerAvatar name={p.name} image={p.photoImage} small />
                              {p.name}
                            </span>
                          </th>
                          <td>
                            <span className="table-player">
                              {team && <Crest name={team.name} small image={team.crestImage} />}
                              {team?.name}
                            </span>
                          </td>
                          <td className="stat-total">{p[key]}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="small-empty">
                <h4>Aún no hay {unit.toLowerCase()} registrados.</h4>
                <p>
                  La organización añade las estadísticas y el MVP al guardar los
                  resultados.
                </p>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function MatchResultEditor({
  match,
  data,
  busy,
  mutate,
}: {
  match: Match
  data: Data
  busy: boolean
  mutate: (body: unknown) => Promise<boolean>
}) {
  const roster = data.players.filter(
    (p) => p.teamId === match.homeId || p.teamId === match.awayId,
  )
  const [mvp, setMvp] = useState(
    String(
      data.stats.find((s) => s.matchId === match.id && s.mvp === 1)?.playerId ??
        '',
    ),
  )
  const teamName = (id: number) => data.teams.find((t) => t.id === id)?.name
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        void mutate({
          action: 'result',
          id: match.id,
          homeScore: f.get('hs') === '' ? null : Number(f.get('hs')),
          awayScore: f.get('as') === '' ? null : Number(f.get('as')),
          homePenaltyScore: f.get('hp') == null || f.get('hp') === '' ? null : Number(f.get('hp')),
          awayPenaltyScore: f.get('ap') == null || f.get('ap') === '' ? null : Number(f.get('ap')),
          scheduledAt: f.get('date')
            ? new Date(String(f.get('date')) + 'Z').toISOString()
            : null,
          mvpPlayerId: mvp ? Number(mvp) : null,
          stats: roster
            .map((p) => ({
              playerId: p.id,
              goals: Number(f.get(`goals-${p.id}`)),
              assists: Number(f.get(`assists-${p.id}`)),
              appeared: f.get(`appeared-${p.id}`) === 'on',
              minutes: Number(f.get(`minutes-${p.id}`) || 0),
            }))
            .filter((s) => s.appeared || s.goals || s.assists || s.playerId === Number(mvp)),
        })
      }}
    >
      <label>
        {teamName(match.homeId)}
        <input
          type="number"
          min="0"
          max="99"
          name="hs"
          defaultValue={match.homeScore ?? ''}
        />
      </label>
      <label>
        {teamName(match.awayId)}
        <input
          type="number"
          min="0"
          max="99"
          name="as"
          defaultValue={match.awayScore ?? ''}
        />
      </label>
      {['champions', 'europa', 'copa', 'supercopa_liga', 'supercopa_europa'].includes(match.competition) && match.round.endsWith(' · Vuelta') && (
        <>
          <p>Si el global termina empatado, registra aquí los penaltis para definir al clasificado.</p>
          <label>
            Penaltis · {teamName(match.homeId)}
            <input type="number" min="0" max="99" name="hp" defaultValue={match.homePenaltyScore ?? ''} />
          </label>
          <label>
            Penaltis · {teamName(match.awayId)}
            <input type="number" min="0" max="99" name="ap" defaultValue={match.awayPenaltyScore ?? ''} />
          </label>
        </>
      )}
      <label>
        Fecha y hora (UTC)
        <input
          type="datetime-local"
          name="date"
          defaultValue={match.scheduledAt?.slice(0, 16)}
        />
      </label>
      <p>
        Deja ambos marcadores vacíos para devolver el partido a pendiente y
        retirar sus estadísticas de las tablas.
      </p>
      <h3>Estadísticas del partido</h3>
      <p>
        Marca quién participó y registra sus minutos, goles y asistencias. Los totales de goles y asistencias de cada equipo no pueden superar su marcador. Puedes completar estadísticas faltantes más adelante.
      </p>
      {!roster.length && (
        <p>Primero registra los jugadores de estos equipos en «Jugadores».</p>
      )}
      {[match.homeId, match.awayId].map((teamId) => (
        <fieldset className="stats-fieldset" key={teamId}>
          <legend>{teamName(teamId)}</legend>
          {roster
            .filter((p) => p.teamId === teamId)
            .map((p) => {
              const stat = data.stats.find(
                (s) => s.matchId === match.id && s.playerId === p.id,
              )
              return (
                <div className="player-stat-inputs" key={p.id}>
                  <strong>{p.name}</strong>
                  <label className="player-appearance-toggle">
                    Participó
                    <input type="checkbox" name={`appeared-${p.id}`} defaultChecked={stat?.appeared ?? Boolean(stat)} />
                  </label>
                  <label>
                    Minutos
                    <input aria-label={`Minutos de ${p.name} (${teamName(teamId)})`} type="number" name={`minutes-${p.id}`} min="0" max="120" defaultValue={stat?.minutes ?? 0} />
                  </label>
                  <label>
                    Goles
                    <input
                      aria-label={`Goles de ${p.name} (${teamName(teamId)})`}
                      type="number"
                      name={`goals-${p.id}`}
                      min="0"
                      max="99"
                      required
                      defaultValue={stat?.goals ?? 0}
                    />
                  </label>
                  <label>
                    Asistencias
                    <input
                      aria-label={`Asistencias de ${p.name} (${teamName(teamId)})`}
                      type="number"
                      name={`assists-${p.id}`}
                      min="0"
                      max="99"
                      required
                      defaultValue={stat?.assists ?? 0}
                    />
                  </label>
                </div>
              )
            })}
        </fieldset>
      ))}
      <label>
        MVP del partido
        <select value={mvp} onChange={(e) => setMvp(e.target.value)}>
          <option value="">Sin MVP seleccionado</option>
          {roster.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {teamName(p.teamId)}
            </option>
          ))}
        </select>
      </label>
      <button className="primary" disabled={busy}>
        Guardar resultado, estadísticas y MVP
      </button>
    </form>
  )
}
