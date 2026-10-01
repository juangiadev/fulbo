import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  MatchStatus,
  TeamResult,
  TournamentFormat,
  TournamentType,
} from '../../../shared/src/enums';
import type {
  MatchMvpVotingContract,
  MatchPlayersRecentFormContract,
  PlayerRecentMatchResultContract,
} from '../../../shared/src/contracts';
import {
  assertTournamentEditor,
  assertTournamentOwner,
} from '../common/player-role.utils';
import {
  Match,
  MatchMvpVote,
  Player,
  PlayerTeam,
  Team,
  Tournament,
  TournamentTeam,
} from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchdayFixtureDto } from './dto/create-matchday-fixture.dto';
import { UpsertMatchLineupDto } from './dto/upsert-match-lineup.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { VoteMatchMvpDto } from './dto/vote-match-mvp.dto';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    @InjectRepository(PlayerTeam)
    private readonly playerTeamsRepository: Repository<PlayerTeam>,
    @InjectRepository(MatchMvpVote)
    private readonly matchMvpVotesRepository: Repository<MatchMvpVote>,
    private readonly tournamentsService: TournamentsService,
  ) {}

  findByTournament(tournamentId: string): Promise<Match[]> {
    return this.matchesRepository.find({
      where: { tournamentId },
      relations: { teams: true },
      order: { matchday: 'ASC', kickoffAt: 'ASC' },
    });
  }

  async create(
    tournamentId: string,
    auth0Id: string,
    dto: CreateMatchDto,
  ): Promise<Match> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);
    const matchday = dto.matchday ?? (await this.getNextMatchday(tournamentId));
    const match = this.matchesRepository.create({
      ...dto,
      matchday,
      kickoffAt: new Date(dto.kickoffAt),
      status: MatchStatus.PENDING,
      tournamentId,
    });
    return this.matchesRepository.save(match);
  }

  async generateMatchdayFixture(
    tournamentId: string,
    auth0Id: string,
    dto: CreateMatchdayFixtureDto,
  ): Promise<Match[]> {
    const actor = await this.tournamentsService.findActorForTournament(
      tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    const tournament = await this.matchesRepository.manager
      .getRepository(Tournament)
      .findOne({ where: { id: tournamentId } });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (
      tournament.type !== TournamentType.TEAMS ||
      tournament.format !== TournamentFormat.LIGA
    ) {
      throw new BadRequestException(
        'Matchday fixture generation is only available for team league tournaments',
      );
    }

    const firstKickoffAt = new Date(dto.firstKickoffAt);
    if (Number.isNaN(firstKickoffAt.getTime())) {
      throw new BadRequestException('First kickoff must be a valid date');
    }

    const existingMatch = await this.matchesRepository.findOne({
      where: { tournamentId, matchday: dto.matchday },
    });
    if (existingMatch) {
      throw new BadRequestException('Matchday already has matches');
    }

    const tournamentTeams = await this.matchesRepository.manager
      .getRepository(TournamentTeam)
      .find({
        where: { tournamentId },
        order: { createdAt: 'ASC', name: 'ASC' },
      });
    if (tournamentTeams.length < 2) {
      throw new BadRequestException(
        'At least two tournament teams are required',
      );
    }

    const pairings = this.getRoundRobinPairings(tournamentTeams, dto.matchday);

    return this.matchesRepository.manager.transaction(async (manager) => {
      const matchesRepo = manager.getRepository(Match);
      const teamsRepo = manager.getRepository(Team);
      const createdMatches: Match[] = [];

      for (const [index, [homeTeam, awayTeam]] of pairings.entries()) {
        const match = await matchesRepo.save(
          matchesRepo.create({
            tournamentId,
            matchday: dto.matchday,
            placeName: dto.placeName,
            placeUrl: dto.placeUrl ?? null,
            kickoffAt: new Date(
              firstKickoffAt.getTime() + dto.intervalMinutes * 60_000 * index,
            ),
            stage: dto.stage,
            status: MatchStatus.PENDING,
          }),
        );

        match.teams = await teamsRepo.save([
          teamsRepo.create({
            matchId: match.id,
            tournamentTeamId: homeTeam.id,
            name: homeTeam.name,
            imageUrl: homeTeam.imageUrl,
            goals: 0,
            result: TeamResult.PENDING,
          }),
          teamsRepo.create({
            matchId: match.id,
            tournamentTeamId: awayTeam.id,
            name: awayTeam.name,
            imageUrl: awayTeam.imageUrl,
            goals: 0,
            result: TeamResult.PENDING,
          }),
        ]);

        createdMatches.push(match);
      }

      return createdMatches;
    });
  }

  private getRoundRobinPairings(
    tournamentTeams: TournamentTeam[],
    matchday: number,
  ): Array<[TournamentTeam, TournamentTeam]> {
    const bye = null;
    const rotation: Array<TournamentTeam | null> =
      tournamentTeams.length % 2 === 0
        ? [...tournamentTeams]
        : [...tournamentTeams, bye];
    const totalRounds = rotation.length - 1;
    const roundIndex = (matchday - 1) % totalRounds;

    for (let round = 0; round < roundIndex; round += 1) {
      const fixed = rotation[0];
      const rotated = [
        fixed,
        rotation[rotation.length - 1],
        ...rotation.slice(1, rotation.length - 1),
      ];
      rotation.splice(0, rotation.length, ...rotated);
    }

    const pairings: Array<[TournamentTeam, TournamentTeam]> = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const homeTeam = rotation[index];
      const awayTeam = rotation[rotation.length - 1 - index];
      if (homeTeam && awayTeam) {
        pairings.push([homeTeam, awayTeam]);
      }
    }

    return pairings;
  }

  async update(
    matchId: string,
    auth0Id: string,
    dto: UpdateMatchDto,
  ): Promise<Match> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    Object.assign(match, {
      ...dto,
      kickoffAt: dto.kickoffAt ? new Date(dto.kickoffAt) : match.kickoffAt,
    });
    return this.matchesRepository.save(match);
  }

  async remove(matchId: string, auth0Id: string): Promise<void> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      match.tournamentId,
      auth0Id,
    );
    assertTournamentOwner(actor);
    await this.matchesRepository.delete({ id: matchId });
  }

  async upsertLineup(
    matchId: string,
    auth0Id: string,
    dto: UpsertMatchLineupDto,
  ): Promise<{ success: true }> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
      relations: { tournament: true },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    if (match.tournament.type === TournamentType.TEAMS) {
      return this.upsertTeamTournamentLineup(match, dto);
    }

    const allPlayerIds = [
      ...dto.teamA.map((entry) => entry.playerId),
      ...dto.teamB.map((entry) => entry.playerId),
    ];
    const uniquePlayerIds = new Set(allPlayerIds);
    if (uniquePlayerIds.size !== allPlayerIds.length) {
      throw new BadRequestException('Player can only be in one team per match');
    }

    if (uniquePlayerIds.size > 0) {
      const players = await this.playersRepository.find({
        where: Array.from(uniquePlayerIds).map((id) => ({ id })),
      });

      if (players.length !== uniquePlayerIds.size) {
        throw new BadRequestException('Some players do not exist');
      }

      const invalidPlayer = players.find(
        (player) => player.tournamentId !== match.tournamentId,
      );
      if (invalidPlayer) {
        throw new BadRequestException(
          'Player must belong to the same tournament as the match',
        );
      }
    }

    const normalizedTeamAName = (dto.teamAName ?? 'Team A').trim() || 'Team A';
    const normalizedTeamBName = (dto.teamBName ?? 'Team B').trim() || 'Team B';

    if (
      normalizedTeamAName.toLowerCase() === normalizedTeamBName.toLowerCase()
    ) {
      throw new BadRequestException('Team names must be different');
    }

    await this.matchesRepository.manager.transaction(async (manager) => {
      const teamsRepo = manager.getRepository(Team);
      const playerTeamsRepo = manager.getRepository(PlayerTeam);

      const existingTeams = await teamsRepo.find({
        where: { matchId },
        order: { createdAt: 'ASC' },
      });

      const findTeamByName = (name: string): Team | null =>
        existingTeams.find((team) => team.name === name) ?? null;

      let teamA = findTeamByName('Team A');
      let teamB = findTeamByName('Team B');

      if (!teamA) {
        teamA = existingTeams[0] ?? null;
      }

      if (!teamB) {
        teamB = existingTeams.find((team) => team.id !== teamA?.id) ?? null;
      }

      if (!teamA) {
        teamA = await teamsRepo.save(
          teamsRepo.create({
            matchId,
            name: normalizedTeamAName,
            color: dto.teamAColor ?? null,
            result: TeamResult.PENDING,
          }),
        );
      }

      if (!teamB) {
        teamB = await teamsRepo.save(
          teamsRepo.create({
            matchId,
            name: normalizedTeamBName,
            color: dto.teamBColor ?? null,
            result: TeamResult.PENDING,
          }),
        );
      }

      const teamATotalGoals = dto.teamA.reduce(
        (sum, item) => sum + item.goals,
        0,
      );
      const teamBTotalGoals = dto.teamB.reduce(
        (sum, item) => sum + item.goals,
        0,
      );

      let teamAResult = TeamResult.PENDING;
      let teamBResult = TeamResult.PENDING;
      if (dto.teamA.length > 0 || dto.teamB.length > 0) {
        if (teamATotalGoals > teamBTotalGoals) {
          teamAResult = TeamResult.WINNER;
          teamBResult = TeamResult.LOSER;
        } else if (teamBTotalGoals > teamATotalGoals) {
          teamAResult = TeamResult.LOSER;
          teamBResult = TeamResult.WINNER;
        } else {
          teamAResult = TeamResult.DRAW;
          teamBResult = TeamResult.DRAW;
        }
      }

      teamA.color = dto.teamAColor ?? teamA.color;
      teamB.color = dto.teamBColor ?? teamB.color;
      teamA.result = teamAResult;
      teamB.result = teamBResult;
      teamA.name = normalizedTeamAName;
      teamB.name = normalizedTeamBName;

      await Promise.all([teamsRepo.save(teamA), teamsRepo.save(teamB)]);

      const syncTeam = async (
        team: Team,
        entries: Array<{ playerId: string; goals: number }>,
      ) => {
        const desiredRows = entries.map((entry) => ({
          teamId: team.id,
          playerId: entry.playerId,
          goals: entry.goals,
          injury: null,
        }));

        if (desiredRows.length > 0) {
          await playerTeamsRepo
            .createQueryBuilder()
            .insert()
            .into(PlayerTeam)
            .values(desiredRows)
            .onConflict(
              '("playerId", "teamId") DO UPDATE SET "goals" = EXCLUDED."goals", "updatedAt" = now()',
            )
            .execute();

          await playerTeamsRepo
            .createQueryBuilder()
            .delete()
            .from(PlayerTeam)
            .where('"teamId" = :teamId', { teamId: team.id })
            .andWhere('"playerId" NOT IN (:...playerIds)', {
              playerIds: desiredRows.map((row) => row.playerId),
            })
            .execute();
          return;
        }

        await playerTeamsRepo
          .createQueryBuilder()
          .delete()
          .from(PlayerTeam)
          .where('"teamId" = :teamId', { teamId: team.id })
          .execute();
      };

      await Promise.all([
        syncTeam(teamA, dto.teamA),
        syncTeam(teamB, dto.teamB),
      ]);
    });

    return { success: true };
  }

  private async upsertTeamTournamentLineup(
    match: Match,
    dto: UpsertMatchLineupDto,
  ): Promise<{ success: true }> {
    const teamATournamentTeamId = dto.teamATournamentTeamId;
    const teamBTournamentTeamId = dto.teamBTournamentTeamId;
    const teamAGoalsInput = dto.teamAGoals;
    const teamBGoalsInput = dto.teamBGoals;

    if (!teamATournamentTeamId || !teamBTournamentTeamId) {
      throw new BadRequestException('Both tournament teams are required');
    }

    if (teamATournamentTeamId === teamBTournamentTeamId) {
      throw new BadRequestException('Tournament teams must be different');
    }

    if (
      typeof teamAGoalsInput !== 'number' ||
      typeof teamBGoalsInput !== 'number' ||
      !Number.isInteger(teamAGoalsInput) ||
      !Number.isInteger(teamBGoalsInput) ||
      teamAGoalsInput < 0 ||
      teamBGoalsInput < 0
    ) {
      throw new BadRequestException('Team goals must be non-negative integers');
    }

    const teamAGoals = teamAGoalsInput;
    const teamBGoals = teamBGoalsInput;

    const tournamentTeams = await this.matchesRepository.manager
      .getRepository(TournamentTeam)
      .find({
        where: [{ id: teamATournamentTeamId }, { id: teamBTournamentTeamId }],
      });

    const teamA = tournamentTeams.find(
      (team) => team.id === teamATournamentTeamId,
    );
    const teamB = tournamentTeams.find(
      (team) => team.id === teamBTournamentTeamId,
    );

    if (!teamA || !teamB) {
      throw new BadRequestException('Some tournament teams do not exist');
    }

    if (
      teamA.tournamentId !== match.tournamentId ||
      teamB.tournamentId !== match.tournamentId
    ) {
      throw new BadRequestException(
        'Tournament teams must belong to the same tournament as the match',
      );
    }

    let teamAResult = TeamResult.DRAW;
    let teamBResult = TeamResult.DRAW;
    if (teamAGoals > teamBGoals) {
      teamAResult = TeamResult.WINNER;
      teamBResult = TeamResult.LOSER;
    } else if (teamBGoals > teamAGoals) {
      teamAResult = TeamResult.LOSER;
      teamBResult = TeamResult.WINNER;
    }

    await this.matchesRepository.manager.transaction(async (manager) => {
      const teamsRepo = manager.getRepository(Team);
      const playerTeamsRepo = manager.getRepository(PlayerTeam);
      const existingTeams = await teamsRepo.find({
        where: { matchId: match.id },
        order: { createdAt: 'ASC' },
      });

      const matchTeamA =
        existingTeams.find(
          (existingTeam) => existingTeam.tournamentTeamId === teamA.id,
        ) ??
        existingTeams[0] ??
        teamsRepo.create({
          matchId: match.id,
          result: TeamResult.PENDING,
        });
      const matchTeamB =
        existingTeams.find(
          (existingTeam) => existingTeam.tournamentTeamId === teamB.id,
        ) ??
        existingTeams.find(
          (existingTeam) => existingTeam.id !== matchTeamA.id,
        ) ??
        teamsRepo.create({
          matchId: match.id,
          result: TeamResult.PENDING,
        });

      matchTeamA.tournamentTeamId = teamA.id;
      matchTeamA.name = teamA.name;
      matchTeamA.imageUrl = teamA.imageUrl;
      matchTeamA.goals = teamAGoals;
      matchTeamA.result = teamAResult;
      matchTeamA.color = matchTeamA.color ?? null;

      matchTeamB.tournamentTeamId = teamB.id;
      matchTeamB.name = teamB.name;
      matchTeamB.imageUrl = teamB.imageUrl;
      matchTeamB.goals = teamBGoals;
      matchTeamB.result = teamBResult;
      matchTeamB.color = matchTeamB.color ?? null;

      const savedTeams = await teamsRepo.save([matchTeamA, matchTeamB]);
      const savedTeamIds = savedTeams.map((team) => team.id);

      await playerTeamsRepo
        .createQueryBuilder()
        .delete()
        .from(PlayerTeam)
        .where('"teamId" IN (:...teamIds)', { teamIds: savedTeamIds })
        .execute();

      const staleTeams = existingTeams.filter(
        (team) => !savedTeamIds.includes(team.id),
      );
      if (staleTeams.length > 0) {
        await teamsRepo.delete(staleTeams.map((team) => team.id));
      }
    });

    return { success: true };
  }

  async getMvpVoting(
    matchId: string,
    auth0Id: string,
  ): Promise<MatchMvpVotingContract> {
    const { match, actorPlayerId, participantIds } =
      await this.resolveMvpVotingContext(matchId, auth0Id);
    return this.buildMvpVotingResponse(match, actorPlayerId, participantIds);
  }

  async voteMvp(
    matchId: string,
    auth0Id: string,
    dto: VoteMatchMvpDto,
  ): Promise<MatchMvpVotingContract> {
    const { actorPlayerId, participantIds } =
      await this.resolveMvpVotingContext(matchId, auth0Id);

    if (dto.votedPlayerId && !participantIds.includes(dto.votedPlayerId)) {
      throw new BadRequestException('MVP vote must target a participant');
    }

    await this.matchesRepository.manager.transaction(async (manager) => {
      const votesRepo = manager.getRepository(MatchMvpVote);

      if (!dto.votedPlayerId) {
        await votesRepo.delete({ matchId, voterPlayerId: actorPlayerId });
      } else {
        await votesRepo
          .createQueryBuilder()
          .insert()
          .into(MatchMvpVote)
          .values({
            matchId,
            voterPlayerId: actorPlayerId,
            votedPlayerId: dto.votedPlayerId,
          })
          .onConflict(
            '("matchId", "voterPlayerId") DO UPDATE SET "votedPlayerId" = EXCLUDED."votedPlayerId", "updatedAt" = now()',
          )
          .execute();
      }

      await this.recomputeMatchMvp(matchId, manager);
    });

    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.buildMvpVotingResponse(match, actorPlayerId, participantIds);
  }

  async getPlayersRecentForm(
    matchId: string,
    auth0Id: string,
  ): Promise<MatchPlayersRecentFormContract> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    await this.tournamentsService.findActorForTournament(
      match.tournamentId,
      auth0Id,
    );

    const participantIds = await this.getParticipantIds(matchId);
    const byPlayerId = participantIds.reduce<
      Record<string, PlayerRecentMatchResultContract[]>
    >((accumulator, playerId) => {
      accumulator[playerId] = [];
      return accumulator;
    }, {});

    if (participantIds.length === 0) {
      return {
        matchId,
        byPlayerId,
      };
    }

    const previousAppearances = await this.playerTeamsRepository
      .createQueryBuilder('playerTeam')
      .innerJoinAndSelect('playerTeam.team', 'team')
      .innerJoinAndSelect('team.match', 'match')
      .where('playerTeam.playerId IN (:...playerIds)', {
        playerIds: participantIds,
      })
      .andWhere('match.tournamentId = :tournamentId', {
        tournamentId: match.tournamentId,
      })
      .andWhere('match.status = :status', { status: MatchStatus.FINISHED })
      .andWhere('match.id != :matchId', { matchId })
      .andWhere(
        '(match.kickoffAt < :kickoffAt OR (match.kickoffAt = :kickoffAt AND match.createdAt < :createdAt))',
        {
          kickoffAt: match.kickoffAt.toISOString(),
          createdAt: match.createdAt.toISOString(),
        },
      )
      .orderBy('playerTeam.playerId', 'ASC')
      .addOrderBy('match.kickoffAt', 'DESC')
      .addOrderBy('match.createdAt', 'DESC')
      .getMany();

    previousAppearances.forEach((appearance) => {
      const form = byPlayerId[appearance.playerId];
      if (!form || form.length >= 5) {
        return;
      }

      form.push({
        matchId: appearance.team.match.id,
        matchday: appearance.team.match.matchday,
        kickoffAt: appearance.team.match.kickoffAt.toISOString(),
        result: appearance.team.result,
      });
    });

    return {
      matchId,
      byPlayerId,
    };
  }

  private async resolveMvpVotingContext(matchId: string, auth0Id: string) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== MatchStatus.FINISHED) {
      throw new BadRequestException(
        'MVP voting is only enabled for finished matches',
      );
    }

    const actor = await this.tournamentsService.findActorForTournament(
      match.tournamentId,
      auth0Id,
    );

    const participantIds = await this.getParticipantIds(matchId);

    if (!participantIds.includes(actor.id)) {
      throw new ForbiddenException(
        'Only players who participated can vote MVP',
      );
    }

    return {
      match,
      actorPlayerId: actor.id,
      participantIds,
    };
  }

  private async getNextMatchday(tournamentId: string): Promise<number> {
    const raw = await this.matchesRepository
      .createQueryBuilder('match')
      .select('COALESCE(MAX(match.matchday), 0) + 1', 'nextMatchday')
      .where('match.tournamentId = :tournamentId', { tournamentId })
      .getRawOne<{ nextMatchday: string | number }>();

    return Number(raw?.nextMatchday ?? 1);
  }

  private async getParticipantIds(matchId: string): Promise<string[]> {
    const rows = await this.playerTeamsRepository
      .createQueryBuilder('playerTeam')
      .select('DISTINCT playerTeam.playerId', 'playerId')
      .innerJoin('playerTeam.team', 'team')
      .where('team.matchId = :matchId', { matchId })
      .getRawMany<{ playerId: string }>();

    return rows.map((row) => row.playerId);
  }

  private async recomputeMatchMvp(
    matchId: string,
    manager: EntityManager,
  ): Promise<void> {
    const votes = await manager
      .getRepository(MatchMvpVote)
      .find({ where: { matchId } });

    const counts = votes.reduce<Map<string, number>>((accumulator, vote) => {
      accumulator.set(
        vote.votedPlayerId,
        (accumulator.get(vote.votedPlayerId) ?? 0) + 1,
      );
      return accumulator;
    }, new Map<string, number>());

    const ordered = Array.from(counts.entries())
      .map(([playerId, votesCount]) => ({ playerId, votesCount }))
      .sort((a, b) => b.votesCount - a.votesCount);

    const hasTie =
      ordered.length > 1 && ordered[0].votesCount === ordered[1].votesCount;
    const mvpPlayerId =
      ordered.length > 0 && !hasTie ? ordered[0].playerId : null;

    await manager.getRepository(Match).update({ id: matchId }, { mvpPlayerId });
  }

  private async buildMvpVotingResponse(
    match: Match,
    actorPlayerId: string,
    participantIds: string[],
  ): Promise<MatchMvpVotingContract> {
    const votes = await this.matchMvpVotesRepository.find({
      where: { matchId: match.id },
      order: { updatedAt: 'ASC' },
    });

    const votesByPlayerId = votes.reduce<Record<string, number>>(
      (accumulator, vote) => {
        accumulator[vote.votedPlayerId] =
          (accumulator[vote.votedPlayerId] ?? 0) + 1;
        return accumulator;
      },
      {},
    );

    const ordered = Object.entries(votesByPlayerId)
      .map(([playerId, votesCount]) => ({ playerId, votesCount }))
      .sort((a, b) => b.votesCount - a.votesCount);

    const hasTie =
      ordered.length > 1 && ordered[0].votesCount === ordered[1].votesCount;
    const computedMvpPlayerId =
      ordered.length > 0 && !hasTie ? ordered[0].playerId : null;
    const myVote =
      votes.find((vote) => vote.voterPlayerId === actorPlayerId) ?? null;

    return {
      matchId: match.id,
      candidatePlayerIds: participantIds,
      myVotePlayerId: myVote?.votedPlayerId ?? null,
      mvpPlayerId: computedMvpPlayerId,
      hasTie,
      votesByPlayerId,
      votes: votes.map((vote) => ({
        voterPlayerId: vote.voterPlayerId,
        votedPlayerId: vote.votedPlayerId,
        updatedAt: vote.updatedAt.toISOString(),
      })),
    };
  }
}
