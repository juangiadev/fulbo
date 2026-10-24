import type { TournamentContract } from '@shared/contracts';
import { Clock3 } from 'lucide-react';
import styles from './PendingTournaments.module.css';

interface PendingTournamentsProps {
  tournaments: TournamentContract[];
}

export function PendingTournaments({ tournaments }: PendingTournamentsProps) {
  return (
    <section aria-labelledby="pending-tournaments-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>En revisión</p>
          <h2 id="pending-tournaments-title">Solicitudes pendientes</h2>
        </div>
        <span>{tournaments.length}</span>
      </div>

      <div className={styles.list}>
        {tournaments.map((tournament) => (
          <article className={styles.card} key={tournament.id}>
            <span aria-hidden="true" className={styles.icon}>
              <Clock3 size={21} />
            </span>
            <div>
              <h3>{tournament.name}</h3>
              <p>Esperando aprobación del organizador.</p>
            </div>
            <span className={styles.status}>Pendiente</span>
          </article>
        ))}
      </div>
    </section>
  );
}
