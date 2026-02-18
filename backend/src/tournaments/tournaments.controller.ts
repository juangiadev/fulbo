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
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JoinTournamentDto } from './dto/join-tournament.dto';
import { LinkJoinRequestDto } from './dto/link-join-request.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tournamentsService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentsService.findOne(id, user.sub);
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentsService.getSummary(id, user.sub);
  }

  @Post('join')
  joinByCode(@CurrentUser() user: AuthUser, @Body() dto: JoinTournamentDto) {
    return this.tournamentsService.joinByTournamentCode(user.sub, dto);
  }

  @Post(':id/invite/regenerate')
  regenerateInviteCode(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentsService.regenerateInviteCode(id, user.sub);
  }

  @Get(':id/invite')
  getInviteMeta(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentsService.getInviteMeta(id, user.sub);
  }

  @Get(':id/join-requests')
  getJoinRequests(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentsService.getJoinRequests(id, user.sub);
  }

  @Post(':id/join-requests/:requestId/link')
  linkJoinRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkJoinRequestDto,
  ) {
    return this.tournamentsService.linkJoinRequest(
      id,
      requestId,
      user.sub,
      dto,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.tournamentsService.remove(id, user.sub);
    return { success: true };
  }
}
