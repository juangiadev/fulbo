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
      tournamentsService as unknown as TournamentsService,
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

  it('rejects Liga roster player self-editing through the generic player edit route', async () => {
    const existingPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
      ability: 8,
      misses: 1,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(existingPlayer);
    playersRepository.findOne.mockResolvedValue(existingPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.update('tournament-1', existingPlayer.id, 'auth0|player', {
        name: 'Public name',
        nickname: 'Nick',
        ability: 3,
        misses: 4,
        role: PlayerRole.ADMIN,
      } as UpdatePlayerDto),
    ).rejects.toThrow('You are not allowed to edit this player');
  });

  it('allows same-team tournament admins to edit Liga roster players through the generic player edit route', async () => {
    const admin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const rosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
      ability: 5,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(admin);
    playersRepository.findOne.mockResolvedValue(rosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    const player = await service.update(
      'tournament-1',
      rosterPlayer.id,
      'auth0|admin',
      { ability: 7, role: PlayerRole.OWNER } as UpdatePlayerDto,
    );

    expect(player).toEqual(
      expect.objectContaining({
        ability: 7,
        role: PlayerRole.USER,
      }),
    );
  });

  it('allows same-team Liga roster players to view each other', async () => {
    const actor = {
      id: 'actor-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
    } as Player;
    const teammate = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(actor);
    playersRepository.findOne.mockResolvedValue(teammate);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.findOne('tournament-1', teammate.id, 'auth0|teammate'),
    ).resolves.toBe(teammate);
  });

  it('rejects other-team Liga roster player detail access for ordinary teammates', async () => {
    const actor = {
      id: 'actor-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.USER,
    } as Player;
    const otherTeamPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(actor);
    playersRepository.findOne.mockResolvedValue(otherTeamPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.findOne('tournament-1', otherTeamPlayer.id, 'auth0|teammate'),
    ).rejects.toThrow('You are not allowed to view this player');
  });

  it('rejects other-team Liga roster player detail access for tournament admins', async () => {
    const admin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const otherTeamPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(admin);
    playersRepository.findOne.mockResolvedValue(otherTeamPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.findOne('tournament-1', otherTeamPlayer.id, 'auth0|admin'),
    ).rejects.toThrow('You are not allowed to view this player');
  });

  it('rejects a Liga tournament admin editing another team roster', async () => {
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const otherRosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      role: PlayerRole.USER,
      ability: 5,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    playersRepository.findOne.mockResolvedValue(otherRosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.update('tournament-1', otherRosterPlayer.id, 'auth0|admin', {
        ability: 7,
      } as UpdatePlayerDto),
    ).rejects.toThrow('You are not allowed to edit this player');
  });

  it('allows same-team Liga tournament admins to link roster players through the generic route', async () => {
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const rosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      userId: null,
      name: 'Roster Player',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
      claimCodeHash: 'hash',
      claimCodeExpiresAt: new Date(Date.now() + 60_000),
    } as Player;
    const user = {
      id: 'user-1',
      name: 'Linked User',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
    } as User;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);
    playersRepository.findOne
      .mockResolvedValueOnce(rosterPlayer)
      .mockResolvedValueOnce(null);
    usersRepository.findOne.mockResolvedValue(user);

    const player = await service.linkPlayerToUser(
      'tournament-1',
      rosterPlayer.id,
      'auth0|admin',
      { userId: user.id },
    );

    expect(player.userId).toBe(user.id);
    expect(player.tournamentTeamId).toBe('team-1');
    expect(playersRepository.save).toHaveBeenCalledWith(rosterPlayer);
  });

  it('rejects other-team Liga tournament admins linking roster players through the generic route', async () => {
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const otherRosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      userId: null,
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    playersRepository.findOne.mockResolvedValue(otherRosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.linkPlayerToUser(
        'tournament-1',
        otherRosterPlayer.id,
        'auth0|admin',
        { userId: 'user-1' },
      ),
    ).rejects.toThrow('You are not allowed to manage this player');
    expect(usersRepository.findOne).not.toHaveBeenCalled();
    expect(playersRepository.save).not.toHaveBeenCalled();
  });

  it('allows same-team Liga tournament admins to regenerate roster claim codes through the generic route', async () => {
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const rosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      userId: null,
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    playersRepository.findOne.mockResolvedValue(rosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    const response = await service.regenerateClaimCode(
      'tournament-1',
      rosterPlayer.id,
      'auth0|admin',
    );

    expect(response.claimCode).toHaveLength(8);
    expect(rosterPlayer.claimCodeHash).toEqual(expect.any(String));
    expect(playersRepository.save).toHaveBeenCalledWith(rosterPlayer);
  });

  it('rejects other-team Liga tournament admins regenerating roster claim codes through the generic route', async () => {
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const otherRosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      userId: null,
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    playersRepository.findOne.mockResolvedValue(otherRosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.regenerateClaimCode(
        'tournament-1',
        otherRosterPlayer.id,
        'auth0|admin',
      ),
    ).rejects.toThrow('You are not allowed to manage this player');
    expect(playersRepository.save).not.toHaveBeenCalled();
  });

  it('allows same-team Liga tournament admins to read roster claim code metadata through the generic route', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const rosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      userId: null,
      role: PlayerRole.USER,
      claimCodeExpiresAt: expiresAt,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    playersRepository.findOne.mockResolvedValue(rosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.getClaimCodeMeta('tournament-1', rosterPlayer.id, 'auth0|admin'),
    ).resolves.toEqual({ expiresAt });
  });

  it('rejects other-team Liga tournament admins reading roster claim code metadata through the generic route', async () => {
    const teamAdmin = {
      id: 'admin-player',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      role: PlayerRole.ADMIN,
    } as Player;
    const otherRosterPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-2',
      userId: null,
      role: PlayerRole.USER,
    } as Player;
    tournamentsService.findActorForTournament.mockResolvedValue(teamAdmin);
    playersRepository.findOne.mockResolvedValue(otherRosterPlayer);
    tournamentsRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      type: TournamentType.TEAMS,
      format: TournamentFormat.LIGA,
    } as Tournament);

    await expect(
      service.getClaimCodeMeta(
        'tournament-1',
        otherRosterPlayer.id,
        'auth0|admin',
      ),
    ).rejects.toThrow('You are not allowed to manage this player');
  });

  it('keeps Liga roster membership when claiming a player code', async () => {
    const claimedPlayer = {
      id: 'player-1',
      tournamentId: 'tournament-1',
      tournamentTeamId: 'team-1',
      userId: null,
      name: 'Roster Player',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
      claimCodeHash:
        '4f3bc32e09ad3f8e1b20405c3a3c842280ec93ddb2b7f5746ceb4b38605b201e',
      claimCodeExpiresAt: new Date(Date.now() + 60_000),
    } as Player;
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      auth0Id: 'auth0|player',
      name: 'User Name',
      nickname: null,
      imageUrl: null,
      favoriteTeamSlug: null,
      displayPreference: DisplayPreference.IMAGE,
    } as User);
    playersRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(claimedPlayer);

    const player = await service.claimPlayer('tournament-1', 'auth0|player', {
      claimCode: 'CLAIMCODE',
    });

    expect(player.tournamentTeamId).toBe('team-1');
    expect(player.userId).toBe('user-1');
  });
});
