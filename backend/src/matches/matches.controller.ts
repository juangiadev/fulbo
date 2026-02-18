import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpsertMatchLineupDto } from './dto/upsert-match-lineup.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchesService } from './matches.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('tournaments/:tournamentId/matches')
  findByTournament(@Param('tournamentId') tournamentId: string) {
    return this.matchesService.findByTournament(tournamentId);
  }

  @Post('tournaments/:tournamentId/matches')
  create(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMatchDto,
  ) {
    return this.matchesService.create(tournamentId, user.sub, dto);
  }

  @Patch('matches/:matchId')
  update(
    @Param('matchId') matchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMatchDto,
  ) {
    return this.matchesService.update(matchId, user.sub, dto);
  }

  @Post('matches/:matchId/lineup')
  upsertLineup(
    @Param('matchId') matchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertMatchLineupDto,
  ) {
    return this.matchesService.upsertLineup(matchId, user.sub, dto);
  }

  @Delete('matches/:matchId')
  async remove(
    @Param('matchId') matchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.matchesService.remove(matchId, user.sub);
    return { success: true };
  }
}
