import type { PlayerContract, TournamentSummaryContract, UserProfile } from '@shared/contracts';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { DisplayPreference } from '@shared/enums';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ContentSpinner } from '../../components/ContentSpinner';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentTablePage.module.css';

export function TournamentTablePage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [summary, setSummary] = useState<TournamentSummaryContract | null>(null);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);

  const resolvePlayerVisual = (player: PlayerContract | undefined, users: UserProfile[]) => {
    if (!player) {
      return { kind: 'fallback' as const, value: '?' };
    }

    const linkedUser = users.find((user) => user.id === player.userId);
    const imageUrl = player.imageUrl ?? linkedUser?.imageUrl ?? null;

    if (player.displayPreference === DisplayPreference.FAVORITE_TEAM) {
      const team = FAVORITE_TEAMS.find((item) => item.slug === player.favoriteTeamSlug);
      if (team?.imageUrl) {
        return { kind: 'image' as const, value: team.imageUrl, alt: 'Equipo' };
      }
    }

    if (imageUrl) {
      return { kind: 'image' as const, value: imageUrl, alt: 'Jugador' };
    }

    return { kind: 'fallback' as const, value: (player.nickname ?? player.name).slice(0, 1) };
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
                <th>MVP</th>
                <th>Puntos</th>
                <th>Goles</th>
                <th>G</th>
                <th>E</th>
                <th>P</th>
              </tr>
            </thead>
            <tbody>
              {summary?.standings.map((row) => (
                <tr
                  className={`${row.position === 1 ? styles.firstPlace : ''} ${row.position === 2 ? styles.secondPlace : ''} ${row.position === 3 ? styles.thirdPlace : ''} ${summary.topScorerPlayerId === row.playerId ? styles.topScorer : ''}`}
                  key={row.playerId}
                >
                  <td>{row.position}</td>
                  <td>
                    <div className={styles.playerCell}>
                      {(() => {
                        const player = players.find((item) => item.id === row.playerId);
                        const visual = resolvePlayerVisual(player, data.users);
                        if (visual.kind === 'image') {
                          return <img alt={visual.alt} className={styles.avatar} src={visual.value} />;
                        }
                        return <span className={styles.avatarFallback}>{visual.value}</span>;
                      })()}
                      <span>{row.displayName}</span>
                    </div>
                  </td>
                  <td>{row.mvp}</td>
                  <td>{row.points}</td>
                  <td>{row.goals}</td>
                  <td className={styles.win}>{row.win}</td>
                  <td className={styles.draw}>{row.draw}</td>
                  <td className={styles.loose}>{row.loose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
