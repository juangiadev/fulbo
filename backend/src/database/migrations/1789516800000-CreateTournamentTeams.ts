import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTournamentTeams1789516800000 implements MigrationInterface {
  name = 'CreateTournamentTeams1789516800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tournament_teams" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tournamentId" uuid NOT NULL, "name" character varying(120) NOT NULL, "imageUrl" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_tournament_teams_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tournament_teams_tournament_name" ON "tournament_teams" ("tournamentId", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_teams" ADD CONSTRAINT "FK_tournament_teams_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament_teams" DROP CONSTRAINT "FK_tournament_teams_tournament"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_tournament_teams_tournament_name"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_teams"`);
  }
}
