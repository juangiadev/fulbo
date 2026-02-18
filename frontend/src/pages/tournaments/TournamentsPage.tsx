import { useEffect, useState } from 'react';
import { PlayerRole } from '@shared/enums';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { ContentSpinner } from '../../components/ContentSpinner';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentsPage.module.css';

const visibilityLabel: Record<string, string> = {
  PUBLIC: 'Publico',
  PRIVATE: 'Privado',
};

export function TournamentsPage() {
  const { data, deleteTournament, getMyRole, loadTournaments } = useAppContext();
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    void loadTournaments().finally(() => setIsLoading(false));
  }, [loadTournaments]);

  return (
    <section className={styles.section}>
      <div>
        <h2>Torneos</h2>
        <p className={styles.subtle}>Listado de torneos disponibles.</p>
      </div>

      <div className={styles.listActions}>
        <div className={styles.topActions}>
          <Link className={buttonStyles.primary} to="/tournaments/new">
            Crear torneo
          </Link>
          <Link className={buttonStyles.ghost} to="/tournaments/join">
            Unirse a un torneo
          </Link>
        </div>
      </div>

      <div className={styles.tournamentsList}>
        {isLoading ? <ContentSpinner /> : data.tournaments.map((tournament) => (
          <article key={tournament.id} className={`${styles.card} ${styles.tournamentRow}`}>
            <div>
              <p className={styles.chip}>{visibilityLabel[tournament.visibility] ?? tournament.visibility}</p>
              <h3>{tournament.name}</h3>
              <p className={styles.subtle}>Creado: {new Date(tournament.createdAt).toLocaleDateString('es-AR')}</p>
              {tournament.membershipStatus === 'PENDING' ? (
                <p className={styles.pendingBadge}>Pendiente</p>
              ) : null}
            </div>
            <div className={styles.rowActions}>
              {tournament.membershipStatus === 'MEMBER' ? (
                <Link aria-label="Ver torneo" className={styles.iconBtn} title="Ver torneo" to={`/tournaments/${tournament.id}`}>
                  <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                    <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Link>
              ) : null}
              {[PlayerRole.OWNER, PlayerRole.ADMIN].includes(getMyRole(tournament.id) ?? PlayerRole.USER) ? (
                <Link aria-label="Editar torneo" className={styles.iconBtn} title="Editar torneo" to={`/tournaments/${tournament.id}/edit`}>
                  <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                    <path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Link>
              ) : null}
              {getMyRole(tournament.id) === PlayerRole.OWNER ? (
                <button
                  aria-label="Eliminar torneo"
                  className={`${styles.iconBtn} ${styles.dangerIcon}`}
                  onClick={async () => {
                    setDeletingTournamentId(tournament.id);
                    try {
                      await sileo.promise(deleteTournament(tournament.id), {
                        loading: { title: 'Eliminando torneo...' },
                        success: { title: 'Torneo eliminado' },
                        error: { title: 'No se pudo eliminar el torneo' },
                      });
                    } finally {
                      setDeletingTournamentId(null);
                    }
                  }}
                  disabled={deletingTournamentId === tournament.id}
                  title="Eliminar torneo"
                  type="button"
                >
                  <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                    <path d="M5 7h14M9 7V5h6v2m-8 0l1 12h8l1-12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
