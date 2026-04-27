import type {
  PlayerContract,
  PlayerRecentMatchResultContract,
  PlayerTeamContract,
  TeamContract,
} from '@shared/contracts';
import { TeamResult } from '@shared/enums';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import styles from './MatchPlayersTableReadonly.module.css';

interface MatchPlayersTableReadonlyProps {
  matchId: string;
  players: PlayerContract[];
}

const withAlpha = (hex: string, alpha: string): string =>
  /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;

const PLAYER_FORM_LABELS = {
  [TeamResult.WINNER]: 'V',
  [TeamResult.LOSER]: 'D',
  [TeamResult.DRAW]: 'E',
  [TeamResult.PENDING]: '-',
} as const;

function splitTeams(teams: TeamContract[]): { teamA: TeamContract | null; teamB: TeamContract | null } {
  const byNameA = teams.find((team) => team.name === 'Team A') ?? null;
  const byNameB = teams.find((team) => team.name === 'Team B') ?? null;
  const fallbackA = byNameA ?? teams[0] ?? null;
  const fallbackB = byNameB ?? teams.find((team) => team.id !== fallbackA?.id) ?? null;
  return { teamA: fallbackA, teamB: fallbackB };
}

interface PlayerRecentFormProps {
  items: PlayerRecentMatchResultContract[];
  className?: string;
}

function PlayerRecentForm({ items, className }: PlayerRecentFormProps) {
  const visibleItems = items.slice(0, 5);
  const emptySlots = Math.max(0, 5 - visibleItems.length);

  return (
    <div className={className ? `${styles.formList} ${className}` : styles.formList}>
      {visibleItems.map((item) => {
        const variantClassName =
          item.result === TeamResult.WINNER
            ? styles.formWin
            : item.result === TeamResult.LOSER
              ? styles.formLoss
              : item.result === TeamResult.DRAW
                ? styles.formDraw
                : styles.formPending;

        return (
          <span
            key={`${item.matchId}-${item.result}`}
            className={`${styles.formBox} ${variantClassName}`}
            title={`Fecha ${item.matchday} · ${new Date(item.kickoffAt).toLocaleDateString('es-AR')}`}
          >
            {PLAYER_FORM_LABELS[item.result]}
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
}

export function MatchPlayersTableReadonly({ matchId, players }: MatchPlayersTableReadonlyProps) {
  const [teams, setTeams] = useState<TeamContract[]>([]);
  const [recentFormByPlayerId, setRecentFormByPlayerId] = useState<
    Record<string, PlayerRecentMatchResultContract[]>
  >({});

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      apiClient.getTeamsByMatch(matchId),
      apiClient.getMatchPlayersRecentForm(matchId),
    ])
      .then(([nextTeams, recentForm]) => {
        if (cancelled) {
          return;
        }

        setTeams(nextTeams);
        setRecentFormByPlayerId(recentForm.byPlayerId);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setTeams([]);
        setRecentFormByPlayerId({});
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const data = useMemo(() => {
    const { teamA, teamB } = splitTeams(teams);
    const teamAPlayers = ((teamA?.playerTeams as PlayerTeamContract[] | undefined) ?? []).map((item) => ({
      ...item,
      player: players.find((player) => player.id === item.playerId),
    }));
    const teamBPlayers = ((teamB?.playerTeams as PlayerTeamContract[] | undefined) ?? []).map((item) => ({
      ...item,
      player: players.find((player) => player.id === item.playerId),
    }));

    const rowCount = Math.max(teamAPlayers.length, teamBPlayers.length, 1);
    const rows = Array.from({ length: rowCount }, (_, index) => ({
      teamA: teamAPlayers[index] ?? null,
      teamB: teamBPlayers[index] ?? null,
    }));

    return {
      teamAName: teamA?.name ?? 'Team A',
      teamBName: teamB?.name ?? 'Team B',
      teamAColor: teamA?.color ?? '#0b2818',
      teamBColor: teamB?.color ?? '#f2f2f2',
      rows,
      isEmpty: teamAPlayers.length === 0 && teamBPlayers.length === 0,
    };
  }, [players, teams]);

  if (data.isEmpty) {
    return <p className={styles.muted}>No hay jugadores cargados en este partido.</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <colgroup>
          <col className={styles.goalsCol} />
          <col className={styles.formCol} />
          <col className={styles.teamCol} />
          <col className={styles.teamCol} />
          <col className={styles.formCol} />
          <col className={styles.goalsCol} />
        </colgroup>
        <thead>
          <tr>
            <th className={styles.goalsCol} style={{ backgroundColor: withAlpha(data.teamAColor, '66') }}>Goles</th>
            <th className={styles.formCol} style={{ backgroundColor: withAlpha(data.teamAColor, '66') }}>Ult. 5</th>
            <th className={styles.teamACol} style={{ backgroundColor: withAlpha(data.teamAColor, '66') }}>{data.teamAName}</th>
            <th style={{ backgroundColor: withAlpha(data.teamBColor, '66') }}>{data.teamBName}</th>
            <th className={styles.formCol} style={{ backgroundColor: withAlpha(data.teamBColor, '66') }}>Ult. 5</th>
            <th className={styles.goalsCol} style={{ backgroundColor: withAlpha(data.teamBColor, '66') }}>Goles</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={`readonly-row-${index + 1}`}>
              <td className={styles.goalsCol} style={{ backgroundColor: withAlpha(data.teamAColor, '33') }}>{row.teamA?.goals ?? 0}</td>
              <td className={styles.formCell} style={{ backgroundColor: withAlpha(data.teamAColor, '33') }}>
                <PlayerRecentForm items={recentFormByPlayerId[row.teamA?.playerId ?? ''] ?? []} />
              </td>
              <td className={`${styles.teamACol} ${styles.playerCell}`} style={{ backgroundColor: withAlpha(data.teamAColor, '33') }}>
                <span className={styles.playerName}>{row.teamA?.player?.nickname ?? row.teamA?.player?.name ?? '-'}</span>
                <PlayerRecentForm
                  className={styles.mobileFormList}
                  items={recentFormByPlayerId[row.teamA?.playerId ?? ''] ?? []}
                />
              </td>
              <td className={styles.playerCell} style={{ backgroundColor: withAlpha(data.teamBColor, '33') }}>
                <span className={styles.playerName}>{row.teamB?.player?.nickname ?? row.teamB?.player?.name ?? '-'}</span>
                <PlayerRecentForm
                  className={styles.mobileFormList}
                  items={recentFormByPlayerId[row.teamB?.playerId ?? ''] ?? []}
                />
              </td>
              <td className={styles.formCell} style={{ backgroundColor: withAlpha(data.teamBColor, '33') }}>
                <PlayerRecentForm items={recentFormByPlayerId[row.teamB?.playerId ?? ''] ?? []} />
              </td>
              <td className={styles.goalsCol} style={{ backgroundColor: withAlpha(data.teamBColor, '33') }}>{row.teamB?.goals ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
