import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { MatchStatus, PlayerRole, TeamResult } from '../../../shared/src/enums';
import { Repository } from 'typeorm';
import {
  Match,
  Player,
  PlayerTeam,
  Tournament,
  TournamentInvite,
  TournamentJoinRequest,
  User,
} from '../database/entities';
import { JoinRequestStatus } from '../database/entities/tournament-join-request.entity';
import { assertTournamentOwner } from '../common/player-role.utils';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JoinTournamentDto } from './dto/join-tournament.dto';
import { LinkJoinRequestDto } from './dto/link-join-request.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentsRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(TournamentInvite)
    private readonly invitesRepository: Repository<TournamentInvite>,
    @InjectRepository(TournamentJoinRequest)
    private readonly joinRequestsRepository: Repository<TournamentJoinRequest>,
    @InjectRepository(PlayerTeam)
    private readonly playerTeamsRepository: Repository<PlayerTeam>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
  ) {}

  async create(auth0Id: string, dto: CreateTournamentDto): Promise<Tournament> {
    const user = await this.usersRepository.findOne({ where: { auth0Id } });
    if (!user) {
      throw new NotFoundException(
        'User not found. Call POST /users/me/sync first.',
      );
    }

    const tournament = await this.tournamentsRepository.save(
      this.tournamentsRepository.create(dto),
    );

    await this.playersRepository.save(
      this.playersRepository.create({
        userId: user.id,
        tournamentId: tournament.id,
        role: PlayerRole.OWNER,
        name: user.name,
        nickname: user.nickname,
        imageUrl: user.imageUrl,
        favoriteTeamSlug: user.favoriteTeamSlug,
        displayPreference: user.displayPreference,
      }),
    );

    return tournament;
  }

  async findAll(auth0Id: string): Promise<Tournament[]> {
    const user = await this.getUserFromAuth0(auth0Id);

    const memberTournaments = await this.tournamentsRepository
      .createQueryBuilder('tournament')
      .innerJoin('tournament.players', 'player', 'player.userId = :userId', {
        userId: user.id,
      })
      .orderBy('tournament.createdAt', 'DESC')
      .getMany();

    const pendingRequests = await this.joinRequestsRepository.find({
      where: { userId: user.id, status: JoinRequestStatus.PENDING },
      relations: { tournament: true },
      order: { createdAt: 'DESC' },
    });

    const byTournamentId = new Map<string, Tournament>();

    memberTournaments.forEach((tournament) => {
      byTournamentId.set(tournament.id, {
        ...tournament,
        membershipStatus: 'MEMBER',
      } as Tournament);
    });

    pendingRequests.forEach((request) => {
      if (!byTournamentId.has(request.tournamentId)) {
        byTournamentId.set(request.tournamentId, {
          ...request.tournament,
          membershipStatus: 'PENDING',
        } as Tournament);
      }
    });

    return Array.from(byTournamentId.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async findOne(id: string, auth0Id: string): Promise<Tournament> {
    await this.findActorForTournament(id, auth0Id);

    const tournament = await this.tournamentsRepository.findOne({
      where: { id },
      relations: { players: true, matches: true },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async update(
    id: string,
    auth0Id: string,
    dto: UpdateTournamentDto,
  ): Promise<Tournament> {
    const actor = await this.findActorForTournament(id, auth0Id);
    if (![PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Only owner or admins can update tournaments',
      );
    }

    const tournament = await this.findOne(id, auth0Id);
    Object.assign(tournament, dto);
    return this.tournamentsRepository.save(tournament);
  }

  async remove(id: string, auth0Id: string): Promise<void> {
    const actor = await this.findActorForTournament(id, auth0Id);
    assertTournamentOwner(actor);
    await this.tournamentsRepository.delete({ id });
  }

  async findActorForTournament(
    tournamentId: string,
    auth0Id: string,
  ): Promise<Player> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoinAndSelect('player.user', 'user')
      .where('player.tournamentId = :tournamentId', { tournamentId })
      .andWhere('user.auth0Id = :auth0Id', { auth0Id })
      .getOne();

    if (!player) {
      throw new ForbiddenException('You are not a member of this tournament');
    }

    return player;
  }

  async regenerateInviteCode(tournamentId: string, auth0Id: string) {
    const actor = await this.findActorForTournament(tournamentId, auth0Id);
    if (![PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Only owner or admins can manage invite codes',
      );
    }

    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const code = this.generateToken();
    const invite = await this.invitesRepository.findOne({
      where: { tournamentId },
    });

    const upserted = this.invitesRepository.create({
      id: invite?.id,
      tournamentId,
      codeHash: this.hashToken(code),
      expiresAt: this.expirationIn7Days(),
    });

    const saved = await this.invitesRepository.save(upserted);
    return { code, expiresAt: saved.expiresAt };
  }

  async getInviteMeta(tournamentId: string, auth0Id: string) {
    const actor = await this.findActorForTournament(tournamentId, auth0Id);
    if (![PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Only owner or admins can view invite metadata',
      );
    }

    const invite = await this.invitesRepository.findOne({
      where: { tournamentId },
    });
    return {
      expiresAt: invite?.expiresAt ?? null,
    };
  }

  async joinByTournamentCode(auth0Id: string, dto: JoinTournamentDto) {
    const user = await this.getUserFromAuth0(auth0Id);
    const tokenHash = this.hashToken(dto.code);

    const invite = await this.invitesRepository.findOne({
      where: { codeHash: tokenHash },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired tournament code');
    }

    const existingPlayer = await this.playersRepository.findOne({
      where: { tournamentId: invite.tournamentId, userId: user.id },
    });

    if (existingPlayer) {
      throw new BadRequestException(
        'You are already a member of this tournament',
      );
    }

    const existingPending = await this.joinRequestsRepository.findOne({
      where: {
        tournamentId: invite.tournamentId,
        userId: user.id,
        status: JoinRequestStatus.PENDING,
      },
    });

    if (!existingPending) {
      await this.joinRequestsRepository.save(
        this.joinRequestsRepository.create({
          tournamentId: invite.tournamentId,
          userId: user.id,
          status: JoinRequestStatus.PENDING,
        }),
      );
    }

    return {
      tournamentId: invite.tournamentId,
      status: 'PENDING',
    };
  }

  async getJoinRequests(tournamentId: string, auth0Id: string) {
    const actor = await this.findActorForTournament(tournamentId, auth0Id);
    if (![PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Only owner or admins can view join requests',
      );
    }

    return this.joinRequestsRepository.find({
      where: { tournamentId, status: JoinRequestStatus.PENDING },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async linkJoinRequest(
    tournamentId: string,
    requestId: string,
    auth0Id: string,
    dto: LinkJoinRequestDto,
  ) {
    const actor = await this.findActorForTournament(tournamentId, auth0Id);
    if (![PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Only owner or admins can link join requests',
      );
    }

    const request = await this.joinRequestsRepository.findOne({
      where: { id: requestId, tournamentId, status: JoinRequestStatus.PENDING },
      relations: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    const player = await this.playersRepository.findOne({
      where: { id: dto.playerId, tournamentId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.userId) {
      throw new BadRequestException('Selected player is already linked');
    }

    const existing = await this.playersRepository.findOne({
      where: { tournamentId, userId: request.userId },
    });

    if (existing) {
      throw new BadRequestException(
        'User already has a player in this tournament',
      );
    }

    player.userId = request.userId;
    player.claimCodeHash = null;
    player.claimCodeExpiresAt = null;
    await this.playersRepository.save(player);

    request.status = JoinRequestStatus.APPROVED;
    await this.joinRequestsRepository.save(request);

    return { success: true };
  }

  async getSummary(tournamentId: string, auth0Id: string) {
    await this.findActorForTournament(tournamentId, auth0Id);

    const players = await this.playersRepository.find({
      where: { tournamentId },
    });
    const matches = await this.matchesRepository.find({
      where: { tournamentId },
    });
    const finishedMatches = matches.filter(
      (match) => match.status === MatchStatus.FINISHED,
    );
    const matchIds = finishedMatches.map((match) => match.id);

    if (players.length === 0) {
      return {
        tournamentId,
        standings: [],
        leaderPlayerId: null,
        topScorerPlayerId: null,
      };
    }

    const statsByPlayerId = new Map<
      string,
      {
        playerId: string;
        displayName: string;
        mvp: number;
        points: number;
        goals: number;
        win: number;
        draw: number;
        loose: number;
        matchesPlayed: number;
      }
    >();

    players.forEach((player) => {
      statsByPlayerId.set(player.id, {
        playerId: player.id,
        displayName: player.nickname ?? player.name,
        mvp: 0,
        points: 0,
        goals: 0,
        win: 0,
        draw: 0,
        loose: 0,
        matchesPlayed: 0,
      });
    });

    const mvpByPlayerId = finishedMatches.reduce<Map<string, number>>(
      (accumulator, match) => {
        if (!match.mvpPlayerId) {
          return accumulator;
        }

        accumulator.set(
          match.mvpPlayerId,
          (accumulator.get(match.mvpPlayerId) ?? 0) + 1,
        );
        return accumulator;
      },
      new Map<string, number>(),
    );

    mvpByPlayerId.forEach((mvpCount, playerId) => {
      const stats = statsByPlayerId.get(playerId);
      if (stats) {
        stats.mvp = mvpCount;
      }
    });

    if (matchIds.length > 0) {
      const rows = await this.playerTeamsRepository
        .createQueryBuilder('pt')
        .innerJoinAndSelect('pt.team', 'team')
        .innerJoin('team.match', 'match')
        .where('match.tournamentId = :tournamentId', { tournamentId })
        .andWhere('match.status = :status', { status: MatchStatus.FINISHED })
        .getMany();

      const teamGoalsByTeamId = new Map<string, number>();
      const teamIdsByMatchId = new Map<string, Set<string>>();

      rows.forEach((row) => {
        teamGoalsByTeamId.set(
          row.teamId,
          (teamGoalsByTeamId.get(row.teamId) ?? 0) + row.goals,
        );

        if (!teamIdsByMatchId.has(row.team.matchId)) {
          teamIdsByMatchId.set(row.team.matchId, new Set());
        }
        teamIdsByMatchId.get(row.team.matchId)?.add(row.teamId);
      });

      const teamResultByTeamId = new Map<string, TeamResult>();

      teamIdsByMatchId.forEach((teamIdsSet) => {
        const teamIds = Array.from(teamIdsSet);
        if (teamIds.length < 2) {
          teamIds.forEach((teamId) => {
            teamResultByTeamId.set(teamId, TeamResult.PENDING);
          });
          return;
        }

        const [teamAId, teamBId] = teamIds;
        const teamAGoals = teamGoalsByTeamId.get(teamAId) ?? 0;
        const teamBGoals = teamGoalsByTeamId.get(teamBId) ?? 0;

        if (teamAGoals > teamBGoals) {
          teamResultByTeamId.set(teamAId, TeamResult.WINNER);
          teamResultByTeamId.set(teamBId, TeamResult.LOSER);
          return;
        }

        if (teamBGoals > teamAGoals) {
          teamResultByTeamId.set(teamAId, TeamResult.LOSER);
          teamResultByTeamId.set(teamBId, TeamResult.WINNER);
          return;
        }

        teamResultByTeamId.set(teamAId, TeamResult.DRAW);
        teamResultByTeamId.set(teamBId, TeamResult.DRAW);
      });

      const matchesCountByPlayer = new Map<string, Set<string>>();

      rows.forEach((row) => {
        const stats = statsByPlayerId.get(row.playerId);
        if (!stats) {
          return;
        }

        stats.goals += row.goals;

        const team = row.team;
        const teamResult = teamResultByTeamId.get(team.id) ?? team.result;

        if (teamResult === TeamResult.WINNER) {
          stats.points += 3;
          stats.win += 1;
        }
        if (teamResult === TeamResult.DRAW) {
          stats.points += 1;
          stats.draw += 1;
        }
        if (teamResult === TeamResult.LOSER) {
          stats.loose += 1;
        }

        if (!matchesCountByPlayer.has(row.playerId)) {
          matchesCountByPlayer.set(row.playerId, new Set());
        }
        matchesCountByPlayer.get(row.playerId)?.add(team.matchId);
      });

      matchesCountByPlayer.forEach((matchSet, playerId) => {
        const stats = statsByPlayerId.get(playerId);
        if (stats) {
          stats.matchesPlayed = matchSet.size;
        }
      });
    }

    const ordered = Array.from(statsByPlayerId.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }
      return b.matchesPlayed - a.matchesPlayed;
    });

    const standings = ordered.map((row, index) => ({
      ...row,
      position: index + 1,
    }));
    const leader = standings[0] ?? null;

    const topScorer = standings.reduce<(typeof standings)[number] | null>(
      (best, current) => {
        if (!best) {
          return current;
        }
        if (current.goals > best.goals) {
          return current;
        }
        if (current.goals === best.goals && current.position < best.position) {
          return current;
        }
        return best;
      },
      null,
    );

    return {
      tournamentId,
      standings,
      leaderPlayerId: leader?.playerId ?? null,
      topScorerPlayerId: topScorer?.playerId ?? null,
    };
  }

  private async getUserFromAuth0(auth0Id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { auth0Id } });
    if (!user) {
      throw new NotFoundException(
        'User not found. Call POST /users/me/sync first.',
      );
    }
    return user;
  }

  private generateToken(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token.trim().toUpperCase())
      .digest('hex');
  }

  private expirationIn7Days(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    return expiration;
  }
}
