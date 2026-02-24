import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchStatus, TeamResult } from '../../../shared/src/enums';
import {
  assertTournamentEditor,
  assertTournamentOwner,
} from '../common/player-role.utils';
import { Match, Player, PlayerTeam, Team } from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpsertMatchLineupDto } from './dto/upsert-match-lineup.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    private readonly tournamentsService: TournamentsService,
  ) {}

  findByTournament(tournamentId: string): Promise<Match[]> {
    return this.matchesRepository.find({
      where: { tournamentId },
      relations: { teams: true },
      order: { kickoffAt: 'ASC' },
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
    const match = this.matchesRepository.create({
      ...dto,
      kickoffAt: new Date(dto.kickoffAt),
      status: MatchStatus.PENDING,
      tournamentId,
    });
    return this.matchesRepository.save(match);
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
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

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
}
