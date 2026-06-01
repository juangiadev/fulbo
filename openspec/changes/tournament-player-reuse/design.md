# Design: Tournament Player Reuse

## Technical Approach

Keep `POST /api/tournaments` unchanged and add a second authenticated command, `POST /api/tournaments/:id/import-players`, owned by `TournamentsModule`. The backend validates OWNER/ADMIN membership on both tournaments, reads source roster rows, and writes normalized clones into the target inside one transaction. The frontend extends the create form with an optional source tournament selector and, after successful creation, calls the import endpoint before reloading tournaments.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Import ownership | `PlayersService` copy helper vs `TournamentsService` orchestration | Keep orchestration in `TournamentsService`; use `PlayersService` only for reusable clone helpers if needed | Authorization depends on source + target tournaments, so the tournament domain should own the command boundary. |
| API flow | Change create payload vs follow-up endpoint | Follow-up endpoint | Preserves current create contract, keeps rollback simple, and matches spec retryability when import fails after creation. |
| Duplicate handling | DB-error on unique constraint vs explicit skip | Explicitly skip `userId` duplicates before insert | Avoids transaction failure from `uq_players_user_tournament` and gives deterministic summary output. |
| Guest copy policy | Reuse claim metadata vs clear it | Clear `claimCodeHash`/`claimCodeExpiresAt` on imported guests | Claim data is tournament-specific and must not leak stale invitation state. |

## Data Flow

```text
TournamentFormPage
  -> AppContext.createTournament(input, sourceTournamentId?)
  -> POST /api/tournaments
  -> POST /api/tournaments/:targetId/import-players { sourceTournamentId } (optional)
  -> TournamentsService.importPlayers()
       -> findActorForTournament(target)
       -> findActorForTournament(source)
       -> transaction(load source players, load target players, clone eligible rows, save)
  -> loadTournaments()
```

If import fails, the tournament already created remains valid; the UI reports the import error and routes to the new tournament so the action is retryable.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/tournaments/tournaments.controller.ts` | Modify | Add `POST :id/import-players`. |
| `backend/src/tournaments/tournaments.service.ts` | Modify | Add import orchestration, auth checks, transaction, and summary response. |
| `backend/src/tournaments/dto/import-tournament-players.dto.ts` | Create | Validate `sourceTournamentId` as UUID/string input. |
| `backend/src/players/players.service.ts` | Modify | Extract/internalize roster cloning helper only if it removes duplication cleanly. |
| `shared/src/contracts.ts` | Modify | Add import request/response contracts used by frontend API + state. |
| `frontend/src/api/client.ts` | Modify | Add `importTournamentPlayers(targetId, input)` client call. |
| `frontend/src/state/AppContext.tsx` | Modify | Extend `createTournament` to optionally chain import and surface partial-failure context. |
| `frontend/src/pages/tournaments/TournamentFormPage.tsx` | Modify | Add optional source selector, submitting states, and retryable messaging. |

## Interfaces / Contracts

```ts
export interface ImportTournamentPlayersRequest {
  sourceTournamentId: string;
}

export interface ImportTournamentPlayersResult {
  targetTournamentId: string;
  sourceTournamentId: string;
  importedCount: number;
  skippedLinkedUserCount: number;
}
```

Backend behavior:
- Request body validated by Nest `ValidationPipe`.
- Reject same source/target tournament with `400`.
- Reject missing tournaments or missing OWNER/ADMIN membership with existing `404/403` patterns.
- Imported rows copy roster fields only: `name`, `nickname`, `imageUrl`, `favoriteTeamSlug`, `displayPreference`, `ability`, `injury`, `misses`, `userId`.
- Imported `OWNER` becomes `ADMIN`; imported `ADMIN`/`USER` stay unchanged.
- Guest imports set `claimCodeHash = null` and `claimCodeExpiresAt = null`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Role normalization, duplicate skip, guest claim reset, same-tournament rejection | Jest service tests for `TournamentsService.importPlayers`. |
| Integration | Transactional import writes only `players` rows and keeps target unchanged on failure | Nest repository-backed tests around service/database behavior. |
| E2E | `POST /api/tournaments/:id/import-players` auth + happy path + forbidden path | Add Jest/Supertest e2e coverage in `backend/test/` using existing `/api` app bootstrap. |
| Frontend | None automated yet | Manual verification of create-with-import and create-success/import-failure flows; frontend has no test runner configured. |

## Migration / Rollout

No database migration required. The change reuses existing `players` columns and the current `/api` auth stack. Dev bypass still works because the new endpoint remains behind `JwtAuthGuard`; local testing needs both backend `DEV_AUTH_BYPASS=true` and frontend `VITE_DEV_AUTH_BYPASS=true` if bypass mode is used.

## Open Questions

- [ ] Should the post-create failure route users to tournament details or keep them on the form with a deep link to retry import later?
