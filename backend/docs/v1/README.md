# CiceronAI API v1 Reference

## Base URL

All routes are mounted under `/api/v1` (e.g., `https://<host>/api/v1/login`).

## Authentication

- **Login (`POST /login`)** and **register (`POST /register`)** both return a JWT in the `access_token` field.
- The token is signed with HS256 and the `SECRET_KEY` loaded from the environment.
- All subsequent endpoints expect the token to be provided inside the request body (`jwt` field) and do not read it from headers.

## Data models used by the client

| Model | Fields | Notes |
| --- | --- | --- |
| `CredsInput` | `user` (alphanumeric/underscore, 3‑20 chars)<br>`pswd` (alphanumeric/underscore, 8‑32 chars, must include letters and digits) | Used for login/register requests. |
| `NewProjectInfo` | `name` (1‑32 chars)<br>`description` (0‑128 chars)<br>`jwt` | Create project payload. |
| `AnalyseData` | `fase`, `postura`, `orador`, `num_speakers`, `jwt`, `project_code`, `file` (.wav via multipart) | Phase must be one of Introducción, Refutación 1/2, Conclusión, Final; posture must be A Favor/En Contra. |
| `AuthData` | `jwt` | Used to fetch projects. |
| `AuthDataProject` | `jwt`, `project_code` | Used to fetch a single project. |

## Endpoints

### `GET /status`
- **Purpose:** health check for the API.
- **Response:** `200` with `{"message": "ciceron is running"}`.

### `POST /login`
- **Request body:** `CredsInput`.
- **Success response (`200`):**
  ```json
  {
    "message": "login done!",
    "access_token": "<jwt>",
    "token_type": "bearer",
    "user": "<username>"
  }
  ```
- **Errors:** `401` when credentials are incorrect.

### `POST /register`
- **Request body:** `CredsInput`.
- **Success response (`200`):** same payload as login (new user, JWT returned).
- **Errors:** `400` when the user already exists or input fails validation.

### `POST /new-project`
- **Request body:** `NewProjectInfo`.
- **Behavior:** the JWT is decoded to recover `user_code`; a project code is generated via UUID and stored.
- **Success response (`200`):** `{"message": "project created", "project_code": "<uuid>"}`.
- **Errors:** `400` when JWT decoding fails or payload invalid.

### `POST /analyse`
- **Request:** `multipart/form-data` created via `AnalyseData.as_form()`. Fields:
  - `fase`: must be `Introducción`, `Refutación 1`, `Refutación 2`, `Conclusión`, or `Final`.
  - `postura`: `A Favor` or `En Contra`.
  - `orador`: string.
  - `num_speakers`: number of speakers expected.
  - `jwt`: valid token for the project owner.
  - `project_code`: UUID created in `/new-project`.
  - `file`: `.wav` file (mime `audio/wav`, `audio/x-wav`, or `audio/wave`).
- **Processing:** saves upload, runs `process_complete_analysis`, extracts transcript and metrics, evaluates via the debate pipeline, stores analysis.
- **Success response (`200`):**
  ```json
  {
    "message": "analysis succeeded!",
    "fase": "Introducción",
    "postura": "A Favor",
    "orador": "",
    "criterios": [
      {"criterio": "<name>", "nota": <score>, "anotacion": ""}
    ],
    "total": <sum of notes>,
    "max_total": <max possible>
  }
  ```
- **Errors:**
  - `500` if any step fails (file validation, analysis pipeline, DB insert).
  - Input validation errors for invalid phases/postures or non-wav files raise `HTTPException` with details.

### `POST /get-projects`
- **Request body:** `AuthData`.
- **Success response (`200`):**
  `{"message": "here are your projects", "result": [<projects>]}` where each entry contains at least `name`, `desc`, `user_code`, and `code`.
- **Errors:** `401` if JWT decoded user cannot be located.

### `POST /get-project`
- **Request body:** `AuthDataProject`.
- **Success response (`200`):**
  `{"message": "here is project <project_code>", "content": [<analysis records>]}`.
- **Errors:** `500` on failure (e.g., invalid token, missing project); the exception is logged and `HTTPException(500)` is raised.

## Notes for clients

1. Tokens live in the `jwt` field, not headers. Keep the same token for all protected routes until expiration (~60 minutes).
2. Uploaded WAV files are temporary—after processing the file is removed.
3. The response structure for `/get-project` is whatever is stored in `analysis_table`, so expect each record to mirror the object saved in `create_analysis()` (project_code, fase, postura, orador, criterios, total, max_total).
