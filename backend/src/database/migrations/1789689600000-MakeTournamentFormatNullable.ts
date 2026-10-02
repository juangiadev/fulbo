import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTournamentFormatNullable1789689600000 implements MigrationInterface {
  name = 'MakeTournamentFormatNullable1789689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournaments" ALTER COLUMN "format" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournaments" ALTER COLUMN "format" DROP NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "tournaments" SET "format" = NULL WHERE "type" = 'USER'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "tournaments" SET "format" = 'LIGA' WHERE "format" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournaments" ALTER COLUMN "format" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournaments" ALTER COLUMN "format" SET DEFAULT 'LIGA'`,
    );
  }
}
