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
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';
import { TournamentTeamsService } from './tournament-teams.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TournamentTeamsController {
  constructor(
    private readonly tournamentTeamsService: TournamentTeamsService,
  ) {}

  @Get('tournaments/:tournamentId/teams')
  findByTournament(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tournamentTeamsService.findByTournament(tournamentId, user.sub);
  }

  @Post('tournaments/:tournamentId/teams')
  create(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTournamentTeamDto,
  ) {
    return this.tournamentTeamsService.create(tournamentId, user.sub, dto);
  }

  @Patch('tournament-teams/:teamId')
  update(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTournamentTeamDto,
  ) {
    return this.tournamentTeamsService.update(teamId, user.sub, dto);
  }

  @Delete('tournament-teams/:teamId')
  async remove(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    await this.tournamentTeamsService.remove(teamId, user.sub);
    return { success: true };
  }
}
