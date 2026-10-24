import { EmptyTournamentsState } from '../../../components/EmptyTournamentsState';
import { LockerRoomHero } from '../../../components/LockerRoomHero';
import { NextPlayPanel } from '../../../components/NextPlayPanel';
import { PendingTournaments } from '../../../components/PendingTournaments';
import { TournamentCompetitions } from '../../../components/TournamentCompetitions';
import { useAppContext } from '../../../state/AppContext';
import styles from './HomePage.module.css';

export function HomePage() {
  const { currentUser, data, getMyRole } = useAppContext();
  const joinedTournaments = data.tournaments.filter(
    (tournament) => tournament.membershipStatus !== 'PENDING',
  );
  const pendingTournaments = data.tournaments.filter(
    (tournament) => tournament.membershipStatus === 'PENDING',
  );
  const displayName = currentUser.nickname || currentUser.name || 'jugador';

  return (
    <section className={styles.section}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <LockerRoomHero
        displayName={displayName}
        joinedTournamentCount={joinedTournaments.length}
        pendingTournamentCount={pendingTournaments.length}
      >
        <NextPlayPanel />
      </LockerRoomHero>

      {joinedTournaments.length > 0 ? (
        <TournamentCompetitions tournaments={joinedTournaments} getMyRole={getMyRole} />
      ) : null}

      {joinedTournaments.length === 0 && pendingTournaments.length === 0 ? (
        <EmptyTournamentsState />
      ) : null}

      {pendingTournaments.length > 0 ? (
        <PendingTournaments tournaments={pendingTournaments} />
      ) : null}
    </section>
  );
}
