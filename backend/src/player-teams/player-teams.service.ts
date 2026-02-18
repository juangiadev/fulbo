import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertTournamentEditor } from '../common/player-role.utils';
import { PlayerTeam, Player, Team } from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreatePlayerTeamDto } from './dto/create-player-team.dto';
import { UpdatePlayerTeamDto } from './dto/update-player-team.dto';

@Injectable()
export class PlayerTeamsService {
  constructor(
    @InjectRepository(PlayerTeam)
    private readonly playerTeamsRepository: Repository<PlayerTeam>,
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    private readonly tournamentsService: TournamentsService,
  ) {}

  findByTeam(teamId: string): Promise<PlayerTeam[]> {
    return this.playerTeamsRepository.find({
      where: { teamId },
      relations: { player: true },
    });
  }

  async create(
    teamId: string,
    auth0Id: string,
    dto: CreatePlayerTeamDto,
  ): Promise<PlayerTeam> {
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

    const player = await this.playersRepository.findOne({
      where: { id: dto.playerId },
    });
    if (!player || player.tournamentId !== team.match.tournamentId) {
      throw new BadRequestException(
        'Player must belong to the same tournament as the team',
      );
    }

    const alreadyInMatch = await this.playerTeamsRepository
      .createQueryBuilder('pt')
      .innerJoin('pt.team', 'team')
      .where('pt.playerId = :playerId', { playerId: dto.playerId })
      .andWhere('team.matchId = :matchId', { matchId: team.matchId })
      .getOne();

    if (alreadyInMatch) {
      throw new BadRequestException('Player can only be in one team per match');
    }

    return this.playerTeamsRepository.save(
      this.playerTeamsRepository.create({
        teamId,
        playerId: dto.playerId,
        goals: dto.goals,
        injury: dto.injury ?? null,
      }),
    );
  }

  async update(
    id: string,
    auth0Id: string,
    dto: UpdatePlayerTeamDto,
  ): Promise<PlayerTeam> {
    const playerTeam = await this.playerTeamsRepository.findOne({
      where: { id },
      relations: { team: { match: true } },
    });

    if (!playerTeam) {
      throw new NotFoundException('Player-Team record not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      playerTeam.team.match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);

    Object.assign(playerTeam, dto);
    return this.playerTeamsRepository.save(playerTeam);
  }

  async remove(id: string, auth0Id: string): Promise<void> {
    const playerTeam = await this.playerTeamsRepository.findOne({
      where: { id },
      relations: { team: { match: true } },
    });

    if (!playerTeam) {
      throw new NotFoundException('Player-Team record not found');
    }

    const actor = await this.tournamentsService.findActorForTournament(
      playerTeam.team.match.tournamentId,
      auth0Id,
    );
    assertTournamentEditor(actor);
    await this.playerTeamsRepository.delete({ id });
  }
}
