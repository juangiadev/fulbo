import { useEffect, useState } from 'react';
import { PlayerRole } from '@shared/enums';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { ConfirmModal } from '../../components/ConfirmModal';
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
  const [confirmingTournamentId, setConfirmingTournamentId] = useState<string | null>(null);
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
                <Link className={buttonStyles.ghost} to={`/tournaments/${tournament.id}`}>
                  Ver
                </Link>
              ) : null}
              {[PlayerRole.OWNER, PlayerRole.ADMIN].includes(getMyRole(tournament.id) ?? PlayerRole.USER) ? (
                <Link className={buttonStyles.ghost} to={`/tournaments/${tournament.id}/edit`}>
                  Editar
                </Link>
              ) : null}
              {getMyRole(tournament.id) === PlayerRole.OWNER ? (
                <button
                  className={buttonStyles.ghost}
                  onClick={() => setConfirmingTournamentId(tournament.id)}
                  disabled={deletingTournamentId === tournament.id}
                  type="button"
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {confirmingTournamentId ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={deletingTournamentId === confirmingTournamentId}
          message="Esta accion elimina el torneo de forma permanente."
          onCancel={() => setConfirmingTournamentId(null)}
          onConfirm={async () => {
            setDeletingTournamentId(confirmingTournamentId);
            try {
              await sileo.promise(deleteTournament(confirmingTournamentId), {
                loading: { title: 'Eliminando torneo...' },
                success: { title: 'Torneo eliminado' },
                error: { title: 'No se pudo eliminar el torneo' },
              });
              setConfirmingTournamentId(null);
            } finally {
              setDeletingTournamentId(null);
            }
          }}
          title="Confirmar eliminacion"
        />
      ) : null}
    </section>
  );
}
