import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { DisplayPreference, PlayerRole } from '../../../shared/src/enums';
import { Repository } from 'typeorm';
import {
  assertTournamentEditor,
  assertTournamentOwner,
  canEditPlayer,
} from '../common/player-role.utils';
import { Player, Tournament, User } from '../database/entities';
import { ClaimPlayerDto } from './dto/claim-player.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { CreateGuestPlayerDto } from './dto/create-guest-player.dto';
import { LinkPlayerDto } from './dto/link-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { TournamentsService } from '../tournaments/tournaments.service';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Tournament)
    private readonly tournamentsRepository: Repository<Tournament>,
    private readonly tournamentsService: TournamentsService,
  ) {}

  async findByTournament(
    tournamentId: string,
    auth0Id: string,
  ): Promise<Player[]> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );

    if ([PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
      return this.playersRepository.find({
        where: { tournamentId },
        relations: { user: true },
        order: { createdAt: 'ASC' },
      });
    }

    const ownPlayer = await this.playersRepository.findOne({
      where: { id: actor.id },
      relations: { user: true },
    });

    return ownPlayer ? [ownPlayer] : [];
  }

  async create(
    tournamentId: string,
    auth0Id: string,
    dto: CreatePlayerDto,
  ): Promise<Player> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const player = this.playersRepository.create({
      userId: user.id,
      tournamentId,
      name: dto.name ?? user.name,
      nickname: dto.nickname ?? user.nickname,
      imageUrl: dto.imageUrl ?? user.imageUrl,
      favoriteTeamSlug: dto.favoriteTeamSlug ?? user.favoriteTeamSlug,
      displayPreference: dto.displayPreference ?? user.displayPreference,
      role: dto.role ?? PlayerRole.USER,
      ability: dto.ability ?? null,
      injury: dto.injury ?? null,
      misses: dto.misses ?? 0,
    });

    return this.playersRepository.save(player);
  }

  async createGuest(
    tournamentId: string,
    auth0Id: string,
    dto: CreateGuestPlayerDto,
  ): Promise<{ player: Player; claimCode: string }> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const claimCode = this.generateClaimCode();

    const player = await this.playersRepository.save(
      this.playersRepository.create({
        userId: null,
        tournamentId,
        name: dto.name,
        nickname: dto.nickname ?? null,
        imageUrl: dto.imageUrl ?? null,
        favoriteTeamSlug: dto.favoriteTeamSlug ?? null,
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.USER,
        ability: dto.ability ?? null,
        injury: dto.injury ?? null,
        misses: dto.misses ?? 0,
        claimCodeHash: this.hashClaimCode(claimCode),
        claimCodeExpiresAt: this.claimExpirationDate(),
      }),
    );

    return { player, claimCode };
  }

  async update(
    tournamentId: string,
    playerId: string,
    auth0Id: string,
    dto: UpdatePlayerDto,
  ): Promise<Player> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    const target = await this.playersRepository.findOne({
      where: { id: playerId, tournamentId },
    });

    if (!target) {
      throw new NotFoundException('Player not found');
    }

    if (!canEditPlayer(actor, target)) {
      throw new ForbiddenException('You are not allowed to edit this player');
    }

    if (dto.role && dto.role !== target.role) {
      if (actor.role === PlayerRole.ADMIN) {
        if (dto.role === PlayerRole.OWNER) {
          throw new ForbiddenException('Only owners can assign owner role');
        }

        if (![PlayerRole.ADMIN, PlayerRole.USER].includes(dto.role)) {
          throw new ForbiddenException('Invalid role change');
        }
      } else if (actor.role !== PlayerRole.OWNER) {
        throw new ForbiddenException('Only admins or owners can change roles');
      }

      if (
        actor.role === PlayerRole.OWNER &&
        dto.role === PlayerRole.OWNER &&
        actor.id !== target.id
      ) {
        const [updatedTarget] =
          await this.playersRepository.manager.transaction(async (manager) => {
            const actorInTournament = await manager.findOne(Player, {
              where: { id: actor.id, tournamentId },
            });

            const targetInTournament = await manager.findOne(Player, {
              where: { id: target.id, tournamentId },
            });

            if (!actorInTournament || !targetInTournament) {
              throw new NotFoundException('Player not found');
            }

            actorInTournament.role = PlayerRole.USER;
            targetInTournament.role = PlayerRole.OWNER;

            const savedActor = await manager.save(actorInTournament);
            const savedTarget = await manager.save(targetInTournament);

            return [savedTarget, savedActor] as const;
          });

        return updatedTarget;
      }
    }

    const safeDto = { ...dto };
    delete safeDto.userId;
    Object.assign(target, safeDto);
    return this.playersRepository.save(target);
  }

  async linkPlayerToUser(
    tournamentId: string,
    playerId: string,
    auth0Id: string,
    dto: LinkPlayerDto,
  ): Promise<Player> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    const player = await this.playersRepository.findOne({
      where: { id: playerId, tournamentId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.userId) {
      throw new BadRequestException('This player is already linked to a user');
    }

    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.playersRepository.findOne({
      where: { tournamentId, userId: user.id },
    });
    if (existing) {
      throw new BadRequestException(
        'User already has a player in this tournament',
      );
    }

    player.userId = user.id;
    player.claimCodeHash = null;
    player.claimCodeExpiresAt = null;
    return this.playersRepository.save(player);
  }

  async claimPlayer(
    tournamentId: string,
    auth0Id: string,
    dto: ClaimPlayerDto,
  ): Promise<Player> {
    const user = await this.usersRepository.findOne({ where: { auth0Id } });
    if (!user) {
      throw new NotFoundException(
        'User not found. Call POST /users/me/sync first.',
      );
    }

    const existing = await this.playersRepository.findOne({
      where: { tournamentId, userId: user.id },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have a player in this tournament',
      );
    }

    const player = await this.playersRepository.findOne({
      where: {
        tournamentId,
        claimCodeHash: this.hashClaimCode(dto.claimCode),
      },
    });

    if (!player) {
      throw new BadRequestException('Invalid claim code');
    }

    if (!player.claimCodeExpiresAt || player.claimCodeExpiresAt < new Date()) {
      throw new BadRequestException('Claim code expired');
    }

    if (player.userId) {
      throw new BadRequestException('This player is already linked');
    }

    player.userId = user.id;
    player.claimCodeHash = null;
    player.claimCodeExpiresAt = null;

    return this.playersRepository.save(player);
  }

  async claimPlayerByCode(
    auth0Id: string,
    dto: ClaimPlayerDto,
  ): Promise<Player> {
    const user = await this.usersRepository.findOne({ where: { auth0Id } });
    if (!user) {
      throw new NotFoundException(
        'User not found. Call POST /users/me/sync first.',
      );
    }

    const player = await this.playersRepository.findOne({
      where: { claimCodeHash: this.hashClaimCode(dto.claimCode) },
    });

    if (!player) {
      throw new BadRequestException('Invalid claim code');
    }

    if (!player.claimCodeExpiresAt || player.claimCodeExpiresAt < new Date()) {
      throw new BadRequestException('Claim code expired');
    }

    const existing = await this.playersRepository.findOne({
      where: { tournamentId: player.tournamentId, userId: user.id },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a player in this tournament',
      );
    }

    player.userId = user.id;
    player.claimCodeHash = null;
    player.claimCodeExpiresAt = null;

    return this.playersRepository.save(player);
  }

  async regenerateClaimCode(
    tournamentId: string,
    playerId: string,
    auth0Id: string,
  ): Promise<{ claimCode: string; expiresAt: Date }> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    const player = await this.playersRepository.findOne({
      where: { id: playerId, tournamentId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.userId) {
      throw new BadRequestException('Player already linked');
    }

    const claimCode = this.generateClaimCode();
    const expiresAt = this.claimExpirationDate();
    player.claimCodeHash = this.hashClaimCode(claimCode);
    player.claimCodeExpiresAt = expiresAt;
    await this.playersRepository.save(player);

    return { claimCode, expiresAt };
  }

  async getClaimCodeMeta(
    tournamentId: string,
    playerId: string,
    auth0Id: string,
  ): Promise<{ expiresAt: Date | null }> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    const player = await this.playersRepository.findOne({
      where: { id: playerId, tournamentId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.userId) {
      return { expiresAt: null };
    }

    return { expiresAt: player.claimCodeExpiresAt };
  }

  async remove(
    tournamentId: string,
    playerId: string,
    auth0Id: string,
  ): Promise<void> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    const target = await this.playersRepository.findOne({
      where: { id: playerId, tournamentId },
    });

    if (!target) {
      throw new NotFoundException('Player not found');
    }

    if (target.role === PlayerRole.OWNER) {
      throw new ForbiddenException('Owner player cannot be removed');
    }

    assertTournamentOwner(actor);

    await this.playersRepository.delete({ id: target.id });
  }

  private generateClaimCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private hashClaimCode(claimCode: string): string {
    return createHash('sha256')
      .update(claimCode.trim().toUpperCase())
      .digest('hex');
  }

  private claimExpirationDate(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    return expiration;
  }
}
