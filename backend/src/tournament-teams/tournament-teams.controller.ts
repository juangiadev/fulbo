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
import { UpdatePlayerDto } from '../players/dto/update-player.dto';
import { CreateRosterPlayerDto } from './dto/create-roster-player.dto';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateRosterTeamAdminDto } from './dto/update-roster-team-admin.dto';
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

  @Get('tournament-teams/:teamId/roster')
  findRoster(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    return this.tournamentTeamsService.findRoster(teamId, user.sub);
  }

  @Post('tournament-teams/:teamId/roster')
  createRosterPlayer(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRosterPlayerDto,
  ) {
    return this.tournamentTeamsService.createRosterPlayer(
      teamId,
      user.sub,
      dto,
    );
  }

  @Patch('tournament-teams/:teamId/roster/:playerId')
  updateRosterPlayer(
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.tournamentTeamsService.updateRosterPlayer(
      teamId,
      playerId,
      user.sub,
      dto,
    );
  }

  @Patch('tournament-teams/:teamId/roster/:playerId/team-admin')
  updateRosterTeamAdmin(
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRosterTeamAdminDto,
  ) {
    return this.tournamentTeamsService.updateRosterTeamAdmin(
      teamId,
      playerId,
      user.sub,
      dto,
    );
  }

  @Delete('tournament-teams/:teamId/roster/:playerId')
  async removeRosterPlayer(
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tournamentTeamsService.removeRosterPlayer(
      teamId,
      playerId,
      user.sub,
    );
    return { success: true };
  }

  @Delete('tournament-teams/:teamId')
  async remove(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    await this.tournamentTeamsService.remove(teamId, user.sub);
    return { success: true };
  }
}
