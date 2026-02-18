import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1739836800000 implements MigrationInterface {
  name = 'InitialSchema1739836800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(
      `CREATE TYPE "users_displaypreference_enum" AS ENUM ('IMAGE', 'FAVORITE_TEAM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "tournaments_visibility_enum" AS ENUM ('PUBLIC', 'PRIVATE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "players_displaypreference_enum" AS ENUM ('IMAGE', 'FAVORITE_TEAM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "players_role_enum" AS ENUM ('OWNER', 'ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "teams_result_enum" AS ENUM ('WINNER', 'LOSER', 'DRAW', 'PENDING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "tournament_join_requests_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "auth0Id" character varying NOT NULL,
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "nickname" character varying,
        "imageUrl" character varying,
        "favoriteTeamSlug" character varying,
        "displayPreference" "users_displaypreference_enum" NOT NULL DEFAULT 'IMAGE',
        "finishedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_auth0Id" UNIQUE ("auth0Id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tournaments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "visibility" "tournaments_visibility_enum" NOT NULL DEFAULT 'PRIVATE',
        "imageUrl" character varying,
        "leaderBannerImageUrl" character varying,
        "scorerBannerImageUrl" character varying,
        "finishedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournaments_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "players" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid,
        "tournamentId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "nickname" character varying,
        "imageUrl" character varying,
        "favoriteTeamSlug" character varying,
        "displayPreference" "players_displaypreference_enum" NOT NULL DEFAULT 'IMAGE',
        "role" "players_role_enum" NOT NULL DEFAULT 'USER',
        "ability" smallint,
        "injury" text,
        "misses" integer NOT NULL DEFAULT 0,
        "claimCodeHash" character varying,
        "claimCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_players_user_tournament" UNIQUE ("userId", "tournamentId"),
        CONSTRAINT "CHK_players_ability" CHECK ("ability" >= 1 AND "ability" <= 10),
        CONSTRAINT "CHK_players_misses" CHECK ("misses" >= 0),
        CONSTRAINT "PK_players_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_players_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_players_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tournamentId" uuid NOT NULL,
        "placeName" character varying NOT NULL,
        "placeUrl" character varying,
        "kickoffAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "stage" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "mvpPlayerId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_matches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_matches_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_matches_mvp" FOREIGN KEY ("mvpPlayerId") REFERENCES "players"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "matchId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "imageUrl" character varying,
        "result" "teams_result_enum" NOT NULL DEFAULT 'PENDING',
        "color" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teams_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "player_teams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "playerId" uuid NOT NULL,
        "teamId" uuid NOT NULL,
        "goals" integer NOT NULL DEFAULT 0,
        "injury" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_player_teams_player_team" UNIQUE ("playerId", "teamId"),
        CONSTRAINT "CHK_player_teams_goals" CHECK ("goals" >= 0),
        CONSTRAINT "PK_player_teams_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_player_teams_player" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_player_teams_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tournament_invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tournamentId" uuid NOT NULL,
        "codeHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_tournament_invite_tournament" UNIQUE ("tournamentId"),
        CONSTRAINT "PK_tournament_invites_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tournament_invites_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tournament_join_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tournamentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "status" "tournament_join_requests_status_enum" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournament_join_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tournament_join_requests_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tournament_join_requests_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tournament_join_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tournament_invites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "player_teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "matches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "players"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tournaments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "tournament_join_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "teams_result_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "players_role_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "players_displaypreference_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "tournaments_visibility_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "users_displaypreference_enum"`,
    );
  }
}
