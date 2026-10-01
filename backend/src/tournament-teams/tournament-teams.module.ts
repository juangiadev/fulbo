import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament, TournamentTeam } from '../database/entities';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TournamentTeamsController } from './tournament-teams.controller';
import { TournamentTeamsService } from './tournament-teams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentTeam, Tournament]),
    TournamentsModule,
  ],
  controllers: [TournamentTeamsController],
  providers: [TournamentTeamsService],
})
export class TournamentTeamsModule {}
