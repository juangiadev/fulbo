# Tasks: Tournament Player Reuse

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend import API + contracts; PR 2 frontend create/import UX |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Ship backend import command and shared contracts | PR 1 | Base = main; includes backend unit/e2e coverage |
| 2 | Ship create-form selector and retryable import messaging | PR 2 | Base = PR 1 branch if chained; manual frontend verification only |

## Phase 1: Backend RED

- [x] 1.1 Add `backend/src/tournaments/tournaments.service.spec.ts` cases for same-source rejection, role normalization, guest claim reset, and linked-user duplicate skipping.
- [x] 1.2 Extend `backend/test/app.e2e-spec.ts` with `POST /api/tournaments/:id/import-players` happy-path and forbidden scenarios.

## Phase 2: Backend GREEN

- [x] 2.1 Create `backend/src/tournaments/dto/import-tournament-players.dto.ts` and wire `POST /tournaments/:id/import-players` in `backend/src/tournaments/tournaments.controller.ts`.
- [x] 2.2 Implement `TournamentsService.importPlayers` in `backend/src/tournaments/tournaments.service.ts` with source/target OWNER|ADMIN checks, same-tournament `400`, and retry-safe `404/403` behavior.
- [x] 2.3 Add transaction-backed roster cloning in `backend/src/tournaments/tournaments.service.ts`, skipping existing `userId` members, downgrading imported OWNER to ADMIN, and clearing guest claim fields.
- [x] 2.4 Extract only the minimal helper needed in `backend/src/players/players.service.ts` if roster cloning would otherwise duplicate guest/player normalization rules.
- [x] 2.5 Add import request/result contracts in `shared/src/contracts.ts` and return deterministic counts from the backend response.

## Phase 3: Backend REFACTOR / Verification

- [x] 3.1 Keep import logic scoped to `backend/src/tournaments/*` and remove any dead branching introduced while making tests pass.
- [x] 3.2 Run backend verification for the new behavior with `pnpm -C backend run test` and `pnpm -C backend run test:e2e`.

## Phase 4: Frontend Integration

- [ ] 4.1 Add `apiClient.importTournamentPlayers` in `frontend/src/api/client.ts` using the shared request/result contracts.
- [ ] 4.2 Extend `createTournament` in `frontend/src/state/AppContext.tsx` to accept optional `sourceTournamentId`, chain import after create, reload tournaments, and surface partial-failure context without deleting the new tournament.
- [ ] 4.3 Update `frontend/src/pages/tournaments/TournamentFormPage.tsx` to offer a source-tournament selector during create, disable invalid self-selection, and show import-in-progress messaging.

## Phase 5: Manual UX Verification

- [ ] 5.1 Manually verify create-only, create+import success, and create-success/import-failure flows in `frontend/src/pages/tournaments/TournamentFormPage.tsx` with backend/frontend dev-auth bypass enabled on both sides when used.
- [ ] 5.2 Resolve the design open question by choosing whether import failure routes to tournament details or stays on the form, then align UI copy/messages in `TournamentFormPage.tsx` and `AppContext.tsx`.
