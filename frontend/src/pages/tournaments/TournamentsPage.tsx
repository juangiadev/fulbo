import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentSpinner } from '../../components/ContentSpinner';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentsPage.module.css';

const visibilityLabel: Record<string, string> = {
  PUBLIC: 'Publico',
  PRIVATE: 'Privado',
};

export function TournamentsPage() {
  const { data, loadTournaments } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void loadTournaments().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
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
          <Link className={buttonStyles.ghost} to="/guia-jugadores">
            Como editar mi jugador
          </Link>
        </div>
      </div>

      <div className={styles.tournamentsList}>
        {isLoading ? <ContentSpinner /> : data.tournaments.map((tournament) => {
          const isPending = tournament.membershipStatus === 'PENDING';

          const content = (
            <>
              <p className={styles.chip}>{visibilityLabel[tournament.visibility] ?? tournament.visibility}</p>
              <h3>{tournament.name}</h3>
              <p className={styles.subtle}>Creado: {new Date(tournament.createdAt).toLocaleDateString('es-AR')}</p>
              {isPending ? (
                <p className={styles.pendingBadge}>Pendiente</p>
              ) : null}
            </>
          );

          if (isPending) {
            return (
              <article
                aria-disabled="true"
                className={`${styles.card} ${styles.tournamentRow} ${styles.disabledCard}`}
                key={tournament.id}
              >
                {content}
              </article>
            );
          }

          return (
            <Link
              className={`${styles.card} ${styles.tournamentRow} ${styles.cardLink}`}
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
