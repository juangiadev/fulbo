# Tournament Roster Reuse Specification

## Purpose

This capability affects backend and frontend. It allows an existing target tournament to reuse a source tournament roster without copying matches, teams, player-team history, invites, or claim metadata.

## Requirements

### Requirement: Authorized roster import

The system MUST allow roster import only when the requester is OWNER or ADMIN in both the source tournament and the target tournament, and both tournaments already exist.

#### Scenario: Authorized member imports a roster

- GIVEN a requester is OWNER or ADMIN in an existing source tournament and target tournament
- WHEN the requester submits a roster import for the target tournament with a valid `sourceTournamentId`
- THEN the system accepts the import request for processing

#### Scenario: Unauthorized member is rejected

- GIVEN a requester is missing OWNER or ADMIN access in either the source or target tournament
- WHEN the requester submits a roster import request
- THEN the system rejects the request and leaves the target roster unchanged

### Requirement: Normalized roster copy

The system MUST copy only roster membership data from the source tournament into the target tournament. The system MUST preserve the target creator as the only OWNER, MUST downgrade imported OWNER memberships to ADMIN, MUST skip linked users already present in the target tournament, and MUST copy guest players without claim codes or stale claim state.

#### Scenario: Import copies eligible players with normalized roles

- GIVEN the source roster contains linked players, guest players, and an OWNER membership
- WHEN the import succeeds
- THEN linked and guest players are added to the target roster, imported OWNER memberships become ADMIN, and non-roster data is not copied

#### Scenario: Import skips linked-user duplicates deterministically

- GIVEN the target roster already contains a linked user from the source roster
- WHEN the import runs
- THEN that linked user is skipped without creating a duplicate tournament membership

### Requirement: Guided create-and-import flow

The system SHOULD let tournament creation flows optionally trigger roster import immediately after successful target tournament creation. If the import fails, the system MUST keep the new tournament created, MUST report the import failure clearly, and MUST keep the import action retryable for that target tournament.

#### Scenario: Creator reuses a prior roster during creation

- GIVEN a creator chooses a source tournament while creating a new tournament
- WHEN the new tournament is created successfully and the follow-up import succeeds
- THEN the system shows the new tournament with the imported roster applied

#### Scenario: Creation succeeds but import fails

- GIVEN a creator chooses a source tournament during creation
- WHEN the new tournament is created successfully but the import request fails
- THEN the new tournament still exists and the user receives a clear retryable import error
