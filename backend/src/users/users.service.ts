import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { User } from '../database/entities';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async syncMe(authUser: AuthUser): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { auth0Id: authUser.sub },
    });

    if (existing) {
      existing.email = authUser.email ?? existing.email;

      if (!existing.name && authUser.name) {
        existing.name = authUser.name;
      }

      if (!existing.nickname && authUser.nickname) {
        existing.nickname = authUser.nickname;
      }

      if (!existing.imageUrl && authUser.picture) {
        existing.imageUrl = authUser.picture;
      }

      return this.usersRepository.save(existing);
    }

    const created = this.usersRepository.create({
      auth0Id: authUser.sub,
      email: authUser.email ?? `${authUser.sub}@no-email.local`,
      name: authUser.name ?? 'Player',
      nickname: authUser.nickname ?? null,
      imageUrl: authUser.picture ?? null,
    });

    return this.usersRepository.save(created);
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
