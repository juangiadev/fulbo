## Exploration: tournament-player-reuse

### Current State
`POST /tournaments` creates only the tournament record plus one owner `Player` row for the creator in `TournamentsService.create()`. The create DTO/frontend form do not accept any source tournament or roster reuse input today. Additional players are created later through player flows in `PlayersService`: linked users via `POST /tournaments/:tournamentId/players`, guest players via `POST /tournaments/:tournamentId/players/guest`, join-request linking, and claim-code linking.

Players are tournament-scoped records (`players.tournamentId`) with a uniqueness rule on `(userId, tournamentId)`. Match/team history is attached indirectly through `player_teams` and `teams`, so reusing players for a new tournament means cloning player roster records only, not match history. Also, non-admin members cannot fetch the full source roster because `GET /tournaments/:id/players` returns the whole list only for OWNER/ADMIN; regular users only see themselves.

### Affected Areas
- `backend/src/tournaments/tournaments.service.ts` — current tournament creation path; likely place for orchestration or import trigger.
- `backend/src/tournaments/dto/create-tournament.dto.ts` — would change only if creation accepts reuse input directly.
- `backend/src/tournaments/tournaments.controller.ts` — would expose either a richer create command or a dedicated import endpoint.
- `backend/src/players/players.service.ts` — holds roster creation/linking rules that import logic must preserve.
- `backend/src/database/entities/player.entity.ts` — uniqueness and tournament scoping constrain copy behavior.
- `frontend/src/pages/tournaments/TournamentFormPage.tsx` — current create UX; natural place for an optional “reuse players from” selector.
- `frontend/src/state/AppContext.tsx` — create flow currently calls one API and reloads tournaments.
- `frontend/src/api/client.ts` — needs a new request shape and/or an import API.
- `frontend/src/permissions/tournamentPermissions.ts` — useful for filtering eligible source tournaments to OWNER/ADMIN roles.

### Approaches
1. **Atomic create-and-copy command** — extend `POST /tournaments` with optional source tournament input and copy the roster inside one backend transaction.
   - Pros: Best UX (one submit), atomic success/failure, no empty tournament left behind if copy fails.
   - Cons: Couples basic tournament creation with a heavier domain operation, expands shared contracts/DTOs immediately, more backend branching in a hot path.
   - Effort: Medium

2. **Create tournament, then import roster** — keep `POST /tournaments` simple and add a dedicated endpoint such as `POST /tournaments/:id/import-players` with `{ sourceTournamentId }`; frontend can still present this as one flow.
   - Pros: Cleaner separation of concerns, easier retry/reuse later for existing tournaments, smaller contract blast radius, simpler future extension (dry-run, overwrite rules, selective import).
   - Cons: Two-step backend flow, possible valid-but-empty target tournament if import fails after creation, frontend must manage follow-up error handling.
   - Effort: Medium

3. **Reusable roster templates** — introduce a separate template concept detached from tournaments, then create tournaments from templates.
   - Pros: Most flexible long term, avoids treating old tournaments as ad-hoc templates, opens room for reusable squads independent of season history.
   - Cons: New domain concept, bigger UX/backend scope, overkill for the immediate pain point.
   - Effort: High

### Recommendation
Recommend **Approach 2 with a create-form shortcut**: keep tournament creation unchanged at the domain boundary, add a dedicated roster import command, and let the frontend optionally call it immediately after a successful create when the user selects a source tournament.

Why this direction: it preserves the current simple create contract, keeps roster-copy rules isolated in one place, and supports future reuse beyond initial creation. The import service should run in a transaction and copy only roster data: `name`, `nickname`, `imageUrl`, `favoriteTeamSlug`, `displayPreference`, `role` (with normalization), `ability`, `injury`, `misses`, and `userId` when present. It should never copy `claimCodeHash`, `claimCodeExpiresAt`, matches, teams, or `player_teams` history.

Recommended business rules:
- Source tournament must be accessible by the actor as OWNER/ADMIN, not just member.
- Target tournament actor must be OWNER/ADMIN.
- Existing target owner row created during tournament creation must be kept; if the source contains the same user, merge/skip instead of duplicating.
- Imported source OWNER cannot create a second OWNER in the target; normalize to ADMIN or USER, with creator remaining OWNER.
- Re-import behavior should be explicit: safest default is “skip users already present in target” and fail or report duplicates deterministically.

### Risks
- **Owner collision / unique constraint**: creation auto-adds the target owner, so naive copying can violate `uq_players_user_tournament` or create multiple owners.
- **Permission ambiguity**: regular members cannot read full rosters today; import must enforce source OWNER/ADMIN access server-side.
- **Implicit membership**: copying linked `userId` players auto-adds users to the new tournament without a join request; that is convenient but changes onboarding semantics.
- **Guest portability**: guest players should be copied as guests without stale claim codes; regenerating claim codes on demand is safer than cloning them.
- **No focused test coverage yet**: current repo has no tournament/player service tests covering this flow, so proposal/spec should include backend tests early.

### Ready for Proposal
Yes — proceed with a proposal centered on a dedicated backend roster-import command plus a create-form option to choose a source tournament. The proposal should explicitly define duplicate handling, role normalization, and whether copied linked users are considered immediate members.
