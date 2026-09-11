import type { MatchContract } from '@shared/contracts';
import { MatchStatus } from '@shared/enums';
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
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentMatchesPage.module.css';

const matchDateFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const matchTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function TournamentMatchesPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [matches, setMatches] = useState<MatchContract[]>([]);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);

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
  const finishedMatches = matches.filter(
    (match) => match.status === MatchStatus.FINISHED,
  ).length;
  const pendingMatches = matches.length - finishedMatches;

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
        </div>
      </header>

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
          <div className={styles.matchesList}>
            {orderedMatches.map((match, index) => {
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
                            {matchTimeFormatter.format(kickoffDate)} hs
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
    </section>
  );
}
