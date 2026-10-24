import styles from './LockerRoomHero.module.css';

interface LockerRoomHeroProps {
  displayName: string;
  joinedTournamentCount: number;
  pendingTournamentCount: number;
  children: React.ReactNode;
}

export function LockerRoomHero({
  displayName,
  joinedTournamentCount,
  pendingTournamentCount,
  children,
}: LockerRoomHeroProps) {
  return (
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
            <dd>{joinedTournamentCount.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Solicitudes</dt>
            <dd>{pendingTournamentCount.toString().padStart(2, '0')}</dd>
          </div>
        </dl>
      </div>

      {children}
    </header>
  );
}
