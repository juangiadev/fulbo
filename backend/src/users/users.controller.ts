import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { FAVORITE_TEAMS } from '../../../shared/src/favorite-teams';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('favorite-teams')
  getFavoriteTeams() {
    return FAVORITE_TEAMS;
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post('me/sync')
  syncMe(@CurrentUser() user: AuthUser) {
    return this.usersService.syncMe(user);
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, dto);
  }
}
