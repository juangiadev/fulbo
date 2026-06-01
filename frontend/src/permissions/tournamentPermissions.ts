import { PlayerRole } from '@shared/enums';

export interface TournamentPermissions {
  role: PlayerRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  canEditTournament: boolean;
  canManagePlayers: boolean;
  canDeletePlayers: boolean;
  canManageInvites: boolean;
  canManageMatches: boolean;
  canCreateMatches: boolean;
  canDeleteMatches: boolean;
  canViewTierlist: boolean;
  canManageJoinRequests: boolean;
  canDeleteJoinRequests: boolean;
  canManagePlayerCodes: boolean;
  canViewPlayerPrivateDetails: boolean;
}

export function getTournamentPermissions(role: PlayerRole | null): TournamentPermissions {
  const safeRole = role ?? PlayerRole.USER;
  const isOwner = safeRole === PlayerRole.OWNER;
  const isAdmin = isOwner || safeRole === PlayerRole.ADMIN;

  return {
    role,
    isOwner,
    isAdmin,
    canEditTournament: isAdmin,
    canManagePlayers: isAdmin,
    canDeletePlayers: isOwner,
    canManageInvites: isAdmin,
    canManageMatches: isAdmin,
    canCreateMatches: isAdmin,
    canDeleteMatches: isOwner,
    canViewTierlist: isAdmin,
    canManageJoinRequests: isAdmin,
    canDeleteJoinRequests: isOwner,
    canManagePlayerCodes: isAdmin,
    canViewPlayerPrivateDetails: isAdmin,
  };
}
