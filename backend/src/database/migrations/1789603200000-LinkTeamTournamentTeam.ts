import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkTeamTournamentTeam1789603200000 implements MigrationInterface {
  name = 'LinkTeamTournamentTeam1789603200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teams" ADD "tournamentTeamId" uuid`);
    await queryRunner.query(`ALTER TABLE "teams" ADD "goals" integer`);
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_tournamentTeamId" FOREIGN KEY ("tournamentTeamId") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_tournamentTeamId"`,
    );
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "goals"`);
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN "tournamentTeamId"`,
    );
  }
}
