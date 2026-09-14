import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultPlayerAbility1789344000000 implements MigrationInterface {
  name = 'SetDefaultPlayerAbility1789344000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "players" ALTER COLUMN "ability" SET DEFAULT 5',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "players" ALTER COLUMN "ability" DROP DEFAULT',
    );
  }
}
