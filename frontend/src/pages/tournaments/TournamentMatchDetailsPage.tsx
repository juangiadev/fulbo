import { MatchStatus } from '@shared/enums';
import type { MatchContract, PlayerContract, PlayerTeamContract, TeamContract } from '@shared/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ContentSpinner } from '../../components/ContentSpinner';
import { MatchPlayersTableReadonly } from '../../components/MatchPlayersTableReadonly';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentMatchDetailPage.module.css';

function splitTeams(teams: TeamContract[]): { teamA: TeamContract | null; teamB: TeamContract | null } {
  const byNameA = teams.find((team) => team.name === 'Team A') ?? null;
  const byNameB = teams.find((team) => team.name === 'Team B') ?? null;
  const fallbackA = byNameA ?? teams[0] ?? null;
  const fallbackB = byNameB ?? teams.find((team) => team.id !== fallbackA?.id) ?? null;
  return { teamA: fallbackA, teamB: fallbackB };
}

export function TournamentMatchDetailsPage() {
  const { tournamentId, matchId } = useParams();
  const { data } = useAppContext();
  const [matches, setMatches] = useState<MatchContract[]>([]);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [teams, setTeams] = useState<TeamContract[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }
    void Promise.all([apiClient.getMatches(tournamentId), apiClient.getPlayers(tournamentId)]).then(
      ([nextMatches, nextPlayers]) => {
        setMatches(nextMatches);
        setPlayers(nextPlayers);
        setIsLoaded(true);
      },
    );
  }, [tournamentId]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === matchId) ?? null,
    [matchId, matches],
  );

  useEffect(() => {
    if (!selectedMatch) {
      return;
    }

    void apiClient.getTeamsByMatch(selectedMatch.id).then(setTeams).catch(() => setTeams([]));
  }, [selectedMatch]);

  const resultSummary = useMemo(() => {
    const { teamA, teamB } = splitTeams(teams);
    const teamAGoals = ((teamA?.playerTeams as PlayerTeamContract[] | undefined) ?? []).reduce(
      (total, row) => total + row.goals,
      0,
    );
    const teamBGoals = ((teamB?.playerTeams as PlayerTeamContract[] | undefined) ?? []).reduce(
      (total, row) => total + row.goals,
      0,
    );

    return {
      teamAColor: teamA?.color ?? '#0b2818',
      teamBColor: teamB?.color ?? '#f2f2f2',
      teamAGoals,
      teamBGoals,
    };
  }, [teams]);

  if (!tournamentId || !matchId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  if (!isLoaded) {
    return (
      <section className={styles.section}>
        <div className={styles.headerRow}>
          <h2>Partido</h2>
          <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/partidos`}>
            Volver
          </Link>
        </div>
        <ContentSpinner />
      </section>
    );
  }

  if (!selectedMatch) {
    return <Navigate replace to={`/tournaments/${tournamentId}/partidos`} />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Partido</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/partidos`}>
          Volver
        </Link>
      </div>

      <article className={styles.card}>
        <p className={styles.meta}>Cancha: {selectedMatch.stage}</p>
        <p className={styles.meta}>Lugar: {selectedMatch.placeName}</p>
        <p className={styles.meta}>
          URL:{' '}
          {selectedMatch.placeUrl ? (
            <a className={styles.link} href={selectedMatch.placeUrl} rel="noreferrer" target="_blank">
              {selectedMatch.placeUrl}
            </a>
          ) : (
            'Sin URL'
          )}
        </p>
        <p className={styles.meta}>Fecha: {new Date(selectedMatch.kickoffAt).toLocaleString('es-AR')}</p>
        <p className={styles.meta}>Estado: {selectedMatch.status === MatchStatus.PENDING ? 'Pendiente' : 'Finalizado'}</p>
      </article>

      <MatchPlayersTableReadonly matchId={selectedMatch.id} players={players} />

      <div className={styles.resultTableWrap}>
        <table className={styles.resultTable}>
          <thead>
            <tr>
              <th style={{ backgroundColor: `${resultSummary.teamAColor}26` }}>Team A</th>
              <th style={{ backgroundColor: `${resultSummary.teamBColor}26` }}>Team B</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ backgroundColor: `${resultSummary.teamAColor}12` }}>{resultSummary.teamAGoals}</td>
              <td style={{ backgroundColor: `${resultSummary.teamBColor}12` }}>{resultSummary.teamBGoals}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
