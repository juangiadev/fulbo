import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player, PlayerTeam, Team } from '../database/entities';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { PlayerTeamsController } from './player-teams.controller';
import { PlayerTeamsService } from './player-teams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerTeam, Player, Team]),
    TournamentsModule,
  ],
  controllers: [PlayerTeamsController],
  providers: [PlayerTeamsService],
})
export class PlayerTeamsModule {}
