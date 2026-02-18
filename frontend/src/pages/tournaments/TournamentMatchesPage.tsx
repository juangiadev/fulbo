import { MatchStatus, PlayerRole } from '@shared/enums';
import type { MatchContract } from '@shared/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { ContentSpinner } from '../../components/ContentSpinner';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentMatchesPage.module.css';

export function TournamentMatchesPage() {
  const { tournamentId } = useParams();
  const { data, getMyRole } = useAppContext();
  const [matches, setMatches] = useState<MatchContract[]>([]);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const role = tournamentId ? getMyRole(tournamentId) : null;
  const canEdit = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(role ?? PlayerRole.USER);
  const canDelete = role === PlayerRole.OWNER;

  useEffect(() => {
    if (!tournamentId) {
      return;
    }
    setIsLoading(true);
    void apiClient
      .getMatches(tournamentId)
      .then(setMatches)
      .finally(() => setIsLoading(false));
  }, [tournamentId]);

  const orderedMatches = useMemo(
    () =>
      [...matches].sort(
        (a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime(),
      ),
    [matches],
  );

  if (!tournamentId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Partidos</h2>
        <div className={styles.headerActions}>
          {canEdit ? (
            <Link className={buttonStyles.primary} to={`/tournaments/${tournamentId}/partidos/new`}>
              Crear partido
            </Link>
          ) : null}
          <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}`}>
            Volver
          </Link>
        </div>
      </div>

      {!isLoading && orderedMatches.length === 0 ? <p className={styles.meta}>No hay partidos creados para este torneo.</p> : null}

      <div className={styles.matchesList}>
        {isLoading ? <ContentSpinner /> : orderedMatches.map((match) => (
          <article className={styles.matchCard} key={match.id}>
            <div>
              <h3>{match.stage}</h3>
              <p className={styles.meta}>Lugar: {match.placeName}</p>
              <p className={styles.meta}>Fecha: {new Date(match.kickoffAt).toLocaleString('es-AR', { hour12: false })}</p>
              <p className={match.status === MatchStatus.FINISHED ? styles.finishedBadge : styles.pendingBadge}>
                {match.status === MatchStatus.FINISHED ? 'Finalizado' : 'Pendiente'}
              </p>
            </div>

            <div className={styles.actions}>
              <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/partidos/${match.id}`}>
                Ver
              </Link>
              {canEdit ? (
                <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/partidos/${match.id}/edit`}>
                  Editar
                </Link>
              ) : null}
              {canDelete ? (
                <button
                  className={buttonStyles.ghost}
                  disabled={deletingMatchId === match.id}
                  onClick={async () => {
                    setDeletingMatchId(match.id);
                    try {
                      await sileo.promise(apiClient.removeMatch(match.id), {
                        loading: { title: 'Eliminando partido...' },
                        success: { title: 'Partido eliminado' },
                        error: { title: 'No se pudo eliminar el partido' },
                      });
                      const refreshed = await apiClient.getMatches(tournamentId);
                      setMatches(refreshed);
                    } finally {
                      setDeletingMatchId(null);
                    }
                  }}
                  type="button"
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
