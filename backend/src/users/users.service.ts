import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { User } from '../database/entities';
import { Auth0ManagementService } from './auth0-management.service';
import { SyncMeDto } from './dto/sync-me.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {}

  async syncMe(authUser: AuthUser, syncInput?: SyncMeDto): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { auth0Id: authUser.sub },
    });

    const authUserWithSyncInput: AuthUser = {
      ...authUser,
      email: authUser.email ?? syncInput?.email,
      name: authUser.name ?? syncInput?.name,
      nickname: authUser.nickname ?? syncInput?.nickname,
      picture: authUser.picture ?? syncInput?.picture,
    };

    const normalizedAuthUser = await this.enrichAuthUserIfNeeded(
      authUserWithSyncInput,
      existing,
    );

    if (existing) {
      if (normalizedAuthUser.email) {
        existing.email = normalizedAuthUser.email;
      }

      if (!existing.name && normalizedAuthUser.name) {
        existing.name = normalizedAuthUser.name;
      }

      if (!existing.nickname && normalizedAuthUser.nickname) {
        existing.nickname = normalizedAuthUser.nickname;
      }

      if (!existing.imageUrl && normalizedAuthUser.picture) {
        existing.imageUrl = normalizedAuthUser.picture;
      }

      return this.usersRepository.save(existing);
    }

    const created = this.usersRepository.create({
      auth0Id: normalizedAuthUser.sub,
      email:
        normalizedAuthUser.email ??
        `${normalizedAuthUser.sub}@no-email.local`,
      name: normalizedAuthUser.name ?? 'Player',
      nickname: normalizedAuthUser.nickname ?? null,
      imageUrl: normalizedAuthUser.picture ?? null,
    });

    return this.usersRepository.save(created);
  }

  private async enrichAuthUserIfNeeded(
    authUser: AuthUser,
    existing: User | null,
  ): Promise<AuthUser> {
    const shouldFillEmail =
      !authUser.email &&
      (!existing || existing.email.endsWith('@no-email.local'));
    const shouldFillName = !authUser.name && (!existing || !existing.name);
    const shouldFillNickname =
      !authUser.nickname && (!existing || !existing.nickname);
    const shouldFillPicture =
      !authUser.picture && (!existing || !existing.imageUrl);

    if (
      !shouldFillEmail &&
      !shouldFillName &&
      !shouldFillNickname &&
      !shouldFillPicture
    ) {
      return authUser;
    }

    const profile = await this.auth0ManagementService.getUserProfile(authUser.sub);
    if (!profile) {
      return authUser;
    }

    return {
      ...authUser,
      email: authUser.email ?? profile.email,
      name: authUser.name ?? profile.name,
      nickname: authUser.nickname ?? profile.nickname,
      picture: authUser.picture ?? profile.picture,
    };
  }

  async getMe(auth0Id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { auth0Id } });
    if (!user) {
      throw new NotFoundException(
        'User not found. Call POST /users/me/sync first.',
      );
    }
    return user;
  }

  async updateMe(auth0Id: string, dto: UpdateMeDto): Promise<User> {
    const user = await this.getMe(auth0Id);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'ASC' } });
  }
}
