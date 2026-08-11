import { DisplayPreference, PlayerRole } from '../../../shared/src/enums';
import { Player, Tournament, User } from '../database/entities';
import { Auth0ManagementService } from './auth0-management.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';
import type { Repository } from 'typeorm';

describe('UsersService', () => {
  const user = {
    id: 'user-id',
    auth0Id: 'auth0|user',
    email: 'user@example.com',
    name: 'User',
    nickname: null,
    imageUrl: null,
    favoriteTeamSlug: null,
    displayPreference: DisplayPreference.IMAGE,
  } as User;

  let usersRepository: jest.Mocked<Pick<Repository<User>, 'findOne' | 'save'>>;
  let playersRepository: jest.Mocked<Pick<Repository<Player>, 'find'>>;
  let service: UsersService;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    playersRepository = {
      find: jest.fn(),
    };
    service = new UsersService(
      usersRepository as unknown as Repository<User>,
      playersRepository as unknown as Repository<Player>,
      {} as Auth0ManagementService,
    );
  });

  it('returns only safe profile fields for the authenticated user players', async () => {
    const tournament = {
      id: 'tournament-id',
      name: 'Torneo de prueba',
    } as Tournament;
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const player = {
      id: 'player-id',
      userId: user.id,
      tournamentId: tournament.id,
      name: 'Jugador',
      nickname: 'Alias',
      imageUrl: 'https://example.com/player.png',
      favoriteTeamSlug: 'river-plate',
      displayPreference: DisplayPreference.FAVORITE_TEAM,
      role: PlayerRole.USER,
      ability: 8,
      injury: 'Private detail',
      misses: 2,
      updatedAt,
      tournament,
    } as Player;

    usersRepository.findOne.mockResolvedValue(user);
    playersRepository.find.mockResolvedValue([player]);

    await expect(service.getMyPlayers(user.auth0Id)).resolves.toEqual([
      {
        playerId: player.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        name: player.name,
        nickname: player.nickname,
        imageUrl: player.imageUrl,
        favoriteTeamSlug: player.favoriteTeamSlug,
        displayPreference: player.displayPreference,
        updatedAt,
      },
    ]);
    expect(playersRepository.find).toHaveBeenCalledWith({
      where: { userId: user.id },
      relations: { tournament: true },
      order: { updatedAt: 'DESC' },
    });
  });

  it('updates the user profile without touching tournament players', async () => {
    const input: UpdateMeDto = {
      name: 'Updated user',
      nickname: null,
      imageUrl: 'https://example.com/user.png',
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
    };

    usersRepository.findOne.mockResolvedValue(user);
    usersRepository.save.mockImplementation((savedUser) =>
      Promise.resolve(savedUser),
    );

    await expect(service.updateMe(user.auth0Id, input)).resolves.toBe(user);

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining(input),
    );
    expect(playersRepository.find).not.toHaveBeenCalled();
  });
});
