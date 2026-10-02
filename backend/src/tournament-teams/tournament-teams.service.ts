import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import {
  DisplayPreference,
  PlayerRole,
  TournamentFormat,
  TournamentType,
} from '../../../shared/src/enums';
import { Repository } from 'typeorm';
import {
  assertTournamentEditor,
  assertTournamentOwner,
} from '../common/player-role.utils';
import {
  DEFAULT_PLAYER_ABILITY,
  Player,
  Tournament,
  TournamentTeam,
} from '../database/entities';
import { UpdatePlayerDto } from '../players/dto/update-player.dto';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateRosterPlayerDto } from './dto/create-roster-player.dto';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateRosterTeamAdminDto } from './dto/update-roster-team-admin.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';

@Injectable()
export class TournamentTeamsService {
  constructor(
    @InjectRepository(TournamentTeam)
    private readonly tournamentTeamsRepository: Repository<TournamentTeam>,
    @InjectRepository(Tournament)
    private readonly tournamentsRepository: Repository<Tournament>,
    private readonly tournamentsService: TournamentsService,
  ) {}

  async findByTournament(
    tournamentId: string,
    auth0Id: string,
  ): Promise<TournamentTeam[]> {
    await this.tournamentsService.findActorForTournament(tournamentId, auth0Id);

    const tournament = await this.getTournamentOrThrow(tournamentId);
    if (tournament.type !== TournamentType.TEAMS) {
      return [];
    }

    return this.tournamentTeamsRepository.find({
      where: { tournamentId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    tournamentId: string,
    auth0Id: string,
    dto: CreateTournamentTeamDto,
  ): Promise<TournamentTeam> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);
    await this.assertTeamsTournament(tournamentId);

    return this.tournamentTeamsRepository.save(
      this.tournamentTeamsRepository.create({
        tournamentId,
        name: this.normalizeName(dto.name),
        imageUrl: dto.imageUrl ?? null,
      }),
    );
  }

  async update(
    teamId: string,
    auth0Id: string,
    dto: UpdateTournamentTeamDto,
  ): Promise<TournamentTeam> {
    const team = await this.getTeamWithTournamentOrThrow(teamId);

    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);
    this.assertTeamsTournamentEntity(team.tournament);

    if (dto.name !== undefined) {
      team.name = this.normalizeName(dto.name);
    }
    if (dto.imageUrl !== undefined) {
      team.imageUrl = dto.imageUrl;
    }

    return this.tournamentTeamsRepository.save(team);
  }

  async remove(teamId: string, auth0Id: string): Promise<void> {
    const team = await this.getTeamWithTournamentOrThrow(teamId);

    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    assertTournamentOwner(actor);
    this.assertTeamsTournamentEntity(team.tournament);

    await this.tournamentTeamsRepository.delete({ id: teamId });
  }

  async findRoster(teamId: string, auth0Id: string): Promise<Player[]> {
    const team = await this.getLigaTeamOrThrow(teamId);
    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );

    if (!this.canOpenLigaRosterTeam(actor, team.id)) {
      throw new ForbiddenException('You are not allowed to view this roster');
    }

    return this.playersRepository.find({
      where: { tournamentTeamId: teamId, tournamentId: team.tournamentId },
      order: { createdAt: 'ASC' },
    });
  }

  async createRosterPlayer(
    teamId: string,
    auth0Id: string,
    dto: CreateRosterPlayerDto,
  ): Promise<{ player: Player; claimCode: string }> {
    const team = await this.getLigaTeamOrThrow(teamId);
    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    assertTournamentOwner(actor);

    const claimCode = this.generateClaimCode();
    const player = await this.playersRepository.save(
      this.playersRepository.create({
        userId: null,
        tournamentId: team.tournamentId,
        tournamentTeamId: team.id,
        isTeamAdmin: false,
        name: dto.name,
        nickname: dto.nickname ?? null,
        imageUrl: dto.imageUrl ?? null,
        favoriteTeamSlug: dto.favoriteTeamSlug ?? null,
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.USER,
        ability: dto.ability ?? DEFAULT_PLAYER_ABILITY,
        injury: dto.injury ?? null,
        misses: dto.misses ?? 0,
        claimCodeHash: this.hashClaimCode(claimCode),
        claimCodeExpiresAt: this.claimExpirationDate(),
      }),
    );

    return { player, claimCode };
  }

  async updateRosterPlayer(
    teamId: string,
    playerId: string,
    auth0Id: string,
    dto: UpdatePlayerDto,
  ): Promise<Player> {
    const team = await this.getLigaTeamOrThrow(teamId);
    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    const target = await this.getRosterPlayerOrThrow(team, playerId);

    const safeDto = this.buildRosterUpdateDto(actor, target, dto);
    Object.assign(target, safeDto);

    return this.playersRepository.save(target);
  }

  async updateRosterTeamAdmin(
    teamId: string,
    playerId: string,
    auth0Id: string,
    dto: UpdateRosterTeamAdminDto,
  ): Promise<Player> {
    const team = await this.getLigaTeamOrThrow(teamId);
    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    assertTournamentOwner(actor);

    const target = await this.getRosterPlayerOrThrow(team, playerId);
    target.isTeamAdmin = dto.isTeamAdmin;

    return this.playersRepository.save(target);
  }

  async removeRosterPlayer(
    teamId: string,
    playerId: string,
    auth0Id: string,
  ): Promise<void> {
    const team = await this.getLigaTeamOrThrow(teamId);
    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    assertTournamentOwner(actor);

    const target = await this.getRosterPlayerOrThrow(team, playerId);
    if (target.role === PlayerRole.OWNER) {
      throw new ForbiddenException('Owner player cannot be removed');
    }

    await this.playersRepository.delete({ id: target.id });
  }

  private get playersRepository(): Repository<Player> {
    return this.tournamentTeamsRepository.manager.getRepository(Player);
  }

  private buildRosterUpdateDto(
    actor: Player,
    target: Player,
    dto: UpdatePlayerDto,
  ): Partial<Player> {
    if (actor.role === PlayerRole.OWNER) {
      return this.omitRosterProtectedFields(dto);
    }

    if (
      actor.role === PlayerRole.ADMIN &&
      actor.tournamentTeamId &&
      actor.tournamentTeamId === target.tournamentTeamId
    ) {
      return this.omitRosterProtectedFields(dto);
    }

    throw new ForbiddenException('You are not allowed to edit this player');
  }

  private canOpenLigaRosterTeam(actor: Player, teamId: string): boolean {
    return actor.role === PlayerRole.OWNER || actor.tournamentTeamId === teamId;
  }

  private omitRosterProtectedFields(dto: UpdatePlayerDto): Partial<Player> {
    const safeDto = { ...dto } as Partial<Player>;
    delete safeDto.userId;
    delete safeDto.tournamentId;
    delete safeDto.tournamentTeamId;
    delete safeDto.isTeamAdmin;
    delete safeDto.role;
    delete safeDto.claimCodeHash;
    delete safeDto.claimCodeExpiresAt;
    return safeDto;
  }

  private async getRosterPlayerOrThrow(
    team: TournamentTeam,
    playerId: string,
  ): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: {
        id: playerId,
        tournamentId: team.tournamentId,
        tournamentTeamId: team.id,
      },
    });

    if (!player) {
      throw new NotFoundException('Roster player not found');
    }

    return player;
  }

  private async getLigaTeamOrThrow(teamId: string): Promise<TournamentTeam> {
    const team = await this.getTeamWithTournamentOrThrow(teamId);
    this.assertLigaTeamsTournamentEntity(team.tournament);
    return team;
  }

  private async getTeamWithTournamentOrThrow(
    teamId: string,
  ): Promise<TournamentTeam> {
    const team = await this.tournamentTeamsRepository.findOne({
      where: { id: teamId },
      relations: { tournament: true },
    });
    if (!team) {
      throw new NotFoundException('Tournament team not found');
    }
    return team;
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Team name is required');
    }

    return normalizedName;
  }

  private async assertTeamsTournament(tournamentId: string): Promise<void> {
    this.assertTeamsTournamentEntity(
      await this.getTournamentOrThrow(tournamentId),
    );
  }

  private assertTeamsTournamentEntity(tournament: Tournament): void {
    if (tournament.type !== TournamentType.TEAMS) {
      throw new BadRequestException(
        'Tournament teams are only available for team tournaments',
      );
    }
  }

  private assertLigaTeamsTournamentEntity(tournament: Tournament): void {
    if (
      tournament.type !== TournamentType.TEAMS ||
      tournament.format !== TournamentFormat.LIGA
    ) {
      throw new BadRequestException(
        'Team rosters are only available for Liga team tournaments',
      );
    }
  }

  private async getTournamentOrThrow(
    tournamentId: string,
  ): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
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
