import { BadRequestException } from '@nestjs/common';
import {
  MatchStatus,
  PlayerRole,
  TeamResult,
  TournamentFormat,
  TournamentType,
} from '../../../shared/src/enums';
import {
  Match,
  PlayerTeam,
  Team,
  Tournament,
  TournamentTeam,
} from '../database/entities';
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

  it('persists Liga team player goals from current rosters and derives aggregate results', async () => {
    matchesRepository.findOne.mockResolvedValue({
      id: 'match-1',
      tournamentId: 'tournament-1',
      status: MatchStatus.PENDING,
      tournament: {
        id: 'tournament-1',
        type: TournamentType.TEAMS,
        format: TournamentFormat.LIGA,
      },
    });

    const tournamentTeamsRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'home-team',
          tournamentId: 'tournament-1',
          name: 'Home',
          imageUrl: 'home.png',
        },
        {
          id: 'away-team',
          tournamentId: 'tournament-1',
          name: 'Away',
          imageUrl: null,
        },
      ]),
    };
    const rosterPlayers = [
      {
        id: 'home-player-1',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'home-team',
      },
      {
        id: 'home-player-2',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'home-team',
      },
      {
        id: 'away-player-1',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'away-team',
      },
    ];
    playersRepository.find.mockImplementation(({ where }) => {
      const requestedIds = new Set(
        (where as Array<{ id: string }>).map((condition) => condition.id),
      );
      return Promise.resolve(
        rosterPlayers.filter((player) => requestedIds.has(player.id)),
      );
    });

    const existingTeams = [
      { id: 'match-home', tournamentTeamId: 'home-team' },
      { id: 'match-away', tournamentTeamId: 'away-team' },
    ];
    const teamsRepo = {
      create: jest.fn((input: Record<string, unknown>) => input),
      find: jest.fn().mockResolvedValue(existingTeams),
      save: jest.fn((teams: Team[]) =>
        Promise.resolve(
          teams.map((team) => ({
            ...team,
            id:
              team.id ??
              (team.tournamentTeamId === 'home-team'
                ? 'match-home'
                : 'match-away'),
          })),
        ),
      ),
      delete: jest.fn(),
    };
    const playerTeamExecute = jest.fn().mockResolvedValue(undefined);
    const playerTeamsRepo = {
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        onConflict: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: playerTeamExecute,
      })),
    };

    matchesRepository.manager.getRepository.mockImplementation((entity) => {
      if (entity === TournamentTeam) {
        return tournamentTeamsRepository;
      }
      throw new Error('Unexpected repository');
    });
    matchesRepository.manager.transaction.mockImplementation(
      (
        callback: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => Promise<unknown>,
      ) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === Team) {
              return teamsRepo;
            }
            if (entity === PlayerTeam) {
              return playerTeamsRepo;
            }
            throw new Error('Unexpected transaction repository');
          },
        }),
    );

    await service.upsertLineup('match-1', 'auth0|admin', {
      teamATournamentTeamId: 'home-team',
      teamBTournamentTeamId: 'away-team',
      teamA: [
        { playerId: 'home-player-1', goals: 1 },
        { playerId: 'home-player-2', goals: 2 },
      ],
      teamB: [{ playerId: 'away-player-1', goals: 1 }],
    });

    expect(teamsRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'match-home',
        tournamentTeamId: 'home-team',
        goals: 3,
        result: TeamResult.WINNER,
      }),
      expect.objectContaining({
        id: 'match-away',
        tournamentTeamId: 'away-team',
        goals: 1,
        result: TeamResult.LOSER,
      }),
    ]);
    expect(playerTeamsRepo.createQueryBuilder).toHaveBeenCalledTimes(4);
    expect(playerTeamExecute).toHaveBeenCalledTimes(4);
  });

  it('rejects Liga team results with an empty participant side before saving', async () => {
    matchesRepository.findOne.mockResolvedValue({
      id: 'match-1',
      tournamentId: 'tournament-1',
      status: MatchStatus.PENDING,
      tournament: {
        id: 'tournament-1',
        type: TournamentType.TEAMS,
        format: TournamentFormat.LIGA,
      },
    });
    matchesRepository.manager.getRepository.mockImplementation((entity) => {
      if (entity === TournamentTeam) {
        return {
          find: jest.fn().mockResolvedValue([
            { id: 'home-team', tournamentId: 'tournament-1', name: 'Home' },
            { id: 'away-team', tournamentId: 'tournament-1', name: 'Away' },
          ]),
        };
      }
      throw new Error('Unexpected repository');
    });
    playersRepository.find.mockResolvedValue([
      {
        id: 'away-player-1',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'away-team',
      },
    ]);

    await expect(
      service.upsertLineup('match-1', 'auth0|admin', {
        teamATournamentTeamId: 'home-team',
        teamBTournamentTeamId: 'away-team',
        teamA: [],
        teamB: [{ playerId: 'away-player-1', goals: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(matchesRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects Liga team player goals for duplicate, invalid, or off-roster players before saving', async () => {
    matchesRepository.findOne.mockResolvedValue({
      id: 'match-1',
      tournamentId: 'tournament-1',
      status: MatchStatus.PENDING,
      tournament: {
        id: 'tournament-1',
        type: TournamentType.TEAMS,
        format: TournamentFormat.LIGA,
      },
    });
    matchesRepository.manager.getRepository.mockImplementation((entity) => {
      if (entity === TournamentTeam) {
        return {
          find: jest.fn().mockResolvedValue([
            { id: 'home-team', tournamentId: 'tournament-1', name: 'Home' },
            { id: 'away-team', tournamentId: 'tournament-1', name: 'Away' },
          ]),
        };
      }
      throw new Error('Unexpected repository');
    });
    const rosterPlayers = [
      {
        id: 'home-player-1',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'home-team',
      },
      {
        id: 'away-player-1',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'away-team',
      },
    ];
    playersRepository.find.mockImplementation(({ where }) => {
      const requestedIds = new Set(
        (where as Array<{ id: string }>).map((condition) => condition.id),
      );
      return Promise.resolve(
        rosterPlayers.filter((player) => requestedIds.has(player.id)),
      );
    });

    await expect(
      service.upsertLineup('match-1', 'auth0|admin', {
        teamATournamentTeamId: 'home-team',
        teamBTournamentTeamId: 'away-team',
        teamA: [{ playerId: 'home-player-1', goals: 1.5 }],
        teamB: [{ playerId: 'away-player-1', goals: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.upsertLineup('match-1', 'auth0|admin', {
        teamATournamentTeamId: 'home-team',
        teamBTournamentTeamId: 'away-team',
        teamA: [{ playerId: 'home-player-1', goals: 1 }],
        teamB: [{ playerId: 'home-player-1', goals: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.upsertLineup('match-1', 'auth0|admin', {
        teamATournamentTeamId: 'home-team',
        teamBTournamentTeamId: 'away-team',
        teamA: [{ playerId: 'away-player-1', goals: 1 }],
        teamB: [{ playerId: 'home-player-1', goals: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(matchesRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('preserves team Copa aggregate scoring without roster player validation', async () => {
    matchesRepository.findOne.mockResolvedValue({
      id: 'match-1',
      tournamentId: 'tournament-1',
      status: MatchStatus.PENDING,
      tournament: {
        id: 'tournament-1',
        type: TournamentType.TEAMS,
        format: TournamentFormat.COPA,
      },
    });
    matchesRepository.manager.getRepository.mockImplementation((entity) => {
      if (entity === TournamentTeam) {
        return {
          find: jest.fn().mockResolvedValue([
            { id: 'home-team', tournamentId: 'tournament-1', name: 'Home' },
            { id: 'away-team', tournamentId: 'tournament-1', name: 'Away' },
          ]),
        };
      }
      throw new Error('Unexpected repository');
    });

    const teamsRepo = {
      create: jest.fn((input: Record<string, unknown>) => input),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((teams: Team[]) =>
        Promise.resolve(
          teams.map((team, index) => ({ ...team, id: `match-team-${index}` })),
        ),
      ),
      delete: jest.fn(),
    };
    const playerTeamExecute = jest.fn().mockResolvedValue(undefined);
    const playerTeamsRepo = {
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: playerTeamExecute,
      })),
    };
    matchesRepository.manager.transaction.mockImplementation(
      (
        callback: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => Promise<unknown>,
      ) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === Team) {
              return teamsRepo;
            }
            if (entity === PlayerTeam) {
              return playerTeamsRepo;
            }
            throw new Error('Unexpected transaction repository');
          },
        }),
    );

    await service.upsertLineup('match-1', 'auth0|admin', {
      teamATournamentTeamId: 'home-team',
      teamBTournamentTeamId: 'away-team',
      teamAGoals: 0,
      teamBGoals: 2,
      teamA: [{ playerId: 'not-a-roster-check', goals: 99 }],
      teamB: [],
    });

    expect(playersRepository.find).not.toHaveBeenCalled();
    expect(teamsRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tournamentTeamId: 'home-team',
        goals: 0,
        result: TeamResult.LOSER,
      }),
      expect.objectContaining({
        tournamentTeamId: 'away-team',
        goals: 2,
        result: TeamResult.WINNER,
      }),
    ]);
    expect(playerTeamExecute).toHaveBeenCalledTimes(1);
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
