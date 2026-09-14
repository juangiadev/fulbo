import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DisplayPreference, PlayerRole } from '../../../shared/src/enums';
import {
  DEFAULT_PLAYER_ABILITY,
  Player,
  Tournament,
  User,
} from '../database/entities';
import { TournamentsService } from './tournaments.service';

type TransactionManager = {
  find: jest.Mock;
  save: jest.Mock;
};

type TransactionCallback = (manager: TransactionManager) => Promise<unknown>;

type MockRepository = {
  create: jest.MockedFunction<(value: unknown) => unknown>;
  createQueryBuilder: jest.Mock;
  delete: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  manager: {
    transaction: jest.MockedFunction<
      (callback: TransactionCallback) => Promise<unknown>
    >;
  };
  save: jest.MockedFunction<(value: unknown) => Promise<unknown>>;
};

const createRepositoryMock = (): MockRepository => ({
  create: jest.fn((value: unknown): unknown => value),
  createQueryBuilder: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

const createPlayer = (overrides: Partial<Player>): Player =>
  ({
    id: overrides.id ?? 'player-id',
    userId: overrides.userId ?? null,
    tournamentId: overrides.tournamentId ?? 'tournament-id',
    name: overrides.name ?? 'Player',
    nickname: overrides.nickname ?? null,
    imageUrl: overrides.imageUrl ?? null,
    favoriteTeamSlug: overrides.favoriteTeamSlug ?? null,
    displayPreference: overrides.displayPreference ?? DisplayPreference.IMAGE,
    role: overrides.role ?? PlayerRole.USER,
    ability: overrides.ability ?? null,
    injury: overrides.injury ?? null,
    misses: overrides.misses ?? 0,
    claimCodeHash: overrides.claimCodeHash ?? null,
    claimCodeExpiresAt: overrides.claimCodeExpiresAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    user: overrides.user ?? null,
    tournament: overrides.tournament as Tournament,
    playerTeams: overrides.playerTeams ?? [],
  }) as Player;

describe('TournamentsService', () => {
  let service: TournamentsService;
  let tournamentsRepository: MockRepository;
  let playersRepository: MockRepository;
  let usersRepository: MockRepository;
  let invitesRepository: MockRepository;
  let joinRequestsRepository: MockRepository;
  let playerTeamsRepository: MockRepository;
  let matchesRepository: MockRepository;

  beforeEach(() => {
    tournamentsRepository = createRepositoryMock();
    playersRepository = createRepositoryMock();
    usersRepository = createRepositoryMock();
    invitesRepository = createRepositoryMock();
    joinRequestsRepository = createRepositoryMock();
    playerTeamsRepository = createRepositoryMock();
    matchesRepository = createRepositoryMock();

    service = new TournamentsService(
      tournamentsRepository as never,
      playersRepository as never,
      usersRepository as never,
      invitesRepository as never,
      joinRequestsRepository as never,
      playerTeamsRepository as never,
      matchesRepository as never,
    );
  });

  it('creates the tournament owner with the default ability', async () => {
    const user = {
      id: 'user-1',
      auth0Id: 'auth0|owner',
      name: 'Owner',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
    } as User;
    const tournament = { id: 'tournament-1', name: 'League' } as Tournament;

    usersRepository.findOne.mockResolvedValue(user);
    tournamentsRepository.save.mockResolvedValue(tournament);
    playersRepository.save.mockImplementation((player) =>
      Promise.resolve(player),
    );

    await service.create('auth0|owner', { name: 'League' });

    expect(playersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        tournamentId: tournament.id,
        role: PlayerRole.OWNER,
        ability: DEFAULT_PLAYER_ABILITY,
      }),
    );
  });

  it('rejects imports from the same tournament', async () => {
    await expect(
      service.importPlayers('tournament-1', 'auth0|owner', {
        sourceTournamentId: 'tournament-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('downgrades imported owners to admins and clears guest claim data', async () => {
    jest
      .spyOn(service, 'findActorForTournament')
      .mockResolvedValueOnce(createPlayer({ role: PlayerRole.OWNER }))
      .mockResolvedValueOnce(createPlayer({ role: PlayerRole.ADMIN }));

    tournamentsRepository.findOne
      .mockResolvedValueOnce({ id: 'target-1' })
      .mockResolvedValueOnce({ id: 'source-1' });

    const savedPlayers: Player[] = [];
    playersRepository.manager.transaction.mockImplementation((callback) => {
      const manager = {
        find: jest
          .fn()
          .mockResolvedValueOnce([
            createPlayer({
              id: 'source-owner',
              tournamentId: 'source-1',
              userId: 'user-owner',
              role: PlayerRole.OWNER,
            }),
            createPlayer({
              id: 'source-admin',
              tournamentId: 'source-1',
              userId: 'user-admin',
              role: PlayerRole.ADMIN,
              ability: 7,
              misses: 2,
            }),
            createPlayer({
              id: 'source-guest',
              tournamentId: 'source-1',
              role: PlayerRole.USER,
              userId: null,
              claimCodeHash: 'stale-claim',
              claimCodeExpiresAt: new Date('2026-06-15T00:00:00.000Z'),
            }),
          ])
          .mockResolvedValueOnce([]),
        save: jest.fn((_entity, players: Player[]) => {
          savedPlayers.push(...players);
          return Promise.resolve(players);
        }),
      };

      return callback(manager);
    });

    await expect(
      service.importPlayers('target-1', 'auth0|owner', {
        sourceTournamentId: 'source-1',
      }),
    ).resolves.toEqual({
      importedCount: 3,
      skippedLinkedUserCount: 0,
      sourceTournamentId: 'source-1',
      targetTournamentId: 'target-1',
    });

    expect(savedPlayers).toHaveLength(3);
    expect(savedPlayers[0]).toMatchObject({
      tournamentId: 'target-1',
      userId: 'user-owner',
      role: PlayerRole.ADMIN,
      ability: null,
    });
    expect(savedPlayers[1]).toMatchObject({
      tournamentId: 'target-1',
      userId: 'user-admin',
      role: PlayerRole.ADMIN,
      ability: 7,
      misses: 2,
    });
    expect(savedPlayers[2]).toMatchObject({
      tournamentId: 'target-1',
      userId: null,
      ability: null,
      claimCodeHash: null,
      claimCodeExpiresAt: null,
    });
  });

  it('skips linked users already present in the target tournament', async () => {
    jest
      .spyOn(service, 'findActorForTournament')
      .mockResolvedValueOnce(createPlayer({ role: PlayerRole.ADMIN }))
      .mockResolvedValueOnce(createPlayer({ role: PlayerRole.ADMIN }));

    tournamentsRepository.findOne
      .mockResolvedValueOnce({ id: 'target-1' })
      .mockResolvedValueOnce({ id: 'source-1' });

    const savedPlayers: Player[] = [];
    playersRepository.manager.transaction.mockImplementation((callback) => {
      const manager = {
        find: jest
          .fn()
          .mockResolvedValueOnce([
            createPlayer({
              id: 'linked-source',
              tournamentId: 'source-1',
              userId: 'user-1',
            }),
            createPlayer({
              id: 'guest-source',
              tournamentId: 'source-1',
              userId: null,
              name: 'Guest clone',
            }),
          ])
          .mockResolvedValueOnce([
            createPlayer({
              id: 'target-existing',
              tournamentId: 'target-1',
              userId: 'user-1',
            }),
          ]),
        save: jest.fn((_entity, players: Player[]) => {
          savedPlayers.push(...players);
          return Promise.resolve(players);
        }),
      };

      return callback(manager);
    });

    await expect(
      service.importPlayers('target-1', 'auth0|owner', {
        sourceTournamentId: 'source-1',
      }),
    ).resolves.toEqual({
      importedCount: 1,
      skippedLinkedUserCount: 1,
      sourceTournamentId: 'source-1',
      targetTournamentId: 'target-1',
    });

    expect(savedPlayers).toHaveLength(1);
    expect(savedPlayers[0]).toMatchObject({
      tournamentId: 'target-1',
      userId: null,
      name: 'Guest clone',
    });
  });

  it('rejects imports when the actor is not owner or admin in both tournaments', async () => {
    jest
      .spyOn(service, 'findActorForTournament')
      .mockResolvedValueOnce(createPlayer({ role: PlayerRole.OWNER }))
      .mockResolvedValueOnce(createPlayer({ role: PlayerRole.USER }));

    tournamentsRepository.findOne
      .mockResolvedValueOnce({ id: 'target-1' })
      .mockResolvedValueOnce({ id: 'source-1' });

    await expect(
      service.importPlayers('target-1', 'auth0|owner', {
        sourceTournamentId: 'source-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
