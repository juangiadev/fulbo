import type { MatchContract } from '@shared/contracts';
import { MatchStatus, TournamentFormat, TournamentType } from '@shared/enums';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ContentSpinner } from '../../components/ContentSpinner';
import { DateTimePicker } from '../../components/DateTimePicker';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import { formatTime24 } from '../../utils/dateFormat';
import styles from './TournamentMatchesPage.module.css';

const matchDateFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function TournamentMatchesPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [matches, setMatches] = useState<MatchContract[]>([]);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null);
  const [deletingMatchday, setDeletingMatchday] = useState<number | null>(null);
  const [confirmingMatchday, setConfirmingMatchday] = useState<number | null>(null);
  const [showFixtureForm, setShowFixtureForm] = useState(false);
  const [isGeneratingFixture, setIsGeneratingFixture] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({
    matchday: '1',
    firstKickoffAt: '',
    intervalMinutes: '60',
    placeName: '',
    placeUrl: '',
    stage: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);
  const canGenerateTeamLigaFixture =
    permissions.canManageMatches &&
    tournament?.type === TournamentType.TEAMS &&
    tournament.format === TournamentFormat.LIGA;
  const shouldGroupMatchesByMatchday =
    tournament?.type === TournamentType.TEAMS &&
    tournament.format === TournamentFormat.LIGA;

  const loadMatches = useCallback(async () => {
    if (!tournamentId) {
      return;
    }

    setIsLoading(true);
    setHasLoadError(false);

    try {
      setMatches(await apiClient.getMatches(tournamentId));
    } catch {
      setMatches([]);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const orderedMatches = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          b.matchday - a.matchday ||
          new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime(),
      ),
    [matches],
  );
  const matchdayGroups = useMemo(() => {
    if (!shouldGroupMatchesByMatchday) {
      return [{ matchday: 0, matches: orderedMatches }];
    }

    return orderedMatches.reduce<Array<{ matchday: number; matches: MatchContract[] }>>(
      (groups, match) => {
        const currentGroup = groups[groups.length - 1];

        if (currentGroup?.matchday === match.matchday) {
          currentGroup.matches.push(match);
          return groups;
        }

        groups.push({ matchday: match.matchday, matches: [match] });
        return groups;
      },
      [],
    );
  }, [orderedMatches, shouldGroupMatchesByMatchday]);
  const confirmingMatchdayGroup = useMemo(
    () =>
      confirmingMatchday === null
        ? null
        : matchdayGroups.find((group) => group.matchday === confirmingMatchday) ?? null,
    [confirmingMatchday, matchdayGroups],
  );
  const finishedMatches = matches.filter(
    (match) => match.status === MatchStatus.FINISHED,
  ).length;
  const pendingMatches = matches.length - finishedMatches;

  const handleGenerateFixture = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tournamentId || !fixtureForm.firstKickoffAt) {
      return;
    }

    setIsGeneratingFixture(true);
    try {
      await sileo.promise(
        apiClient.generateMatchdayFixture(tournamentId, {
          matchday: Number(fixtureForm.matchday),
          firstKickoffAt: new Date(fixtureForm.firstKickoffAt).toISOString(),
          intervalMinutes: Number(fixtureForm.intervalMinutes),
          placeName: fixtureForm.placeName.trim(),
          placeUrl: fixtureForm.placeUrl.trim() || undefined,
          stage: fixtureForm.stage.trim(),
        }),
        {
          loading: { title: 'Creando fecha completa...' },
          success: { title: 'Fecha creada' },
          error: { title: 'No se pudo crear la fecha' },
        },
      );
      const refreshed = await apiClient.getMatches(tournamentId);
      setMatches(refreshed);
      setShowFixtureForm(false);
      setFixtureForm({
        matchday: '1',
        firstKickoffAt: '',
        intervalMinutes: '60',
        placeName: '',
        placeUrl: '',
        stage: '',
      });
    } finally {
      setIsGeneratingFixture(false);
    }
  };

  if (!tournamentId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al torneo
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Calendario del torneo</p>
          <h1>Partidos</h1>
          <p className={styles.heroDescription}>
            Todas las fechas de <strong>{tournament.name}</strong>, desde el próximo encuentro
            hasta el último resultado.
          </p>
        </div>

        <div className={styles.heroSide}>
          <dl aria-label="Resumen de partidos" className={styles.summary}>
            <div>
              <dt>Total</dt>
              <dd>
                {isLoading || hasLoadError ? '—' : matches.length.toString().padStart(2, '0')}
              </dd>
            </div>
            <div>
              <dt>Jugados</dt>
              <dd>
                {isLoading || hasLoadError ? '—' : finishedMatches.toString().padStart(2, '0')}
              </dd>
            </div>
            <div>
              <dt>Pendientes</dt>
              <dd>
                {isLoading || hasLoadError ? '—' : pendingMatches.toString().padStart(2, '0')}
              </dd>
            </div>
          </dl>

          {permissions.canManageMatches ? (
            <Link className={styles.createButton} to={`/tournaments/${tournamentId}/partidos/new`}>
              <span>
                <Plus aria-hidden="true" size={19} />
                Crear partido
              </span>
              <ArrowUpRight aria-hidden="true" size={19} />
            </Link>
          ) : null}

          {canGenerateTeamLigaFixture ? (
            <button
              className={styles.fixtureToggleButton}
              onClick={() => setShowFixtureForm((current) => !current)}
              type="button"
            >
              <span>
                <CalendarDays aria-hidden="true" size={19} />
                Crear fecha completa
              </span>
              <ArrowUpRight aria-hidden="true" size={19} />
            </button>
          ) : null}
        </div>
      </header>

      {canGenerateTeamLigaFixture && showFixtureForm ? (
        <form className={styles.fixturePanel} onSubmit={handleGenerateFixture}>
          <div className={styles.fixturePanelHeader}>
            <div>
              <p className={styles.eyebrow}>Liga por equipos</p>
              <h2>Crear fecha completa</h2>
              <p>
                Genera automáticamente los cruces de una fecha con todos los equipos registrados.
              </p>
            </div>
            <button
              className={styles.secondaryButton}
              onClick={() => setShowFixtureForm(false)}
              type="button"
            >
              Cerrar
            </button>
          </div>

          <div className={styles.fixtureGrid}>
            <label>
              <span>Fecha</span>
              <input
                min="1"
                onChange={(event) =>
                  setFixtureForm((current) => ({ ...current, matchday: event.target.value }))
                }
                required
                type="number"
                value={fixtureForm.matchday}
              />
            </label>
            <div className={styles.dateField}>
              <DateTimePicker
                label="Primer horario"
                onChange={(value) =>
                  setFixtureForm((current) => ({
                    ...current,
                    firstKickoffAt: value,
                  }))
                }
                value={fixtureForm.firstKickoffAt}
              />
            </div>
            <label>
              <span>Intervalo en minutos</span>
              <input
                min="1"
                onChange={(event) =>
                  setFixtureForm((current) => ({
                    ...current,
                    intervalMinutes: event.target.value,
                  }))
                }
                required
                type="number"
                value={fixtureForm.intervalMinutes}
              />
            </label>
            <label>
              <span>Lugar</span>
              <input
                maxLength={150}
                onChange={(event) =>
                  setFixtureForm((current) => ({ ...current, placeName: event.target.value }))
                }
                required
                type="text"
                value={fixtureForm.placeName}
              />
            </label>
            <label>
              <span>Cancha</span>
              <input
                maxLength={120}
                onChange={(event) =>
                  setFixtureForm((current) => ({ ...current, stage: event.target.value }))
                }
                required
                type="text"
                value={fixtureForm.stage}
              />
            </label>
            <label>
              <span>URL del lugar (opcional)</span>
              <input
                onChange={(event) =>
                  setFixtureForm((current) => ({ ...current, placeUrl: event.target.value }))
                }
                type="url"
                value={fixtureForm.placeUrl}
              />
            </label>
          </div>

          <button
            className={styles.fixtureSubmitButton}
            disabled={isGeneratingFixture}
            type="submit"
          >
            <Plus aria-hidden="true" size={18} />
            {isGeneratingFixture ? 'Creando fecha...' : 'Crear fecha completa'}
          </button>
        </form>
      ) : null}

      <section aria-labelledby="matches-title" className={styles.matchesSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Fixture</p>
            <h2 id="matches-title">Todas las fechas</h2>
          </div>
          {!isLoading && !hasLoadError && orderedMatches.length > 0 ? (
            <span>{orderedMatches.length} en total</span>
          ) : null}
        </div>

        {isLoading ? (
          <div aria-live="polite" className={styles.loadingState} role="status">
            <ContentSpinner />
            <span className={styles.srOnly}>Cargando partidos...</span>
          </div>
        ) : hasLoadError ? (
          <div aria-live="polite" className={styles.stateCard} role="alert">
            <span aria-hidden="true" className={styles.stateIcon}>
              <RefreshCw size={28} strokeWidth={1.7} />
            </span>
            <div>
              <p className={styles.eyebrow}>Fuera de juego</p>
              <h3>No pudimos cargar los partidos</h3>
              <p>Revisá tu conexión e intentá nuevamente.</p>
            </div>
            <button className={styles.retryButton} onClick={() => void loadMatches()} type="button">
              <RefreshCw aria-hidden="true" size={17} />
              Reintentar
            </button>
          </div>
        ) : orderedMatches.length === 0 ? (
          <div className={styles.stateCard}>
            <span aria-hidden="true" className={styles.stateIcon}>
              <CalendarDays size={30} strokeWidth={1.6} />
            </span>
            <div>
              <p className={styles.eyebrow}>Primera fecha</p>
              <h3>Todavía no hay partidos</h3>
              <p>
                {permissions.canManageMatches
                  ? 'Creá el primer encuentro para poner en marcha el calendario.'
                  : 'Cuando el organizador cree un encuentro, aparecerá en este calendario.'}
              </p>
            </div>
            {permissions.canManageMatches ? (
              <Link className={styles.emptyAction} to={`/tournaments/${tournamentId}/partidos/new`}>
                <Plus aria-hidden="true" size={17} />
                Crear el primero
              </Link>
            ) : null}
          </div>
        ) : (
          <div className={styles.matchdayGroups}>
            {matchdayGroups.map((group) => (
              <section
                aria-label={shouldGroupMatchesByMatchday ? undefined : 'Partidos'}
                aria-labelledby={
                  shouldGroupMatchesByMatchday ? `matchday-${group.matchday}-title` : undefined
                }
                className={styles.matchdayGroup}
                key={group.matchday}
              >
                {shouldGroupMatchesByMatchday ? (
                  <div className={styles.matchdayHeader}>
                    <div>
                      <p className={styles.eyebrow}>Fecha</p>
                      <h3 id={`matchday-${group.matchday}-title`}>Fecha {group.matchday}</h3>
                    </div>
                    <div className={styles.matchdayHeaderActions}>
                      <span>
                        {group.matches.length}{' '}
                        {group.matches.length === 1 ? 'partido' : 'partidos'}
                      </span>
                      {permissions.canDeleteMatches ? (
                        <button
                          aria-label={`Eliminar todos los partidos de la fecha ${group.matchday}`}
                          className={styles.deleteButton}
                          disabled={deletingMatchday === group.matchday}
                          onClick={() => setConfirmingMatchday(group.matchday)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={17} />
                          Eliminar fecha
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className={styles.matchesList}>
                  {group.matches.map((match, index) => {
                    const kickoffDate = new Date(match.kickoffAt);
                    const isFinished = match.status === MatchStatus.FINISHED;
                    const matchTitleId = `match-${match.id}`;

                    return (
                      <article
                        aria-labelledby={matchTitleId}
                        className={styles.matchCard}
                        key={match.id}
                      >
                        <div className={styles.cardTopline}>
                          <span>PARTIDO {(index + 1).toString().padStart(2, '0')}</span>
                          <span className={isFinished ? styles.finishedBadge : styles.pendingBadge}>
                            {isFinished ? 'Finalizado' : 'Pendiente'}
                          </span>
                        </div>

                        <div className={styles.cardBody}>
                          <div className={styles.matchIdentity}>
                            <span aria-hidden="true" className={styles.matchdayNumber}>
                              {match.matchday.toString().padStart(2, '0')}
                            </span>
                            <div>
                              <p className={styles.matchdayLabel}>Fecha</p>
                              <h3 id={matchTitleId}>Fecha {match.matchday}</h3>
                              <p className={styles.stage}>Cancha: {match.stage}</p>
                            </div>
                          </div>

                          <dl className={styles.matchDetails}>
                            <div>
                              <dt>
                                <CalendarDays aria-hidden="true" size={18} />
                                Día
                              </dt>
                              <dd>
                                <time dateTime={match.kickoffAt}>
                                  {matchDateFormatter.format(kickoffDate)}
                                </time>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <Clock3 aria-hidden="true" size={18} />
                                Hora
                              </dt>
                              <dd>
                                <time dateTime={match.kickoffAt}>
                                  {formatTime24(kickoffDate)} hs
                                </time>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <MapPin aria-hidden="true" size={18} />
                                Lugar
                              </dt>
                              <dd>{match.placeName}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className={styles.actions}>
                          <Link
                            aria-label={`Ver partido de la fecha ${match.matchday}`}
                            className={styles.viewButton}
                            to={`/tournaments/${tournamentId}/partidos/${match.id}`}
                          >
                            <span>Ver partido</span>
                            <ArrowUpRight aria-hidden="true" size={18} />
                          </Link>
                          {permissions.canManageMatches ? (
                            <Link
                              aria-label={`Editar partido de la fecha ${match.matchday}`}
                              className={styles.secondaryButton}
                              to={`/tournaments/${tournamentId}/partidos/${match.id}/edit`}
                            >
                              <Pencil aria-hidden="true" size={17} />
                              Editar
                            </Link>
                          ) : null}
                          {permissions.canDeleteMatches ? (
                            <button
                              aria-label={`Eliminar partido de la fecha ${match.matchday}`}
                              className={styles.deleteButton}
                              disabled={deletingMatchId === match.id}
                              onClick={() => setConfirmingMatchId(match.id)}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" size={17} />
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <aside className={styles.footerNote}>
        <Trophy aria-hidden="true" size={19} strokeWidth={1.7} />
        <p>Los partidos finalizados quedan registrados como parte de la historia del torneo.</p>
      </aside>

      {confirmingMatchId ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={deletingMatchId === confirmingMatchId}
          message="Esta acción elimina el partido y su tabla de jugadores/goles."
          onCancel={() => setConfirmingMatchId(null)}
          onConfirm={async () => {
            setDeletingMatchId(confirmingMatchId);
            try {
              await sileo.promise(apiClient.removeMatch(confirmingMatchId), {
                loading: { title: 'Eliminando partido...' },
                success: { title: 'Partido eliminado' },
                error: { title: 'No se pudo eliminar el partido' },
              });
              const refreshed = await apiClient.getMatches(tournamentId);
              setMatches(refreshed);
              setConfirmingMatchId(null);
            } finally {
              setDeletingMatchId(null);
            }
          }}
          title="Confirmar eliminación"
        />
      ) : null}

      {confirmingMatchdayGroup ? (
        <ConfirmModal
          confirmText="Eliminar fecha"
          isConfirming={deletingMatchday === confirmingMatchdayGroup.matchday}
          message={`Esta acción elimina los ${confirmingMatchdayGroup.matches.length} partidos de la fecha ${confirmingMatchdayGroup.matchday} y sus tablas de jugadores/goles.`}
          onCancel={() => setConfirmingMatchday(null)}
          onConfirm={async () => {
            setDeletingMatchday(confirmingMatchdayGroup.matchday);
            try {
              await sileo.promise(
                Promise.all(
                  confirmingMatchdayGroup.matches.map((match) => apiClient.removeMatch(match.id)),
                ),
                {
                  loading: { title: 'Eliminando fecha...' },
                  success: { title: 'Fecha eliminada' },
                  error: { title: 'No se pudo eliminar la fecha' },
                },
              );
              const refreshed = await apiClient.getMatches(tournamentId);
              setMatches(refreshed);
            } finally {
              setDeletingMatchday(null);
              setConfirmingMatchday(null);
            }
          }}
          title={`Eliminar fecha ${confirmingMatchdayGroup.matchday}`}
        />
      ) : null}
    </section>
  );
}
