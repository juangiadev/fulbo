import { Match } from './match.entity';
import { PlayerTeam } from './player-team.entity';
import { Player } from './player.entity';
import { Team } from './team.entity';
import { TournamentInvite } from './tournament-invite.entity';
import { TournamentJoinRequest } from './tournament-join-request.entity';
import { Tournament } from './tournament.entity';
import { User } from './user.entity';

export const databaseEntities = [
  User,
  Tournament,
  Player,
  Match,
  Team,
  PlayerTeam,
  TournamentInvite,
  TournamentJoinRequest,
];

export {
  Match,
  Player,
  PlayerTeam,
  Team,
  Tournament,
  TournamentInvite,
  TournamentJoinRequest,
  User,
};
