import { PlayerRole } from '@shared/enums';
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Plus,
  Ticket,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentsPage.module.css';

const ROLE_LABELS: Record<PlayerRole, string> = {
  [PlayerRole.OWNER]: 'Organizador',
  [PlayerRole.ADMIN]: 'Administrador',
  [PlayerRole.USER]: 'Jugador',
};

export function TournamentsPage() {
  const { currentUser, data, getMyRole } = useAppContext();
  const joinedTournaments = data.tournaments.filter(
    (tournament) => tournament.membershipStatus !== 'PENDING',
  );
  const pendingTournaments = data.tournaments.filter(
    (tournament) => tournament.membershipStatus === 'PENDING',
  );
  const displayName = currentUser.nickname || currentUser.name || 'jugador';
  const tournamentLabel = joinedTournaments.length === 1 ? 'torneo' : 'torneos';

  return (
    <section className={styles.section}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Mi vestuario</p>
          <h1>
            Volvé a la cancha,
            <span>{displayName}.</span>
          </h1>
          <p className={styles.lead}>
            Elegí un torneo para seguir la competencia o prepará la próxima fecha.
          </p>

          <dl className={styles.summary}>
            <div>
              <dt>Torneos</dt>
              <dd>{joinedTournaments.length.toString().padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Solicitudes</dt>
              <dd>{pendingTournaments.length.toString().padStart(2, '0')}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.actionsPanel}>
          <div className={styles.panelTopline}>
            <span>Próxima jugada</span>
            <span aria-hidden="true">01</span>
          </div>
          <div className={styles.panelContent}>
            <div>
              <h2>Armá el partido</h2>
              <p>Creá una competencia nueva o sumate con el código de tu organizador.</p>
            </div>
            <Link className={styles.primaryAction} to="/tournaments/new">
              <span>
                <Plus aria-hidden="true" size={20} />
                Crear torneo
              </span>
              <ArrowUpRight aria-hidden="true" size={20} />
            </Link>
            <Link className={styles.secondaryAction} to="/tournaments/join">
              <Ticket aria-hidden="true" size={20} />
              Unirme con código
            </Link>
          </div>
        </div>
      </header>

      {joinedTournaments.length > 0 ? (
        <section aria-labelledby="joined-tournaments-title" className={styles.tournamentsSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Competencias</p>
              <h2 id="joined-tournaments-title">Tus torneos</h2>
            </div>
            <span>
              {joinedTournaments.length} {tournamentLabel}
            </span>
          </div>

          <div className={styles.tournamentsGrid}>
            {joinedTournaments.map((tournament, index) => {
              const role = getMyRole(tournament.id);

              return (
                <Link
                  className={styles.tournamentCard}
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}`}
                >
                  <div className={styles.cardVisual}>
                    {tournament.imageUrl ? (
                      <img alt="" loading="lazy" src={tournament.imageUrl} />
                    ) : (
                      <div aria-hidden="true" className={styles.cardPitch} />
                    )}
                    <span className={styles.cardIndex}>
                      TORNEO {(index + 1).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      {role ? <span className={styles.roleBadge}>{ROLE_LABELS[role]}</span> : null}
                      <span className={styles.cardDate}>
                        <CalendarDays aria-hidden="true" size={15} />
                        <time dateTime={tournament.createdAt}>
                          {new Date(tournament.createdAt).toLocaleDateString('es-AR')}
                        </time>
                      </span>
                    </div>
                    <h3>{tournament.name}</h3>
                    <span className={styles.cardFooter}>
                      Entrar al torneo
                      <ArrowUpRight aria-hidden="true" size={20} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {joinedTournaments.length === 0 && pendingTournaments.length === 0 ? (
        <section className={styles.emptyState}>
          <div aria-hidden="true" className={styles.emptyIcon}>
            <Trophy size={32} strokeWidth={1.6} />
          </div>
          <div>
            <p className={styles.eyebrow}>Primera fecha</p>
            <h2>Tu historia todavía no empezó</h2>
            <p>
              Creá tu primer torneo o pedile un código al organizador para sumarte a una competencia.
            </p>
          </div>
        </section>
      ) : null}

      {pendingTournaments.length > 0 ? (
        <section aria-labelledby="pending-tournaments-title" className={styles.pendingSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>En revisión</p>
              <h2 id="pending-tournaments-title">Solicitudes pendientes</h2>
            </div>
            <span>{pendingTournaments.length}</span>
          </div>

          <div className={styles.pendingList}>
            {pendingTournaments.map((tournament) => (
              <article className={styles.pendingCard} key={tournament.id}>
                <span aria-hidden="true" className={styles.pendingIcon}>
                  <Clock3 size={21} />
                </span>
                <div>
                  <h3>{tournament.name}</h3>
                  <p>Esperando aprobación del organizador.</p>
                </div>
                <span className={styles.pendingStatus}>Pendiente</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
