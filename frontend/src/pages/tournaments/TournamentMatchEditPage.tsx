import { MatchStatus, PlayerRole } from '@shared/enums';
import type { MatchContract, PlayerContract } from '@shared/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { ContentSpinner } from '../../components/ContentSpinner';
import {
  MatchPlayersTableBuilder,
  type MatchPlayersTableBuilderRef,
} from '../../components/MatchPlayersTableBuilder';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentMatchDetailPage.module.css';

export function TournamentMatchEditPage() {
  const { tournamentId, matchId } = useParams();
  const { data, getMyRole } = useAppContext();
  const [matches, setMatches] = useState<MatchContract[]>([]);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.PENDING);
  const [stageDraft, setStageDraft] = useState('');
  const [placeNameDraft, setPlaceNameDraft] = useState('');
  const [placeUrlDraft, setPlaceUrlDraft] = useState('');
  const [kickoffAtDraft, setKickoffAtDraft] = useState('');
  const [tableSummary, setTableSummary] = useState({
    teamAColor: '#0b2818',
    teamBColor: '#f2f2f2',
    teamAGoals: 0,
    teamBGoals: 0,
  });
  const [isSavingAll, setIsSavingAll] = useState(false);
  const tableRef = useRef<MatchPlayersTableBuilderRef | null>(null);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const role = tournamentId ? getMyRole(tournamentId) : null;
  const canEdit = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(role ?? PlayerRole.USER);

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

    const date = new Date(selectedMatch.kickoffAt);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setStatus(selectedMatch.status);
    setStageDraft(selectedMatch.stage);
    setPlaceNameDraft(selectedMatch.placeName);
    setPlaceUrlDraft(selectedMatch.placeUrl ?? '');
    setKickoffAtDraft(localDate);
  }, [selectedMatch]);

  if (!tournamentId || !matchId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  if (!canEdit) {
    return <Navigate replace to={`/tournaments/${tournamentId}/partidos/${matchId}`} />;
  }

  if (!isLoaded) {
    return (
      <section className={styles.section}>
        <div className={styles.headerRow}>
          <h2>Editar partido</h2>
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
        <h2>Editar partido</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/partidos`}>
          Volver
        </Link>
      </div>

      <article className={styles.card}>
        <div className={styles.inlineControls}>
          <label>
            Cancha
            <input onChange={(event) => setStageDraft(event.target.value)} value={stageDraft} />
          </label>
          <label>
            Lugar
            <input onChange={(event) => setPlaceNameDraft(event.target.value)} value={placeNameDraft} />
          </label>
        </div>
        <div className={styles.inlineControls}>
          <label>
            URL
            <input onChange={(event) => setPlaceUrlDraft(event.target.value)} placeholder="https://..." value={placeUrlDraft} />
          </label>
          <label>
            Fecha y hora
            <input onChange={(event) => setKickoffAtDraft(event.target.value)} type="datetime-local" value={kickoffAtDraft} />
          </label>
        </div>
        <div className={styles.inlineControls}>
          <label>
            Estado
            <select onChange={(event) => setStatus(event.target.value as MatchStatus)} value={status}>
              <option value={MatchStatus.PENDING}>Pendiente</option>
              <option value={MatchStatus.FINISHED}>Finalizado</option>
            </select>
          </label>
        </div>
      </article>

      <MatchPlayersTableBuilder
        canEdit={canEdit}
        matchId={selectedMatch.id}
        onSummaryChange={setTableSummary}
        players={players}
        ref={tableRef}
        showSaveButton={false}
      />

      <div className={styles.resultTableWrap}>
        <table className={styles.resultTable}>
          <thead>
            <tr>
              <th style={{ backgroundColor: `${tableSummary.teamAColor}26` }}>Team A</th>
              <th style={{ backgroundColor: `${tableSummary.teamBColor}26` }}>Team B</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ backgroundColor: `${tableSummary.teamAColor}12` }}>{tableSummary.teamAGoals}</td>
              <td style={{ backgroundColor: `${tableSummary.teamBColor}12` }}>{tableSummary.teamBGoals}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        className={buttonStyles.primary}
        disabled={isSavingAll}
        onClick={async () => {
          const kickoffDate = new Date(kickoffAtDraft);
          if (Number.isNaN(kickoffDate.getTime())) {
            sileo.warning({ title: 'La fecha del partido no es valida' });
            return;
          }

          setIsSavingAll(true);
          try {
            await sileo.promise(
              (async () => {
                const updated = await apiClient.updateMatch(selectedMatch.id, {
                  status,
                  stage: stageDraft.trim(),
                  placeName: placeNameDraft.trim(),
                  placeUrl: placeUrlDraft.trim() || undefined,
                  kickoffAt: kickoffDate.toISOString(),
                });
                await tableRef.current?.saveLineup();
                setMatches((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
              })(),
              {
                loading: { title: 'Guardando partido...' },
                success: { title: 'Partido actualizado' },
                error: { title: 'No se pudo guardar el partido' },
              },
            );
          } finally {
            setIsSavingAll(false);
          }
        }}
        type="button"
      >
        Guardar cambios
      </button>
    </section>
  );
}
