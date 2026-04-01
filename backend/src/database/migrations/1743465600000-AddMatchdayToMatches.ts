import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchdayToMatches1743465600000 implements MigrationInterface {
  name = 'AddMatchdayToMatches1743465600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "matches" ADD COLUMN "matchday" integer NOT NULL DEFAULT 1',
    );
    await queryRunner.query(
      'ALTER TABLE "matches" ALTER COLUMN "matchday" DROP DEFAULT',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_matches_tournamentId_matchday" ON "matches" ("tournamentId", "matchday")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_matches_tournamentId_matchday"',
    );
    await queryRunner.query('ALTER TABLE "matches" DROP COLUMN "matchday"');
  }
}
