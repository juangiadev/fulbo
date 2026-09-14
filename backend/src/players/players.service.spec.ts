import { DisplayPreference, PlayerRole } from '../../../shared/src/enums';
import {
  DEFAULT_PLAYER_ABILITY,
  Player,
  Tournament,
  User,
} from '../database/entities';
import { TournamentsService } from '../tournaments/tournaments.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

type MockRepository = {
  create: jest.MockedFunction<(value: unknown) => unknown>;
  delete: jest.Mock;
  findOne: jest.Mock;
  manager: {
    transaction: jest.Mock;
  };
  save: jest.MockedFunction<(value: unknown) => Promise<unknown>>;
};

const createRepositoryMock = (): MockRepository => ({
  create: jest.fn((value: unknown): unknown => value),
  delete: jest.fn(),
  findOne: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

describe('PlayersService creation', () => {
  let service: PlayersService;
  let playersRepository: MockRepository;
  let usersRepository: MockRepository;
  let tournamentsRepository: MockRepository;
  let tournamentsService: jest.Mocked<
    Pick<TournamentsService, 'findActorForTournament'>
  >;

  beforeEach(() => {
    playersRepository = createRepositoryMock();
    usersRepository = createRepositoryMock();
    tournamentsRepository = createRepositoryMock();
    tournamentsService = {
      findActorForTournament: jest.fn().mockResolvedValue({
        id: 'owner-player',
        role: PlayerRole.OWNER,
      } as Player),
    };

    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
    } as Tournament);

    service = new PlayersService(
      playersRepository as never,
      usersRepository as never,
      tournamentsRepository as never,
      tournamentsService as TournamentsService,
    );
  });

  it('defaults an omitted ability for a linked player', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'Player',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
    } as User);

    const player = await service.create('tournament-1', 'auth0|owner', {
      userId: 'user-1',
    });

    expect(player.ability).toBe(DEFAULT_PLAYER_ABILITY);
    expect(playersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ ability: DEFAULT_PLAYER_ABILITY }),
    );
  });

  it('preserves an explicitly supplied ability for a linked player', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'Player',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
    } as User);

    const player = await service.create('tournament-1', 'auth0|owner', {
      userId: 'user-1',
      ability: 8,
    });

    expect(player.ability).toBe(8);
  });

  it('defaults an omitted ability for a guest player', async () => {
    const { player } = await service.createGuest(
      'tournament-1',
      'auth0|owner',
      { name: 'Guest' },
    );

    expect(player.ability).toBe(DEFAULT_PLAYER_ABILITY);
    expect(playersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ ability: DEFAULT_PLAYER_ABILITY }),
    );
  });

  it('preserves a null ability when editing an existing player', async () => {
    const existingPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      role: PlayerRole.USER,
      ability: 8,
    } as Player;
    playersRepository.findOne.mockResolvedValue(existingPlayer);

    const player = await service.update(
      'tournament-1',
      existingPlayer.id,
      'auth0|owner',
      { ability: null } as unknown as UpdatePlayerDto,
    );

    expect(player.ability).toBeNull();
    expect(playersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ ability: null }),
    );
  });
});
