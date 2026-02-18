import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player, Tournament, User } from '../database/entities';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { PlayersClaimController } from './players-claim.controller';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Player, User, Tournament]),
    TournamentsModule,
  ],
  controllers: [PlayersController, PlayersClaimController],
  providers: [PlayersService],
})
export class PlayersModule {}
