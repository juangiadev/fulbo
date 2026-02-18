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
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('matches/:matchId/teams')
  findByMatch(@Param('matchId') matchId: string) {
    return this.teamsService.findByMatch(matchId);
  }

  @Post('matches/:matchId/teams')
  create(
    @Param('matchId') matchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(matchId, user.sub, dto);
  }

  @Patch('teams/:teamId')
  update(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(teamId, user.sub, dto);
  }

  @Delete('teams/:teamId')
  async remove(@Param('teamId') teamId: string, @CurrentUser() user: AuthUser) {
    await this.teamsService.remove(teamId, user.sub);
    return { success: true };
  }
}
