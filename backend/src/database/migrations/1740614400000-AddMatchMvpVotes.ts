import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchMvpVotes1740614400000 implements MigrationInterface {
  name = 'AddMatchMvpVotes1740614400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "match_mvp_votes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "matchId" uuid NOT NULL,
        "voterPlayerId" uuid NOT NULL,
        "votedPlayerId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_match_mvp_votes_match_voter" UNIQUE ("matchId", "voterPlayerId"),
        CONSTRAINT "PK_match_mvp_votes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_match_mvp_votes_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_mvp_votes_voter" FOREIGN KEY ("voterPlayerId") REFERENCES "players"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_mvp_votes_voted" FOREIGN KEY ("votedPlayerId") REFERENCES "players"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_match_mvp_votes_matchId" ON "match_mvp_votes" ("matchId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_match_mvp_votes_matchId_votedPlayerId" ON "match_mvp_votes" ("matchId", "votedPlayerId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_match_mvp_votes_matchId_votedPlayerId"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_match_mvp_votes_matchId"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "match_mvp_votes"');
  }
}
