import type { PlayerContract } from '@shared/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { ContentSpinner } from '../../components/ContentSpinner';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentTierlistPage.module.css';

const TIER_LEVELS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

interface TierRow {
  level: number;
  players: PlayerContract[];
}

function getTierRowBackground(level: number) {
  const hue = level * 12;
  return `linear-gradient(90deg, hsla(${hue}, 82%, 42%, 0.95) 0%, hsla(${hue}, 74%, 30%, 0.88) 22%, rgba(16, 18, 24, 0.92) 100%)`;
}

export function TournamentTierlistPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    queueMicrotask(() => setIsLoading(true));
    void apiClient
      .getPlayers(tournamentId)
      .then(setPlayers)
      .finally(() => setIsLoading(false));
  }, [tournamentId]);

  const tierRows = useMemo<TierRow[]>(() => {
    const groupedPlayers = new Map<number, PlayerContract[]>();

    for (const level of TIER_LEVELS) {
      groupedPlayers.set(level, []);
    }

    for (const player of players) {
      const playerLevel = player.ability ?? 0;
      const safeLevel = Math.min(10, Math.max(0, playerLevel));
      const row = groupedPlayers.get(safeLevel);
      if (!row) {
        continue;
      }

      row.push(player);
    }

    return TIER_LEVELS.map((level) => ({
      level,
      players: (groupedPlayers.get(level) ?? []).sort((left, right) => {
        const leftName = left.nickname?.trim() || left.name;
        const rightName = right.nickname?.trim() || right.name;
        return leftName.localeCompare(rightName, 'es');
      }),
    }));
  }, [players]);

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  if (!permissions.canViewTierlist) {
    return <Navigate replace to={`/tournaments/${tournamentId}`} />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <h2>Tierlist</h2>
          <p className={styles.subtitle}>{tournament.name}</p>
        </div>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}`}>
          Volver
        </Link>
      </div>

      {isLoading ? (
        <ContentSpinner />
      ) : (
        <div className={styles.rows}>
          {tierRows.map((row) => (
            <article className={styles.row} key={row.level} style={{ background: getTierRowBackground(row.level) }}>
              <div className={styles.levelCell}>
                <span className={styles.levelLabel}>Habilidad</span>
                <strong className={styles.levelValue}>{row.level}</strong>
              </div>

              <div className={styles.playersCell}>
                {row.players.length > 0 ? (
                  row.players.map((player) => (
                    <span className={styles.playerChip} key={player.id}>
                      {player.nickname?.trim() || player.name}
                    </span>
                  ))
                ) : (
                  <span className={styles.emptyState}>Sin jugadores en este nivel</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
