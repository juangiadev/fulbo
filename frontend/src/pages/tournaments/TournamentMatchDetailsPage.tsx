import { MatchStatus } from '@shared/enums';
import type {
  MatchContract,
  MatchMvpVotingContract,
  PlayerContract,
  PlayerTeamContract,
  TeamContract,
} from '@shared/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
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
  const [mvpVoting, setMvpVoting] = useState<MatchMvpVotingContract | null>(null);
  const [isMvpLoading, setIsMvpLoading] = useState(false);
  const [isVotingMvp, setIsVotingMvp] = useState(false);
  const [mvpVotingError, setMvpVotingError] = useState<string | null>(null);
  const [mvpSearch, setMvpSearch] = useState('');
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

  useEffect(() => {
    if (!selectedMatch || selectedMatch.status !== MatchStatus.FINISHED) {
      setMvpVoting(null);
      setMvpVotingError(null);
      setIsMvpLoading(false);
      return;
    }

    setIsMvpLoading(true);
    setMvpVotingError(null);

    void apiClient
      .getMatchMvpVoting(selectedMatch.id)
      .then(setMvpVoting)
      .catch(() => {
        setMvpVoting(null);
        setMvpVotingError('Solo jugadores que participaron pueden votar el MVP.');
      })
      .finally(() => setIsMvpLoading(false));
  }, [selectedMatch]);

  const mvpCandidates = useMemo(
    () =>
      (mvpVoting?.candidatePlayerIds ?? [])
        .map((playerId) => players.find((player) => player.id === playerId))
        .filter((player): player is PlayerContract => Boolean(player)),
    [mvpVoting?.candidatePlayerIds, players],
  );

  const filteredMvpCandidates = useMemo(() => {
    const query = mvpSearch.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return mvpCandidates.filter((candidate) =>
      `${candidate.name} ${candidate.nickname ?? ''}`.toLowerCase().includes(query),
    );
  }, [mvpCandidates, mvpSearch]);

  const voteForMvp = (targetMatchId: string, votedPlayerId: string | null) => {
    setIsVotingMvp(true);
    void apiClient
      .voteMatchMvp(targetMatchId, { votedPlayerId })
      .then((nextVoting) => {
        setMvpVoting(nextVoting);
        if (votedPlayerId) {
          setMvpSearch('');
        }
      })
      .catch(() => {
        sileo.error({
          title: votedPlayerId
            ? 'No se pudo registrar tu voto para MVP'
            : 'No se pudo quitar tu voto de MVP',
        });
      })
      .finally(() => setIsVotingMvp(false));
  };

  const mvpVotesList = useMemo(
    () =>
      (mvpVoting?.votes ?? []).map((vote) => {
        const voter = players.find((player) => player.id === vote.voterPlayerId);
        const voted = players.find((player) => player.id === vote.votedPlayerId);
        return {
          voterName: voter?.nickname ?? voter?.name ?? 'Jugador desconocido',
          votedName: voted?.nickname ?? voted?.name ?? 'Jugador desconocido',
          updatedAt: vote.updatedAt,
        };
      }),
    [mvpVoting?.votes, players],
  );

  const mvpDisplayName = useMemo(() => {
    if (!mvpVoting?.mvpPlayerId) {
      return null;
    }
    const player = players.find((item) => item.id === mvpVoting.mvpPlayerId);
    return player?.nickname ?? player?.name ?? null;
  }, [mvpVoting?.mvpPlayerId, players]);

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
      teamAName: teamA?.name ?? 'Team A',
      teamBName: teamB?.name ?? 'Team B',
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
              <th style={{ backgroundColor: `${resultSummary.teamAColor}66` }}>{resultSummary.teamAName}</th>
              <th style={{ backgroundColor: `${resultSummary.teamBColor}66` }}>{resultSummary.teamBName}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ backgroundColor: `${resultSummary.teamAColor}33` }}>{resultSummary.teamAGoals}</td>
              <td style={{ backgroundColor: `${resultSummary.teamBColor}33` }}>{resultSummary.teamBGoals}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {selectedMatch.status === MatchStatus.FINISHED ? (
        <article className={styles.card}>
          <h3 className={styles.mvpTitle}>Votacion MVP</h3>
          {isMvpLoading ? <ContentSpinner /> : null}
          {!isMvpLoading && mvpVotingError ? <p className={styles.meta}>{mvpVotingError}</p> : null}
          {!isMvpLoading && !mvpVotingError && mvpVoting ? (
            <>
              <p className={styles.meta}>
                {mvpDisplayName
                  ? `MVP actual: ${mvpDisplayName}`
                  : mvpVoting.hasTie
                    ? 'MVP actual: Sin MVP (empate en votos)'
                    : 'MVP actual: Sin MVP'}
              </p>

              <div className={styles.mvpSearchWrap}>
                <label className={styles.mvpSearchField}>
                  Buscar jugador
                  <input
                    onChange={(event) => setMvpSearch(event.target.value)}
                    placeholder="Escribe nombre o apodo"
                    value={mvpSearch}
                  />
                </label>
                {mvpSearch.trim() ? (
                  <div className={styles.mvpDropdown}>
                    {filteredMvpCandidates.map((candidate) => {
                      const voteCount = mvpVoting.votesByPlayerId[candidate.id] ?? 0;
                      const isMyVote = mvpVoting.myVotePlayerId === candidate.id;
                      const label = candidate.nickname ?? candidate.name;

                      return (
                        <button
                          className={styles.mvpDropdownItem}
                          disabled={isVotingMvp}
                          key={candidate.id}
                          onClick={() => voteForMvp(selectedMatch.id, candidate.id)}
                          type="button"
                        >
                          <span>
                            <strong>{label}</strong>
                            <span className={styles.mvpVoteCount}> ({voteCount} votos)</span>
                            {isMyVote ? <span className={styles.mvpMyVoteTag}> Tu voto</span> : null}
                          </span>
                          <span>Votar</span>
                        </button>
                      );
                    })}
                    {filteredMvpCandidates.length === 0 ? (
                      <p className={styles.mvpDropdownEmpty}>No hay jugadores que coincidan con la busqueda.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {mvpVoting.myVotePlayerId ? (
                <div className={styles.mvpActions}>
                  <button
                    className={buttonStyles.ghost}
                    disabled={isVotingMvp}
                    onClick={() => voteForMvp(selectedMatch.id, null)}
                    type="button"
                  >
                    Quitar mi voto
                  </button>
                </div>
              ) : null}

              <h4 className={styles.mvpVotesTitle}>Quien voto a quien</h4>
              {mvpVotesList.length === 0 ? (
                <p className={styles.meta}>Aun no hay votos para este partido.</p>
              ) : (
                <ul className={styles.mvpVotesList}>
                  {mvpVotesList.map((voteRow, index) => (
                    <li className={styles.mvpVoteRow} key={`${voteRow.voterName}-${voteRow.updatedAt}-${index + 1}`}>
                      <span>
                        {voteRow.voterName} voto a {voteRow.votedName}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
