import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TournamentType } from '../../../shared/src/enums';
import { Repository } from 'typeorm';
import { assertTournamentEditor } from '../common/player-role.utils';
import { Tournament, TournamentTeam } from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
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
    const team = await this.tournamentTeamsRepository.findOne({
      where: { id: teamId },
      relations: { tournament: true },
    });
    if (!team) {
      throw new NotFoundException('Tournament team not found');
    }

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
    const team = await this.tournamentTeamsRepository.findOne({
      where: { id: teamId },
      relations: { tournament: true },
    });
    if (!team) {
      throw new NotFoundException('Tournament team not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      team.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);
    this.assertTeamsTournamentEntity(team.tournament);

    await this.tournamentTeamsRepository.delete({ id: teamId });
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
}
