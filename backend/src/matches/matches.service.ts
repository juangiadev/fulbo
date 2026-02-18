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
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(PlayerTeam)
    private readonly playerTeamsRepository: Repository<PlayerTeam>,
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

    await this.matchesRepository.manager.transaction(async (manager) => {
      const teamsRepo = manager.getRepository(Team);
      const playerTeamsRepo = manager.getRepository(PlayerTeam);

      const existingTeams = await teamsRepo.find({
        where: { matchId },
        relations: { playerTeams: true },
      });

      const findTeamByName = (name: string): Team | null =>
        existingTeams.find((team) => team.name === name) ?? null;

      let teamA = findTeamByName('Team A');
      let teamB = findTeamByName('Team B');

      if (!teamA) {
        teamA = await teamsRepo.save(
          teamsRepo.create({
            matchId,
            name: 'Team A',
            color: dto.teamAColor ?? null,
            result: TeamResult.PENDING,
          }),
        );
      }

      if (!teamB) {
        teamB = await teamsRepo.save(
          teamsRepo.create({
            matchId,
            name: 'Team B',
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
      teamA.name = 'Team A';
      teamB.name = 'Team B';

      await Promise.all([teamsRepo.save(teamA), teamsRepo.save(teamB)]);

      const syncTeam = async (
        team: Team,
        entries: Array<{ playerId: string; goals: number }>,
      ) => {
        const existing = await playerTeamsRepo.find({
          where: { teamId: team.id },
        });
        const existingByPlayerId = new Map(
          existing.map((item) => [item.playerId, item]),
        );
        const desiredByPlayerId = new Map(
          entries.map((entry) => [entry.playerId, entry]),
        );

        const creates = entries
          .filter((entry) => !existingByPlayerId.has(entry.playerId))
          .map((entry) =>
            playerTeamsRepo.save(
              playerTeamsRepo.create({
                teamId: team.id,
                playerId: entry.playerId,
                goals: entry.goals,
                injury: null,
              }),
            ),
          );

        const updates = entries
          .filter((entry) => {
            const found = existingByPlayerId.get(entry.playerId);
            return Boolean(found) && found?.goals !== entry.goals;
          })
          .map((entry) => {
            const found = existingByPlayerId.get(entry.playerId) as PlayerTeam;
            found.goals = entry.goals;
            return playerTeamsRepo.save(found);
          });

        const deletes = existing
          .filter((entry) => !desiredByPlayerId.has(entry.playerId))
          .map((entry) => playerTeamsRepo.delete({ id: entry.id }));

        await Promise.all([...creates, ...updates, ...deletes]);
      };

      await Promise.all([
        syncTeam(teamA, dto.teamA),
        syncTeam(teamB, dto.teamB),
      ]);
    });

    return { success: true };
  }
}
