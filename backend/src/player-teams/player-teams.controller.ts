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
import { CreatePlayerTeamDto } from './dto/create-player-team.dto';
import { UpdatePlayerTeamDto } from './dto/update-player-team.dto';
import { PlayerTeamsService } from './player-teams.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PlayerTeamsController {
  constructor(private readonly playerTeamsService: PlayerTeamsService) {}

  @Get('teams/:teamId/players')
  findByTeam(@Param('teamId') teamId: string) {
    return this.playerTeamsService.findByTeam(teamId);
  }

  @Post('teams/:teamId/players')
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlayerTeamDto,
  ) {
    return this.playerTeamsService.create(teamId, user.sub, dto);
  }

  @Patch('player-teams/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePlayerTeamDto,
  ) {
    return this.playerTeamsService.update(id, user.sub, dto);
  }

  @Delete('player-teams/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.playerTeamsService.remove(id, user.sub);
    return { success: true };
  }
}
