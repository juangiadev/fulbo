import { Trophy } from 'lucide-react';
import styles from './EmptyTournamentsState.module.css';

export function EmptyTournamentsState() {
  return (
    <section className={styles.emptyState}>
      <div aria-hidden="true" className={styles.icon}>
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
  );
}
