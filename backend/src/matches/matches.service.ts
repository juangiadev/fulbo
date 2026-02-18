import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchStatus } from '../../../shared/src/enums';
import {
  assertTournamentEditor,
  assertTournamentOwner,
} from '../common/player-role.utils';
import { Match } from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
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
}
