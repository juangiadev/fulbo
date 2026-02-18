import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Match,
  Player,
  PlayerTeam,
  Tournament,
  TournamentInvite,
  TournamentJoinRequest,
  User,
} from '../database/entities';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      Player,
      User,
      TournamentInvite,
      TournamentJoinRequest,
      PlayerTeam,
      Match,
    ]),
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
