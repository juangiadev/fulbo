import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DisplayPreference,
  PlayerRole,
  TournamentFormat,
  TournamentType,
} from '../../../shared/src/enums';
import {
  DEFAULT_PLAYER_ABILITY,
  Player,
  Tournament,
  TournamentTeam,
} from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { TournamentTeamsService } from './tournament-teams.service';

type MockRepository = {
  create: jest.MockedFunction<(value: unknown) => unknown>;
  delete: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  manager: {
    getRepository: jest.Mock;
  };
  save: jest.MockedFunction<(value: unknown) => Promise<unknown>>;
};

const createRepositoryMock = (): MockRepository => ({
  create: jest.fn((value: unknown): unknown => value),
  delete: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  manager: {
    getRepository: jest.fn(),
  },
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

const ligaTournament = {
  id: 'tournament-1',
  type: TournamentType.TEAMS,
  format: TournamentFormat.LIGA,
} as Tournament;

const ligaTeam = {
  id: 'team-1',
  tournamentId: 'tournament-1',
  tournament: ligaTournament,
} as TournamentTeam;

describe('TournamentTeamsService roster operations', () => {
  let service: TournamentTeamsService;
  let tournamentTeamsRepository: MockRepository;
  let tournamentsRepository: MockRepository;
  let playersRepository: MockRepository;
  let tournamentsService: jest.Mocked<
    Pick<TournamentsService, 'findActorForTournament'>
  >;

  beforeEach(() => {
    tournamentTeamsRepository = createRepositoryMock();
    tournamentsRepository = createRepositoryMock();
    playersRepository = createRepositoryMock();
    tournamentTeamsRepository.manager.getRepository.mockReturnValue(
      playersRepository,
    );
    tournamentsService = {
      findActorForTournament: jest.fn().mockResolvedValue({
        id: 'owner-player',
        role: PlayerRole.OWNER,
      } as Player),
    };
    tournamentTeamsRepository.findOne.mockResolvedValue(ligaTeam);

    service = new TournamentTeamsService(
      tournamentTeamsRepository as never,
      tournamentsRepository as never,
      tournamentsService as unknown as TournamentsService,
    );
  });

  it('creates a Liga roster player assigned to the team and returns a claim code', async () => {
    const { player, claimCode } = await service.createRosterPlayer(
      'team-1',
      'auth0|owner',
      { name: 'Roster Player' },
    );

    expect(claimCode).toMatch(/^[A-F0-9]{8}$/);
    expect(player).toEqual(
      expect.objectContaining({
        tournamentId: 'tournament-1',
        tournamentTeamId: 'team-1',
        isTeamAdmin: false,
        role: PlayerRole.USER,
        ability: DEFAULT_PLAYER_ABILITY,
        displayPreference: DisplayPreference.IMAGE,
      }),
    );
  });

  it('allows owners to delete a tournament team', async () => {
    tournamentTeamsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(
      service.remove('team-1', 'auth0|owner'),
    ).resolves.toBeUndefined();

    expect(tournamentTeamsRepository.delete).toHaveBeenCalledWith({
      id: 'team-1',
    });
  });

  it('rejects tournament admins deleting a tournament team', async () => {
    tournamentsService.findActorForTournament.mockResolvedValue({
      id: 'admin-player',
      role: PlayerRole.ADMIN,
    } as Player);

    await expect(
      service.remove('team-1', 'auth0|admin'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tournamentTeamsRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects roster operations outside Liga team tournaments', async () => {
    tournamentTeamsRepository.findOne.mockResolvedValue({
      ...ligaTeam,
      tournament: {
        ...ligaTournament,
        format: TournamentFormat.COPA,
      },
    } as TournamentTeam);

    await expect(
      service.createRosterPlayer('team-1', 'auth0|owner', {
        name: 'Roster Player',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces team and player same-tournament roster membership', async () => {
    playersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateRosterPlayer('team-1', 'other-player', 'auth0|owner', {
        name: 'Nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(playersRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'other-player',
        tournamentId: 'tournament-1',
        tournamentTeamId: 'team-1',
      },
    });
  });

  it('allows same-team tournament admins to view a Liga team roster', async () => {
    const tournamentAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(
      tournamentAdmin,
    );
    playersRepository.find.mockResolvedValue([{ id: 'player-1' } as Player]);

    await expect(service.findRoster('team-1', 'auth0|admin')).resolves.toEqual([
      { id: 'player-1' },
    ]);
  });

  it('rejects other-team tournament admins viewing a Liga team roster', async () => {
    const tournamentAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      role: PlayerRole.ADMIN,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(
      tournamentAdmin,
    );

    await expect(service.findRoster('team-1', 'auth0|admin')).rejects.toThrow(
      'You are not allowed to view this roster',
    );
  });

  it('lets only owners designate a roster player as local team admin', async () => {
    const rosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
      isTeamAdmin: false,
    } as Player;
    playersRepository.findOne.mockResolvedValue(rosterPlayer);

    const player = await service.updateRosterTeamAdmin(
      'team-1',
      'player-1',
      'auth0|owner',
      { isTeamAdmin: true },
    );

    expect(player.isTeamAdmin).toBe(true);
  });

  it('allows same-team tournament admins to update roster player fields', async () => {
    const tournamentAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const rosterPlayer = {
      id: 'player-1',
      userId: 'user-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
      isTeamAdmin: false,
      name: 'Player',
      ability: 5,
      injury: null,
      misses: 0,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(
      tournamentAdmin,
    );
    playersRepository.findOne.mockResolvedValue(rosterPlayer);

    const player = await service.updateRosterPlayer(
      'team-1',
      'player-1',
      'auth0|admin',
      {
        name: 'Admin Updated',
        ability: 8,
        injury: 'Knee',
        misses: 2,
        role: PlayerRole.OWNER,
      },
    );

    expect(player).toEqual(
      expect.objectContaining({
        name: 'Admin Updated',
        ability: 8,
        injury: 'Knee',
        misses: 2,
        role: PlayerRole.USER,
      }),
    );
  });

  it('rejects other-team tournament admins updating roster player fields', async () => {
    const tournamentAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      role: PlayerRole.ADMIN,
    } as Player;
    const rosterPlayer = {
      id: 'player-1',
      userId: 'user-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
      isTeamAdmin: false,
      name: 'Player',
      ability: 5,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(
      tournamentAdmin,
    );
    playersRepository.findOne.mockResolvedValue(rosterPlayer);

    await expect(
      service.updateRosterPlayer('team-1', 'player-1', 'auth0|admin', {
        ability: 8,
      }),
    ).rejects.toThrow('You are not allowed to edit this player');
  });

  it('rejects roster self-editing by ordinary claimed players', async () => {
    const rosterPlayer = {
      id: 'self-player',
      userId: 'user-self',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
      isTeamAdmin: false,
      name: 'Self',
      nickname: null,
      ability: 5,
      injury: null,
      misses: 0,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(rosterPlayer);
    playersRepository.findOne.mockResolvedValue(rosterPlayer);

    await expect(
      service.updateRosterPlayer('team-1', 'self-player', 'auth0|self', {
        name: 'Public Name',
        nickname: 'Public Nick',
        ability: 9,
        injury: 'Shoulder',
        misses: 4,
      }),
    ).rejects.toThrow('You are not allowed to edit this player');
  });

  it('does not allow legacy tournament admins to create roster players', async () => {
    tournamentsService.findActorForTournament.mockResolvedValue({
      id: 'legacy-admin',
      role: PlayerRole.ADMIN,
    } as Player);

    await expect(
      service.createRosterPlayer('team-1', 'auth0|legacy-admin', {
        name: 'Roster Player',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
