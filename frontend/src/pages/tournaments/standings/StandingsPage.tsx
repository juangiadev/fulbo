import type {
  PlayerContract,
  PlayerRecentMatchResultContract,
  TournamentSummaryContract,
} from '@shared/contracts';
import { TeamResult, TournamentFormat, TournamentType } from '@shared/enums';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ContentSpinner } from '../../../components/ContentSpinner';
import { PlayerAvatar } from '../../../components/PlayerAvatar';
import { apiClient } from '../../../api/client';
import { useAppContext } from '../../../state/AppContext';
import buttonStyles from '../../../styles/Button.module.css';
import styles from './StandingsPage.module.css';

export function StandingsPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [summary, setSummary] = useState<TournamentSummaryContract | null>(null);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const isTeamTournament = tournament?.type === TournamentType.TEAMS;
  const isTeamLigaTournament = isTeamTournament && tournament?.format === TournamentFormat.LIGA;
  const topScoringTeamRow = isTeamTournament
    ? summary?.standings.reduce<(typeof summary.standings)[number] | null>((best, current) => {
        const currentGoals = current.goalsFor ?? current.goals;
        const bestGoals = best ? (best.goalsFor ?? best.goals) : -1;

        if (!best || currentGoals > bestGoals) {
          return current;
        }

        return best;
      }, null) ?? null
    : null;
  const topScoringTeamGoals = topScoringTeamRow
    ? (topScoringTeamRow.goalsFor ?? topScoringTeamRow.goals)
    : 0;
  const topScoringTeamId = topScoringTeamGoals > 0 ? topScoringTeamRow?.playerId ?? null : null;

  const renderRecentForm = (items: PlayerRecentMatchResultContract[]) => {
    const visibleItems = items.slice(0, 5);
    const emptySlots = Math.max(0, 5 - visibleItems.length);

    return (
      <div className={styles.formList}>
        {visibleItems.map((item) => {
          const variantClassName =
            item.result === TeamResult.WINNER
              ? styles.formWin
              : item.result === TeamResult.LOSER
                ? styles.formLoss
                : styles.formDraw;
          const label =
            item.result === TeamResult.WINNER
              ? 'V'
              : item.result === TeamResult.LOSER
                ? 'D'
                : 'E';

          return (
            <span
              key={`${item.matchId}-${item.result}`}
              className={`${styles.formBox} ${variantClassName}`}
              title={`Fecha ${item.matchday} · ${new Date(item.kickoffAt).toLocaleDateString('es-AR')}`}
            >
              {label}
            </span>
          );
        })}
        {Array.from({ length: emptySlots }, (_, index) => (
          <span key={`empty-${index + 1}`} className={`${styles.formBox} ${styles.formEmpty}`}>
            -
          </span>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    queueMicrotask(() => setIsLoading(true));
    void Promise.all([apiClient.getTournamentSummary(tournamentId), apiClient.getPlayers(tournamentId)])
      .then(([nextSummary, nextPlayers]) => {
        setSummary(nextSummary);
        setPlayers(nextPlayers);
      })
      .finally(() => setIsLoading(false));
  }, [tournamentId]);

  if (!tournamentId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Tabla</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}`}>
          Volver
        </Link>
      </div>

      <div className={styles.tableWrap}>
        {isLoading ? (
          <ContentSpinner />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Posicion</th>
                <th>Nombre</th>
                {isTeamTournament ? null : <th>MVP</th>}
                <th>Puntos</th>
                <th>{isTeamTournament ? 'GF' : 'Goles'}</th>
                {isTeamTournament ? <th>GC</th> : null}
                <th>G</th>
                <th>E</th>
                <th>P</th>
                <th>Ult. 5</th>
              </tr>
            </thead>
            <tbody>
              {summary?.standings.map((row) => (
                <tr
                  className={`${row.position === 1 ? styles.firstPlace : ''} ${row.position === 2 ? styles.secondPlace : ''} ${row.position === 3 ? styles.thirdPlace : ''}`}
                  key={row.playerId}
                >
                  <td>
                    <div className={styles.positionCell}>
                      <span>{row.position}</span>
                      {(!isTeamTournament && summary.topScorerPlayerId === row.playerId) ||
                      (isTeamTournament && topScoringTeamId === row.playerId) ? (
                        <img alt="Goleador" className={styles.topScorerIcon} src="/pelota-gol.png" />
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className={styles.playerCell}>
                      {isTeamTournament ? (
                        row.imageUrl ? (
                          <img alt="" className={styles.avatarTeam} src={row.imageUrl} />
                        ) : null
                      ) : (
                        <PlayerAvatar
                          classNames={{
                            avatar: styles.avatar,
                            avatarFallback: styles.avatarFallback,
                            avatarTeam: styles.avatarTeam,
                          }}
                          player={players.find((item) => item.id === row.playerId)}
                        />
                      )}
                      <span className={styles.playerName}>{row.displayName}</span>
                    </div>
                  </td>
                  {isTeamTournament ? null : <td>{row.mvp}</td>}
                  <td>{row.points}</td>
                  <td>{row.goalsFor ?? row.goals}</td>
                  {isTeamTournament ? <td>{row.goalsAgainst ?? 0}</td> : null}
                  <td className={styles.win}>{row.win}</td>
                  <td className={styles.draw}>{row.draw}</td>
                  <td className={styles.loose}>{row.loose}</td>
                  <td>{renderRecentForm(row.recentForm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isTeamLigaTournament && !isLoading ? (
        <section aria-labelledby="scorer-ranking-title" className={styles.scorerSection}>
          <div className={styles.scorerHeader}>
            <h3 id="scorer-ranking-title">Tabla de goleadores</h3>
            <p>Ranking individual por goles y partidos jugados.</p>
          </div>
          {summary?.scorerRanking.length ? (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.scorerTable}`}>
                <thead>
                  <tr>
                    <th>Posicion</th>
                    <th>Jugador</th>
                    <th>Goles</th>
                    <th>PJ</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.scorerRanking.map((row) => (
                    <tr key={row.playerId}>
                      <td>{row.position}</td>
                      <td>
                        <div className={styles.playerCell}>
                          {row.imageUrl ? <img alt="" className={styles.avatar} src={row.imageUrl} /> : null}
                          <span className={styles.playerName}>{row.name}</span>
                          {summary.topScorerPlayerId === row.playerId ? (
                            <img alt="Goleador" className={styles.topScorerIcon} src="/pelota-gol.png" />
                          ) : null}
                        </div>
                      </td>
                      <td>{row.goals}</td>
                      <td>{row.matchesPlayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyRanking} role="status">
              Todavía no hay goleadores. Cargá partidos finalizados con participantes para armar el ranking.
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
