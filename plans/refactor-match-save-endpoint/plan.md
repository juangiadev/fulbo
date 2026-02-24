# Refactor Match Save Endpoint

**Branch:** `refactor-match-save-endpoint`

## Problem

Saving a match from the frontend triggers 2 sequential HTTP calls (`PATCH /matches/:matchId` + `POST /matches/:matchId/lineup`) that together execute ~23 DB queries for a typical 5v5 match. The lineup endpoint uses a "sync" strategy (diff existing vs desired, then individual INSERT/UPDATE/DELETE per player) when the frontend already sends the complete desired state every time.

## Solution

Replace the two endpoints with a single `PUT /matches/:matchId` that receives match metadata + lineup in one payload, using a **hybrid strategy** inside a single transaction:

- **Teams**: upsert (stable rows, matched by name with creation-order fallback — same as current logic)
- **Player teams**: replace (delete existing + bulk insert)
- **Concurrency**: row-level lock on the match to serialize concurrent saves

### Query count: ~23 → ~8

No schema changes to the `teams` table. No impact on existing data.

## Steps

### 1. Create combined DTO (`SaveMatchDto`)

Combines match metadata (from `UpdateMatchDto`) + lineup (from `UpsertMatchLineupDto`):

- Match metadata fields: all optional (partial update)
- Lineup fields: `teamA`, `teamB` (player arrays) — required
- Team config: `teamAName`, `teamBName`, `teamAColor`, `teamBColor` — optional with defaults

Validations carried forward from current code:
- No duplicate players across teams
- Team names must be different (case-insensitive)
- Goals >= 0 (DTO-level, not just DB constraint)
- `mvpPlayerId` must belong to the match's tournament

### 2. Implement `saveMatch()` service method

`saveMatch(matchId, auth0Id, dto)` — single transaction:

1. `SELECT ... FROM matches WHERE id = $1 FOR UPDATE` — fetch + lock match row **(1 query)**
2. `findActorForTournament()` → auth check **(1 query)**
3. Validate all player IDs exist in tournament using `WHERE id IN (...)` **(1 query)**
4. UPDATE match row with metadata **(1 query)**
5. Find or create team A (by name, fallback to creation order) **(1 query)**
6. Find or create team B (by name, fallback to creation order) **(1 query)**
7. DELETE all `player_teams` for both team IDs **(1 query)**
8. Bulk INSERT all `player_teams` rows **(1 query)**

**Total: ~8 queries inside a single transaction.**

Key design decisions:
- **Teams are stable** — same row is reused across saves, preserving `id`, `createdAt`, `imageUrl`
- **Team matching** uses the existing logic (find by name `'Team A'`/`'Team B'`, fallback to creation order)
- **Player teams are replaced** — simple, no diffing, frontend sends full state
- **Row lock** on match prevents concurrent saves from creating duplicate teams
- **Computed results** (WINNER/LOSER/DRAW/PENDING) calculated in-memory before upserting teams

### 3. Add controller route

- `PUT /matches/:matchId` → calls `saveMatch()`
- Keep `PATCH /matches/:matchId` and `POST /matches/:matchId/lineup` untouched for backward compat

### 4. Update frontend

- Update API client to call `PUT /matches/:matchId` with the combined payload
- Update `TournamentMatchEditPage.tsx`: single call instead of two sequential awaits

### 5. Migration: add indexes

New migration adding indexes on FK columns. No schema changes.

```sql
CREATE INDEX CONCURRENTLY idx_teams_match_id ON teams("matchId");
CREATE INDEX CONCURRENTLY idx_player_teams_team_id ON player_teams("teamId");
CREATE INDEX CONCURRENTLY idx_player_teams_player_id ON player_teams("playerId");
CREATE INDEX CONCURRENTLY idx_players_tournament_id ON players("tournamentId");
CREATE INDEX CONCURRENTLY idx_matches_tournament_id ON matches("tournamentId");
```

> Note: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Use a non-transactional migration or split into a separate migration file.

## Order of execution

1. Create `SaveMatchDto`
2. Implement `saveMatch()` service method
3. Add `PUT` controller route
4. Update frontend API client + page
5. Create indexes migration

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Concurrent saves → duplicate teams | `SELECT ... FOR UPDATE` row lock on match |
| Replace wipes `player_teams.createdAt` | Acceptable — these are transient assignment records, not historical data |
| `CREATE INDEX CONCURRENTLY` can't run in transaction | Use non-transactional migration or separate migration file |
| Old endpoints still exist | Keep for backward compat, deprecate once frontend is fully migrated |
