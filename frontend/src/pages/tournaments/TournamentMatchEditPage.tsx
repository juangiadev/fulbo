import type { MatchContract, PlayerContract, TournamentTeamContract } from '@shared/contracts';
import { MatchStatus, TournamentType } from '@shared/enums';
import {
  ArrowLeft,
  CalendarClock,
  Flag,
  Link2,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ContentSpinner } from '../../components/ContentSpinner';
import { DateTimePicker } from '../../components/DateTimePicker';
import {
  MatchPlayersTableBuilder,
  type MatchPlayersTableBuilderRef,
} from '../../components/MatchPlayersTableBuilder';
import {
  TeamMatchResultEditor,
  type TeamMatchResultEditorRef,
} from '../../components/TeamMatchResultEditor';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentMatchEditPage.module.css';

export function TournamentMatchEditPage() {
  const navigate = useNavigate();
  const { tournamentId, matchId } = useParams();
  const { data } = useAppContext();
  const [matches, setMatches] = useState<MatchContract[]>([]);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeamContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.PENDING);
  const [matchdayDraft, setMatchdayDraft] = useState('');
  const [stageDraft, setStageDraft] = useState('');
  const [placeNameDraft, setPlaceNameDraft] = useState('');
  const [placeUrlDraft, setPlaceUrlDraft] = useState('');
  const [kickoffAtDraft, setKickoffAtDraft] = useState('');
  const [tableSummary, setTableSummary] = useState({
    teamAName: 'Team A',
    teamBName: 'Team B',
    teamAColor: '#0b2818',
    teamBColor: '#f2f2f2',
    teamAGoals: 0,
    teamBGoals: 0,
  });
  const [isSavingAll, setIsSavingAll] = useState(false);
  const tableRef = useRef<MatchPlayersTableBuilderRef | null>(null);
  const teamResultRef = useRef<TeamMatchResultEditorRef | null>(null);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);
  const isTeamTournament = tournament?.type === TournamentType.TEAMS;

  const handleTeamSummaryChange = useCallback(
    (summary: {
      teamAName: string;
      teamBName: string;
      teamAGoals: number;
      teamBGoals: number;
    }) => {
      setTableSummary((current) => {
        const next = {
          teamAName: summary.teamAName,
          teamBName: summary.teamBName,
          teamAColor: '#0b2818',
          teamBColor: '#f2f2f2',
          teamAGoals: summary.teamAGoals,
          teamBGoals: summary.teamBGoals,
        };

        if (
          current.teamAName === next.teamAName &&
          current.teamBName === next.teamBName &&
          current.teamAColor === next.teamAColor &&
          current.teamBColor === next.teamBColor &&
          current.teamAGoals === next.teamAGoals &&
          current.teamBGoals === next.teamBGoals
        ) {
          return current;
        }

        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setHasLoadError(false);

    void Promise.all([
      apiClient.getMatches(tournamentId),
      apiClient.getPlayers(tournamentId),
      isTeamTournament ? apiClient.getTournamentTeams(tournamentId) : Promise.resolve([]),
    ])
      .then(([nextMatches, nextPlayers, nextTournamentTeams]) => {
        if (!isActive) {
          return;
        }

        setMatches(nextMatches);
        setPlayers(nextPlayers);
        setTournamentTeams(nextTournamentTeams);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setMatches([]);
        setPlayers([]);
        setTournamentTeams([]);
        setHasLoadError(true);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isTeamTournament, loadAttempt, tournamentId]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === matchId) ?? null,
    [matchId, matches],
  );

  useEffect(() => {
    if (!selectedMatch) {
      return;
    }

    const date = new Date(selectedMatch.kickoffAt);
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);

    setStatus(selectedMatch.status);
    setMatchdayDraft(String(selectedMatch.matchday));
    setStageDraft(selectedMatch.stage);
    setPlaceNameDraft(selectedMatch.placeName);
    setPlaceUrlDraft(selectedMatch.placeUrl ?? '');
    setKickoffAtDraft(localDate);
  }, [selectedMatch]);

  if (
    !tournamentId ||
    !matchId ||
    !tournament ||
    tournament.membershipStatus === 'PENDING'
  ) {
    return <Navigate replace to="/tournaments" />;
  }

  if (!permissions.canManageMatches) {
    return (
      <Navigate
        replace
        to={`/tournaments/${tournamentId}/partidos/${matchId}`}
      />
    );
  }

  if (!isLoading && !hasLoadError && !selectedMatch) {
    return <Navigate replace to={`/tournaments/${tournamentId}/partidos`} />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/partidos`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a partidos
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Gestión del encuentro</p>
          <h1>Editar partido</h1>
          <p className={styles.heroDescription}>
            Ajustá la fecha, la sede y los equipos de <strong>{tournament.name}</strong> en un solo
            lugar.
          </p>
        </div>

        <dl aria-label="Resumen del partido" className={styles.heroSummary}>
          <div>
            <dt>Torneo</dt>
            <dd>{tournament.name}</dd>
          </div>
          <div>
            <dt>Partido</dt>
            <dd>{selectedMatch ? `Fecha ${selectedMatch.matchday}` : '—'}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              {selectedMatch ? (
                <span
                  className={
                    status === MatchStatus.FINISHED ? styles.finishedBadge : styles.pendingBadge
                  }
                >
                  {status === MatchStatus.FINISHED ? 'Finalizado' : 'Pendiente'}
                </span>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </header>

      {isLoading ? (
        <div aria-live="polite" className={styles.loadingState} role="status">
          <ContentSpinner />
          <span className={styles.srOnly}>Cargando datos del partido...</span>
        </div>
      ) : hasLoadError ? (
        <div aria-live="polite" className={styles.stateCard} role="alert">
          <span aria-hidden="true" className={styles.stateIcon}>
            <RefreshCw size={28} strokeWidth={1.7} />
          </span>
          <div>
            <p className={styles.eyebrow}>No pudimos entrar a la cancha</p>
            <h2>No se pudo cargar el partido</h2>
            <p>Revisá tu conexión e intentá nuevamente. No se modificó ningún dato.</p>
          </div>
          <button
            className={styles.retryButton}
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={17} />
            Reintentar
          </button>
        </div>
      ) : selectedMatch ? (
        <div className={styles.editorLayout}>
          <section
            aria-labelledby="match-details-title"
            className={`${styles.surface} ${styles.popoverSurface}`}
          >
            <div className={styles.sectionHeader}>
              <span aria-hidden="true" className={styles.sectionIcon}>
                <CalendarClock size={22} strokeWidth={1.8} />
              </span>
              <div>
                <p className={styles.sectionNumber}>01 · Datos del partido</p>
                <h2 id="match-details-title">Cuándo y dónde se juega</h2>
                <p>Actualizá la información principal que verá todo el torneo.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label>
                <span>Fecha del torneo</span>
                <input
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setMatchdayDraft(event.target.value)}
                  required
                  type="number"
                  value={matchdayDraft}
                />
              </label>

              <label>
                <span>Cancha</span>
                <input onChange={(event) => setStageDraft(event.target.value)} value={stageDraft} />
              </label>

              <label>
                <span>
                  <MapPin aria-hidden="true" size={15} />
                  Lugar
                </span>
                <input
                  onChange={(event) => setPlaceNameDraft(event.target.value)}
                  value={placeNameDraft}
                />
              </label>

              <label className={styles.urlField}>
                <span>
                  <Link2 aria-hidden="true" size={15} />
                  URL del lugar
                </span>
                <input
                  aria-describedby="place-url-help"
                  onChange={(event) => setPlaceUrlDraft(event.target.value)}
                  placeholder="https://..."
                  value={placeUrlDraft}
                />
                <small id="place-url-help">Opcional. Podés agregar el enlace al mapa.</small>
              </label>

              <div className={styles.dateField}>
                <DateTimePicker
                  label="Fecha y hora"
                  onChange={setKickoffAtDraft}
                  value={kickoffAtDraft}
                />
              </div>

              <label className={styles.statusField}>
                <span>
                  <Flag aria-hidden="true" size={15} />
                  Estado
                </span>
                <select
                  onChange={(event) => setStatus(event.target.value as MatchStatus)}
                  value={status}
                >
                  <option value={MatchStatus.PENDING}>Pendiente</option>
                  <option value={MatchStatus.FINISHED}>Finalizado</option>
                </select>
              </label>
            </div>
          </section>

          <section aria-labelledby="lineup-title" className={styles.surface}>
            <div className={styles.sectionHeader}>
              <span aria-hidden="true" className={styles.sectionIcon}>
                <UsersRound size={22} strokeWidth={1.8} />
              </span>
              <div>
                <p className={styles.sectionNumber}>02 · Equipos</p>
                <h2 id="lineup-title">
                  {isTeamTournament ? 'Equipos y resultado' : 'Jugadores y goles'}
                </h2>
                <p>
                  {isTeamTournament
                    ? 'Elegí los equipos registrados y actualizá el resultado total.'
                    : 'Organizá los equipos, ajustá sus colores y registrá el resultado.'}
                </p>
              </div>
            </div>

            {isTeamTournament ? (
              <TeamMatchResultEditor
                canEdit={permissions.canEditTournament}
                matchId={selectedMatch.id}
                onSummaryChange={handleTeamSummaryChange}
                ref={teamResultRef}
                tournamentTeams={tournamentTeams}
              />
            ) : (
              <MatchPlayersTableBuilder
                canEdit={permissions.canEditTournament}
                matchId={selectedMatch.id}
                onSummaryChange={setTableSummary}
                players={players}
                ref={tableRef}
                showSaveButton={false}
                variant="panel"
              />
            )}
          </section>

          <section aria-labelledby="score-title" className={styles.scoreSection}>
            <div className={styles.scoreHeading}>
              <div>
                <p className={styles.sectionNumber}>03 · Marcador</p>
                <h2 id="score-title">Vista previa del resultado</h2>
              </div>
              <Trophy aria-hidden="true" size={24} strokeWidth={1.6} />
            </div>

            <div className={styles.resultTableWrap}>
              <table className={styles.resultTable}>
                <caption className={styles.srOnly}>Resultado total del partido</caption>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: `${tableSummary.teamAColor}66` }}>
                      {tableSummary.teamAName}
                    </th>
                    <th style={{ backgroundColor: `${tableSummary.teamBColor}66` }}>
                      {tableSummary.teamBName}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: `${tableSummary.teamAColor}33` }}>
                      {tableSummary.teamAGoals}
                    </td>
                    <td style={{ backgroundColor: `${tableSummary.teamBColor}33` }}>
                      {tableSummary.teamBGoals}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <footer className={styles.actionBar}>
            <div className={styles.saveNote}>
              <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
              <p>Los datos del partido y la formación se guardan juntos.</p>
            </div>
            <div className={styles.actions}>
              <Link className={styles.cancelButton} to={`/tournaments/${tournamentId}/partidos`}>
                Cancelar
              </Link>
              <button
                aria-busy={isSavingAll}
                className={styles.saveButton}
                disabled={isSavingAll || (isTeamTournament && tournamentTeams.length < 2)}
                onClick={async () => {
                  const kickoffDate = new Date(kickoffAtDraft);
                  if (Number.isNaN(kickoffDate.getTime())) {
                    sileo.warning({ title: 'La fecha del partido no es valida' });
                    return;
                  }

                  const parsedMatchday = Number(matchdayDraft);
                  if (!Number.isInteger(parsedMatchday) || parsedMatchday < 1) {
                    sileo.warning({
                      title: 'La fecha del torneo debe ser un número mayor a 0',
                    });
                    return;
                  }

                  if (isTeamTournament && !teamResultRef.current?.validateResult()) {
                    return;
                  }

                  setIsSavingAll(true);
                  try {
                    await sileo.promise(
                      (async () => {
                        const updated = await apiClient.updateMatch(selectedMatch.id, {
                          matchday: parsedMatchday,
                          status,
                          stage: stageDraft.trim(),
                          placeName: placeNameDraft.trim(),
                          placeUrl: placeUrlDraft.trim() || undefined,
                          kickoffAt: kickoffDate.toISOString(),
                        });
                        if (isTeamTournament) {
                          await teamResultRef.current?.saveResult();
                        } else {
                          await tableRef.current?.saveLineup();
                        }
                        setMatches((previous) =>
                          previous.map((item) => (item.id === updated.id ? updated : item)),
                        );
                      })(),
                      {
                        loading: { title: 'Guardando partido...' },
                        success: { title: 'Partido actualizado' },
                        error: { title: 'No se pudo guardar el partido' },
                      },
                    );
                    navigate(`/tournaments/${tournamentId}/partidos`, {
                      replace: true,
                    });
                  } catch (error) {
                    void error;
                  } finally {
                    setIsSavingAll(false);
                  }
                }}
                type="button"
              >
                <Save aria-hidden="true" size={19} />
                {isSavingAll ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </section>
  );
}
