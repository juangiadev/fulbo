import { PlayerRole } from '@shared/enums';
import type { TournamentContract } from '@shared/contracts';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './TournamentCompetitions.module.css';

const ROLE_LABELS: Record<PlayerRole, string> = {
  [PlayerRole.OWNER]: 'Organizador',
  [PlayerRole.ADMIN]: 'Administrador',
  [PlayerRole.USER]: 'Jugador',
};

interface TournamentCompetitionsProps {
  tournaments: TournamentContract[];
  getMyRole: (tournamentId: string) => PlayerRole | null | undefined;
}

export function TournamentCompetitions({
  tournaments,
  getMyRole,
}: TournamentCompetitionsProps) {
  const tournamentLabel = tournaments.length === 1 ? 'torneo' : 'torneos';

  return (
    <section aria-labelledby="joined-tournaments-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Competencias</p>
          <h2 id="joined-tournaments-title">Tus torneos</h2>
        </div>
        <span>
          {tournaments.length} {tournamentLabel}
        </span>
      </div>

      <div className={styles.grid}>
        {tournaments.map((tournament, index) => {
          const role = getMyRole(tournament.id);

          return (
            <Link
              className={styles.card}
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
  );
}
