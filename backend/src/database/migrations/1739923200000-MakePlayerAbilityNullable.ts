import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePlayerAbilityNullable1739923200000 implements MigrationInterface {
  name = 'MakePlayerAbilityNullable1739923200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "players" ALTER COLUMN "ability" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "players" ALTER COLUMN "ability" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "players" ALTER COLUMN "ability" SET DEFAULT 10',
    );
    await queryRunner.query(
      'UPDATE "players" SET "ability" = 10 WHERE "ability" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "players" ALTER COLUMN "ability" SET NOT NULL',
    );
  }
}
