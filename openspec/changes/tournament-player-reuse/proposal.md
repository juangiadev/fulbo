# Proposal: Tournament Player Reuse

## Intent

Let tournament creators reuse a prior roster when creating a new tournament, without copying match/team history or stale claim data.

## Scope

### In Scope
- Add a dedicated backend roster-import command for an existing target tournament.
- Add create-form UX to optionally choose a source tournament and trigger the import right after successful creation.
- Define duplicate handling, role normalization, and permission rules for copied linked and guest players.

### Out of Scope
- Reusable roster templates outside tournaments.
- Copying matches, teams, player-team history, invites, or claim codes.

## Capabilities

### New Capabilities
- `tournament-roster-reuse`: Import a source tournament roster into another tournament with permission checks, duplicate skipping, and role normalization.

### Modified Capabilities
- None.

## Approach

Keep `POST /tournaments` unchanged. Add `POST /tournaments/:id/import-players` with `{ sourceTournamentId }`, executed in a transaction. After tournament creation, the frontend may call this endpoint as a guided shortcut. Copy roster fields only; preserve the new tournament creator as OWNER, downgrade imported OWNER records to ADMIN, skip already-present linked users, and copy guests without claim metadata.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/tournaments/tournaments.controller.ts` | Modified | Expose roster-import endpoint. |
| `backend/src/tournaments/tournaments.service.ts` | Modified | Orchestrate target/source validation and transaction boundary. |
| `backend/src/players/players.service.ts` | Modified | Reuse player creation rules for cloned roster rows. |
| `backend/src/database/entities/player.entity.ts` | Existing constraint | Enforce duplicate-safe behavior around `uq_players_user_tournament`. |
| `frontend/src/pages/tournaments/TournamentFormPage.tsx` | Modified | Add optional “reuse players from” selector. |
| `frontend/src/state/AppContext.tsx` | Modified | Chain create + optional import + reload. |
| `frontend/src/api/client.ts` | Modified | Add import-roster API call. |
| `shared/src/contracts.ts` | Possible Modified | Centralize request/summary contract only if shared typing is required. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Owner/duplicate collisions | Med | Skip same `userId`, keep creator as only OWNER. |
| Unauthorized roster copying | Med | Require OWNER/ADMIN on source and target server-side. |
| Empty target after failed import | Low | Surface clear error and keep import retryable. |

## Rollback Plan

Remove the import endpoint and form option, leaving base tournament creation unchanged. Imported players can be deleted through existing player-management flows if rollback happens after partial adoption.

## Dependencies

- Existing tournament membership/role checks in backend services.
- Backend Jest coverage for the new import flow before implementation is considered complete.

## Success Criteria

- [ ] OWNER/ADMIN can create a tournament and optionally import a prior roster in the same UX flow.
- [ ] Imported roster excludes matches, teams, player-team history, and claim-code data.
- [ ] Duplicate linked users are skipped deterministically and imported OWNER roles do not create a second OWNER.
