import { ArrowUpRight, Plus, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './NextPlayPanel.module.css';

export function NextPlayPanel() {
  return (
    <aside className={styles.panel} aria-label="Próxima jugada">
      <div className={styles.topline}>
        <span>Próxima jugada</span>
        <span aria-hidden="true">01</span>
      </div>
      <div className={styles.content}>
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
    </aside>
  );
}
