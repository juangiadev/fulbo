import { useMemo } from 'react';
import { getTournamentPermissions } from '../permissions/tournamentPermissions';
import { useAppContext } from '../state/AppContext';

export function useTournamentPermissions(tournamentId: string | undefined) {
  const { getMyRole } = useAppContext();
  const role = tournamentId ? getMyRole(tournamentId) : null;

  return useMemo(() => getTournamentPermissions(role), [role]);
}
