import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ClaimPlayerDto } from './dto/claim-player.dto';
import { PlayersService } from './players.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersClaimController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('claim')
  claimByCode(@CurrentUser() user: AuthUser, @Body() dto: ClaimPlayerDto) {
    return this.playersService.claimPlayerByCode(user.sub, dto);
  }
}
