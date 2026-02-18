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
import { ClaimPlayerDto } from './dto/claim-player.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { CreateGuestPlayerDto } from './dto/create-guest-player.dto';
import { LinkPlayerDto } from './dto/link-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

@Controller('tournaments/:tournamentId/players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findByTournament(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.playersService.findByTournament(tournamentId, user.sub);
  }

  @Post()
  create(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlayerDto,
  ) {
    return this.playersService.create(tournamentId, user.sub, dto);
  }

  @Post('guest')
  createGuest(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGuestPlayerDto,
  ) {
    return this.playersService.createGuest(tournamentId, user.sub, dto);
  }

  @Post(':playerId/link')
  linkPlayer(
    @Param('tournamentId') tournamentId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkPlayerDto,
  ) {
    return this.playersService.linkPlayerToUser(
      tournamentId,
      playerId,
      user.sub,
      dto,
    );
  }

  @Post('claim')
  claimPlayer(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ClaimPlayerDto,
  ) {
    return this.playersService.claimPlayer(tournamentId, user.sub, dto);
  }

  @Post(':playerId/claim-code/regenerate')
  regenerateClaimCode(
    @Param('tournamentId') tournamentId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.playersService.regenerateClaimCode(
      tournamentId,
      playerId,
      user.sub,
    );
  }

  @Get(':playerId/claim-code/meta')
  getClaimCodeMeta(
    @Param('tournamentId') tournamentId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.playersService.getClaimCodeMeta(
      tournamentId,
      playerId,
      user.sub,
    );
  }

  @Patch(':playerId')
  update(
    @Param('tournamentId') tournamentId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.playersService.update(tournamentId, playerId, user.sub, dto);
  }

  @Delete(':playerId')
  async remove(
    @Param('tournamentId') tournamentId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.playersService.remove(tournamentId, playerId, user.sub);
    return { success: true };
  }
}
