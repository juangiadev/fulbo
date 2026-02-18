import {
  DisplayPreference,
  MatchStatus,
  PlayerRole,
  TeamResult,
  TournamentVisibility,
} from './enums';

export interface UserProfile {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  nickname: string | null;
  imageUrl: string | null;
  favoriteTeamSlug: string | null;
  displayPreference: DisplayPreference;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerContract {
  id: string;
  userId: string | null;
  tournamentId: string;
  name: string;
  nickname: string | null;
  imageUrl: string | null;
  favoriteTeamSlug: string | null;
  displayPreference: DisplayPreference;
  role: PlayerRole;
  ability: number;
  injury: string | null;
  misses: number;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentContract {
  id: string;
  name: string;
  visibility: TournamentVisibility;
  imageUrl: string | null;
  leaderBannerImageUrl?: string | null;
  scorerBannerImageUrl?: string | null;
  finishedAt: string | null;
  membershipStatus?: 'MEMBER' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface StandingRowContract {
  playerId: string;
  displayName: string;
  mvp: number;
  points: number;
  goals: number;
  win: number;
  draw: number;
  loose: number;
  matchesPlayed: number;
  position: number;
}

export interface TournamentSummaryContract {
  tournamentId: string;
  standings: StandingRowContract[];
  leaderPlayerId: string | null;
  topScorerPlayerId: string | null;
}

export interface MatchContract {
  id: string;
  tournamentId: string;
  placeName: string;
  placeUrl: string | null;
  kickoffAt: string;
  stage: string;
  status: MatchStatus;
  mvpPlayerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamContract {
  id: string;
  matchId: string;
  name: string;
  imageUrl: string | null;
  result: TeamResult;
  color: string | null;
  playerTeams?: PlayerTeamContract[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerTeamContract {
  id: string;
  playerId: string;
  teamId: string;
  goals: number;
  injury: string | null;
  createdAt: string;
  updatedAt: string;
}
