import { BadRequestException } from '@nestjs/common';
import {
  MatchStatus,
  PlayerRole,
  TeamResult,
  TournamentFormat,
  TournamentType,
} from '../../../shared/src/enums';
import { Match, Team, Tournament, TournamentTeam } from '../database/entities';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  const matchesRepository = {
    findOne: jest.fn(),
    manager: { transaction: jest.fn(), getRepository: jest.fn() },
  };
  const playersRepository = { find: jest.fn() };
  const playerTeamsRepository = {};
  const matchMvpVotesRepository = {};
  const tournamentsService = { findActorForTournament: jest.fn() };

  const service = new MatchesService(
    matchesRepository as never,
    playersRepository as never,
    playerTeamsRepository as never,
    matchMvpVotesRepository as never,
    tournamentsService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    matchesRepository.findOne.mockResolvedValue({
      id: 'match-1',
      tournamentId: 'tournament-1',
      status: MatchStatus.PENDING,
      tournament: { id: 'tournament-1', type: TournamentType.TEAMS },
    });
    matchesRepository.manager.getRepository.mockReset();
    matchesRepository.manager.transaction.mockReset();
    tournamentsService.findActorForTournament.mockResolvedValue({
      id: 'actor-1',
      role: PlayerRole.ADMIN,
    });
  });

  it('rejects team tournament lineups that use the same team twice', async () => {
    await expect(
      service.upsertLineup('match-1', 'auth0|admin', {
        teamATournamentTeamId: '11111111-1111-4111-8111-111111111111',
        teamBTournamentTeamId: '11111111-1111-4111-8111-111111111111',
        teamAGoals: 1,
        teamBGoals: 0,
        teamA: [],
        teamB: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(matchesRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('blocks fixture generation when the matchday already has matches', async () => {
    const tournamentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tournament-1',
        type: TournamentType.TEAMS,
        format: TournamentFormat.LIGA,
      }),
    };

    matchesRepository.manager.getRepository.mockImplementation((entity) => {
      if (entity === Tournament) {
        return tournamentRepository;
      }
      throw new Error('Unexpected repository');
    });
    matchesRepository.findOne.mockResolvedValue({ id: 'existing-match' });

    await expect(
      service.generateMatchdayFixture('tournament-1', 'auth0|admin', {
        matchday: 2,
        firstKickoffAt: '2025-01-10T20:00:00.000Z',
        intervalMinutes: 60,
        placeName: 'Club Norte',
        stage: 'Cancha 1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(matchesRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('creates the requested 4-team matchday pairings with pending teams', async () => {
    const tournamentTeams = [
      { id: 'team-a', name: 'A', imageUrl: null },
      { id: 'team-b', name: 'B', imageUrl: 'b.png' },
      { id: 'team-c', name: 'C', imageUrl: null },
      { id: 'team-d', name: 'D', imageUrl: null },
    ];
    const tournamentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tournament-1',
        type: TournamentType.TEAMS,
        format: TournamentFormat.LIGA,
      }),
    };
    const tournamentTeamsRepository = {
      find: jest.fn().mockResolvedValue(tournamentTeams),
    };
    const savedTeams: Array<Record<string, unknown>> = [];
    let matchSaveCount = 0;
    const matchesRepo = {
      create: jest.fn((input: Record<string, unknown>) => input),
      save: jest.fn((input: Record<string, unknown>) => {
        matchSaveCount += 1;
        return Promise.resolve({
          ...input,
          id: `match-${matchSaveCount}`,
        });
      }),
    };
    const teamsRepo = {
      create: jest.fn((input: Record<string, unknown>) => input),
      save: jest.fn((input: Array<Record<string, unknown>>) => {
        savedTeams.push(...input);
        return Promise.resolve(
          input.map((team, index) => ({
            ...team,
            id: `match-team-${savedTeams.length + index}`,
          })),
        );
      }),
    };

    matchesRepository.findOne.mockResolvedValue(null);
    matchesRepository.manager.getRepository.mockImplementation((entity) => {
      if (entity === Tournament) {
        return tournamentRepository;
      }
      if (entity === TournamentTeam) {
        return tournamentTeamsRepository;
      }
      throw new Error('Unexpected repository');
    });
    matchesRepository.manager.transaction.mockImplementation(
      (
        callback: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => Promise<Match[]>,
      ) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === Match) {
              return matchesRepo;
            }
            if (entity === Team) {
              return teamsRepo;
            }
            throw new Error('Unexpected transaction repository');
          },
        }),
    );

    const result = await service.generateMatchdayFixture(
      'tournament-1',
      'auth0|admin',
      {
        matchday: 1,
        firstKickoffAt: '2025-01-10T20:00:00.000Z',
        intervalMinutes: 45,
        placeName: 'Club Norte',
        stage: 'Cancha 1',
      },
    );

    expect(result).toHaveLength(2);
    expect(matchesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        kickoffAt: new Date('2025-01-10T20:00:00.000Z'),
        matchday: 1,
        status: MatchStatus.PENDING,
      }),
    );
    expect(matchesRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kickoffAt: new Date('2025-01-10T20:45:00.000Z'),
      }),
    );
    expect(savedTeams).toEqual([
      expect.objectContaining({
        tournamentTeamId: 'team-a',
        name: 'A',
        goals: 0,
        result: TeamResult.PENDING,
      }),
      expect.objectContaining({
        tournamentTeamId: 'team-d',
        name: 'D',
        goals: 0,
        result: TeamResult.PENDING,
      }),
      expect.objectContaining({ tournamentTeamId: 'team-b', name: 'B' }),
      expect.objectContaining({ tournamentTeamId: 'team-c', name: 'C' }),
    ]);
  });
});
