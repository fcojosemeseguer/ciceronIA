# CiceronAI API v1 Reference

## Base URL

All routes are mounted under `/api/v1` (example: `https://<host>/api/v1/login`).

## Authentication (gradual compatibility)

Protected endpoints now support **both** methods:

1. Recommended: `Authorization: Bearer <access_token>`
2. Legacy (deprecated): `jwt` field in the request body/query

Behavior rules:

- If both are present, **Authorization header wins**.
- If legacy `jwt` is used, response includes deprecation headers:
  - `Deprecation: true`
  - `Sunset: Wed, 30 Sep 2026 23:59:59 GMT`

Standard auth errors:

- `401` invalid/expired/missing token
- `403` authenticated but no access to resource
- `404` resource not found
- `422` validation error

## Core endpoints

### `POST /status`
Health check.

### `GET /debate-types`
List available debate types and summarized configs.

### `POST /login`
Request body: `CredsInput`.
Returns JWT in `access_token`.

### `POST /register`
Request body: `CredsInput`.
Creates user and returns JWT.

### `POST /new-project`
Request body: `NewProjectInfo`.
Auth via header or `jwt` body.
Creates project with debate metadata (`debate_type`, teams, topic).

### `POST /analyse`
`multipart/form-data`:
- `fase` (id or display name)
- `postura`
- `orador`
- `num_speakers`
- `project_code`
- `file` (`.wav`)
- legacy `jwt` optional if no Authorization header

What it does:
- Validates ownership of `project_code`.
- Runs full transcription+metrics+evaluation.
- Persists legacy tables (`analysis`, `audios_transcription`, `audios_metrics`).
- Persists new unified segment snapshot in `project_segments`.

### `POST /quick-analyse`
No project persistence and no auth required.
Accepts `fase` by id or display name.

### `POST /get-projects`
Request body: `AuthDataProjects`

Optional filters:
- `q`
- `debate_type`
- `limit` (default `20`, max `100`)
- `offset` (default `0`)

Response keeps legacy `result` and adds paginated fields:
- `items`, `total`, `limit`, `offset`

### `POST /get-project`
Request body: `AuthDataProject`

Optional dashboard params:
- `include_segments` (`false` by default)
- `include_transcript` (`false` by default)
- `include_metrics` (`false` by default)
- `fase`, `postura`, `orador`
- `limit`, `offset`

Response:
- Keeps legacy payload (`project`, `content`)
- Adds `dashboard` when `include_segments=true`

## Shareable dashboard endpoints

### `POST /projects/{project_code}/share-links`
Create a public read-only link.

Body (`ShareLinkCreateData`):
- `expires_at` optional (default: now + 30 days)
- `allow_full_transcript` (default `false`)
- `allow_raw_metrics` (default `false`)
- legacy `jwt` optional if no Authorization header

Response:
- `share_id`
- `public_url`
- `expires_at`
- `revoked`

### `GET /projects/{project_code}/share-links`
List owner share links for project.
Auth via Authorization header or query `jwt` (legacy).

### `DELETE /projects/{project_code}/share-links/{share_id}`
Revoke share link.
Auth via Authorization header or query `jwt` (legacy).

### `GET /public/dashboard/{token}`
Public read-only endpoint (no user auth).

Optional query filters:
- `fase`, `postura`, `orador`
- `limit`, `offset`

Returns:
- `project`
- `summary` (aggregated scores)
- `segments` (paginated)

Public safeguards:
- Revoked link => `410 Gone`
- Expired link => `410 Gone`
- Missing link => `404`
- Basic in-memory rate limit

## Unified segment shape (`project_segments`)

Each analysis stores one segment snapshot with:

- `segment_id`
- `project_code`
- `user_code`
- `debate_type`
- `fase_id`, `fase_nombre`
- `postura`, `orador`
- `num_speakers`
- `duration_seconds`
- `transcript`, `transcript_preview`
- `metrics_summary`, `metrics_raw`
- `analysis`:
  - `criterios`
  - `total`
  - `max_total`
  - `score_percent`
- `created_at`

## Share link storage shape (`project_share_links`)

- `share_id`
- `project_code`
- `owner_user_code`
- `token_hash` (token is never stored in plain text)
- `token_prefix`
- `allow_full_transcript`
- `allow_raw_metrics`
- `expires_at`
- `revoked`
- `created_at`
- `revoked_at`
