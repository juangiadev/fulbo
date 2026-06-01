import { ValidationPipe, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Player,
  Tournament,
  User,
} from './../src/database/entities';
import { DisplayPreference, PlayerRole } from '../../shared/src/enums';

jest.setTimeout(20_000);

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let usersRepository: Repository<User>;
  let tournamentsRepository: Repository<Tournament>;
  let playersRepository: Repository<Player>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DEV_AUTH_BYPASS = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    usersRepository = dataSource.getRepository(User);
    tournamentsRepository = dataSource.getRepository(Tournament);
    playersRepository = dataSource.getRepository(Player);

    await resetDatabase(dataSource);
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(404);
  });

  it('POST /api/tournaments/:id/import-players imports eligible source players', async () => {
    const actor = await syncUser('auth0|owner', 'owner@fulbo.test', 'Owner');
    const duplicateLinkedUser = await usersRepository.save(
      usersRepository.create({
        auth0Id: 'auth0|duplicate-linked',
        email: 'duplicate-linked@fulbo.test',
        name: 'Duplicate linked user',
      }),
    );
    const importedLinkedUser = await usersRepository.save(
      usersRepository.create({
        auth0Id: 'auth0|imported-linked',
        email: 'imported-linked@fulbo.test',
        name: 'Imported linked user',
        favoriteTeamSlug: 'boca-juniors',
        displayPreference: DisplayPreference.FAVORITE_TEAM,
      }),
    );
    const sourceTournament = await tournamentsRepository.save(
      tournamentsRepository.create({ name: 'Source tournament' }),
    );
    const targetTournament = await tournamentsRepository.save(
      tournamentsRepository.create({ name: 'Target tournament' }),
    );

    await playersRepository.save([
      playersRepository.create({
        tournamentId: sourceTournament.id,
        userId: actor.id,
        name: actor.name,
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.OWNER,
      }),
      playersRepository.create({
        tournamentId: targetTournament.id,
        userId: actor.id,
        name: actor.name,
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.OWNER,
      }),
      playersRepository.create({
        tournamentId: sourceTournament.id,
        userId: duplicateLinkedUser.id,
        name: 'Already linked elsewhere',
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.USER,
      }),
      playersRepository.create({
        tournamentId: targetTournament.id,
        userId: duplicateLinkedUser.id,
        name: 'Existing target member',
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.USER,
      }),
      playersRepository.create({
        tournamentId: sourceTournament.id,
        userId: importedLinkedUser.id,
        name: 'Imported admin',
        displayPreference: DisplayPreference.FAVORITE_TEAM,
        favoriteTeamSlug: 'boca-juniors',
        role: PlayerRole.ADMIN,
        ability: 8,
        misses: 1,
      }),
      playersRepository.create({
        tournamentId: sourceTournament.id,
        userId: null,
        name: 'Imported guest',
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.USER,
        claimCodeHash: 'stale-claim',
        claimCodeExpiresAt: new Date('2026-06-15T00:00:00.000Z'),
      }),
    ]);

    const response = await request(app.getHttpServer())
      .post(`/api/tournaments/${targetTournament.id}/import-players`)
      .set('x-dev-auth0-id', 'auth0|owner')
      .send({ sourceTournamentId: sourceTournament.id })
      .expect(201);

    expect(response.body).toMatchObject({
      targetTournamentId: targetTournament.id,
      sourceTournamentId: sourceTournament.id,
      importedCount: 2,
      skippedLinkedUserCount: 2,
    });

    const targetPlayers = await playersRepository.find({
      where: { tournamentId: targetTournament.id },
      order: { createdAt: 'ASC' },
    });

    expect(targetPlayers).toHaveLength(4);
    expect(targetPlayers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: importedLinkedUser.id,
          role: PlayerRole.ADMIN,
          favoriteTeamSlug: 'boca-juniors',
          ability: 8,
          misses: 1,
        }),
        expect.objectContaining({
          userId: null,
          name: 'Imported guest',
          claimCodeHash: null,
          claimCodeExpiresAt: null,
        }),
      ]),
    );
  });

  it('POST /api/tournaments/:id/import-players rejects members without admin access', async () => {
    const actor = await syncUser('auth0|member', 'member@fulbo.test', 'Member');
    const sourceTournament = await tournamentsRepository.save(
      tournamentsRepository.create({ name: 'Source tournament' }),
    );
    const targetTournament = await tournamentsRepository.save(
      tournamentsRepository.create({ name: 'Target tournament' }),
    );

    await playersRepository.save([
      playersRepository.create({
        tournamentId: sourceTournament.id,
        userId: actor.id,
        name: actor.name,
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.USER,
      }),
      playersRepository.create({
        tournamentId: targetTournament.id,
        userId: actor.id,
        name: actor.name,
        displayPreference: DisplayPreference.IMAGE,
        role: PlayerRole.OWNER,
      }),
    ]);

    await request(app.getHttpServer())
      .post(`/api/tournaments/${targetTournament.id}/import-players`)
      .set('x-dev-auth0-id', 'auth0|member')
      .send({ sourceTournamentId: sourceTournament.id })
      .expect(403);

    const targetPlayers = await playersRepository.find({
      where: { tournamentId: targetTournament.id },
    });

    expect(targetPlayers).toHaveLength(1);
  });

  async function syncUser(auth0Id: string, email: string, name: string) {
    const response = await request(app.getHttpServer())
      .post('/api/users/me/sync')
      .set('x-dev-auth0-id', auth0Id)
      .send({ email, name })
      .expect(201);

    return response.body as User;
  }

  async function resetDatabase(database: DataSource) {
    await database.query(
      'TRUNCATE TABLE "match_mvp_votes", "player_teams", "teams", "matches", "tournament_join_requests", "tournament_invites", "players", "tournaments", "users" RESTART IDENTITY CASCADE',
    );
  }
});
