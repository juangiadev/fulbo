import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertTournamentEditor } from '../common/player-role.utils';
import { Match, Team } from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    private readonly tournamentsService: TournamentsService,
  ) {}

  findByMatch(matchId: string): Promise<Team[]> {
    return this.teamsRepository.find({
      where: { matchId },
      relations: { playerTeams: true },
    });
  }

  async create(
    matchId: string,
    auth0Id: string,
    dto: CreateTeamDto,
  ): Promise<Team> {
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

    const currentTeams = await this.teamsRepository.count({
      where: { matchId },
    });
    if (currentTeams >= 2) {
      throw new BadRequestException('A match can have only 2 teams');
    }

    return this.teamsRepository.save(
      this.teamsRepository.create({ ...dto, matchId }),
    );
  }

  async update(
    teamId: string,
    auth0Id: string,
    dto: UpdateTeamDto,
  ): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
      relations: { match: true },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      team.match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    Object.assign(team, dto);
    return this.teamsRepository.save(team);
  }

  async remove(teamId: string, auth0Id: string): Promise<void> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
      relations: { match: true },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      team.match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);
    await this.teamsRepository.delete({ id: teamId });
  }
}
