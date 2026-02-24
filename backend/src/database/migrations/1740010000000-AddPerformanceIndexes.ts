import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1740010000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1740010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_teams_matchId" ON "teams" ("matchId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_player_teams_teamId" ON "player_teams" ("teamId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_matches_tournamentId_kickoffAt" ON "matches" ("tournamentId", "kickoffAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_players_tournamentId" ON "players" ("tournamentId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_players_tournamentId"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_matches_tournamentId_kickoffAt"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_player_teams_teamId"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "idx_teams_matchId"');
  }
}
