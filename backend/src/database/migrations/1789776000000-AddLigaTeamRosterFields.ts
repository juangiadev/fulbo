import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLigaTeamRosterFields1789776000000 implements MigrationInterface {
  name = 'AddLigaTeamRosterFields1789776000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" ADD "tournamentTeamId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD "isTeamAdmin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_tournament_team" ON "players" ("tournamentTeamId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD CONSTRAINT "FK_players_tournament_team" FOREIGN KEY ("tournamentTeamId") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" DROP CONSTRAINT "FK_players_tournament_team"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_players_tournament_team"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "isTeamAdmin"`);
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN "tournamentTeamId"`,
    );
  }
}
