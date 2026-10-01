import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentTypeFormat1789430400000 implements MigrationInterface {
  name = 'AddTournamentTypeFormat1789430400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "tournaments_type_enum" AS ENUM ('USER', 'TEAMS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "tournaments_format_enum" AS ENUM ('LIGA', 'COPA')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournaments" ADD "type" "tournaments_type_enum" NOT NULL DEFAULT 'USER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournaments" ADD "format" "tournaments_format_enum" NOT NULL DEFAULT 'LIGA'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournaments" DROP COLUMN "format"`);
    await queryRunner.query(`ALTER TABLE "tournaments" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "tournaments_format_enum"`);
    await queryRunner.query(`DROP TYPE "tournaments_type_enum"`);
  }
}
