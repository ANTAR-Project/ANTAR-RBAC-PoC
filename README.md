# ANTAR Auth PoC — WebAuthn Biometric Auth + RBAC

Standalone microservice for testing fingerprint/FaceID (WebAuthn/FIDO2) login,
role-based access, and mandatory step-up biometric verification for sensitive
actions — before wiring it into the main ANTAR/HEARTH docker-compose stack.

## What's here

- `auth-service`: Spring Boot 3 / Java 21 service on port **8085**
- Postgres for identity data (users, credentials, resource permissions)
- Flyway migration seeding one `admin` user
- A zero-build-step HTML test console (`frontend/test-auth.html`)

## Prerequisites

- Docker + Docker Compose
- A browser with WebAuthn support (recent Chrome/Edge/Safari) on a device with
  a fingerprint reader, Face ID, Windows Hello, or Android biometrics
- Something to serve the static HTML file on `localhost:5500` — e.g. VS Code's
  "Live Server" extension, or `python3 -m http.server 5500` from the `frontend/` folder

**Important:** WebAuthn only works over `localhost` or HTTPS. Don't try this
over a LAN IP (e.g. `192.168.x.x`) until you've put TLS in front of it.

## Run it

```bash
cp .env.example .env
# edit .env: set DB_PASSWORD and JWT_SIGNING_SECRET (openssl rand -base64 48)

docker compose up --build
```

Then serve the frontend:

```bash
cd frontend
python3 -m http.server 5500
```

Open `http://localhost:5500/test-auth.html`.

## Test sequence

1. **Register** — click "Register", your browser will prompt for
   fingerprint/FaceID/Windows Hello. This links a WebAuthn credential to the
   `admin` user seeded by the Flyway migration.
2. **Login** — click "Login", touch again. You'll get back a session JWT
   (`role: ADMIN`).
3. **Role-gated calls** — `/demo/whoami` works for anyone logged in;
   `/demo/admin-only` requires the `ADMIN` role, no extra touch needed.
4. **Step-up gated call** — calling `/demo/sensitive-action` without a fresh
   assertion returns `403 STEP_UP_REQUIRED`. Clicking "Step up + retry"
   triggers a second biometric prompt, mints a 60-second single-purpose
   assertion, and the retried call succeeds.

## Testing a second, non-admin user

Register a second username (e.g. `alice`) via the same flow — it auto-creates
a `USER`-role account. `alice` will get `403` on `/demo/admin-only` and
`/demo/sensitive-action`, which confirms the RBAC + step-up gates are both
actually enforcing something, not just decorative.

To grant `alice` per-resource access (e.g. streaming one specific movie once
this is wired into `streaming-service`), an admin session can call:

```
POST /permissions/grant?username=alice&resourceId=movie-001&permission=STREAM
Authorization: Bearer <admin session JWT>
```

## Testing the ownership + deletion decision tree (from the flow diagram)

Migration `V2` seeds:
- `admin` owns `movie-001`, marked **general/non-private** — any `USER` should reach it.
- `alice` (a plain `USER`) owns `alice-private-video`, marked **private**.

Register WebAuthn credentials for both `admin` and `alice` first (or set a
backup password for `alice` via `POST /auth/password/set?username=alice&password=...`
if you don't want a second biometric device involved).

Log in as `alice`, then:

```
GET /files/access-check?resourceId=movie-001&action=STREAM
→ 200 GRANTED_GENERAL          (general content, any USER gets it)

GET /files/access-check?resourceId=alice-private-video&action=STREAM
→ 200 GRANTED_OWN_PRIVATE      (alice owns it)

DELETE /files/delete?resourceId=alice-private-video
  (no X-Step-Up-Assertion header)
→ 403 STEP_UP_REQUIRED         (deletion is always Sensitive, even for your own file)

  [do the step-up ceremony for action=DELETE_FILE, retry with the header]
→ 200 "File deleted (step-up verified)"
```

Log in as a second account you register with `Role.GUEST` manually in
Postgres (there's no self-service signup for guests, matching "preset access,
defined by User/Admin" in the diagram) and confirm `movie-001` returns
`403 DENIED_NO_GRANT` until an admin runs:

```
POST /permissions/grant?username=<guest>&resourceId=movie-001&permission=STREAM
Authorization: Bearer <admin session JWT>
```

## What's intentionally NOT in this service

- **NAS connectivity check** — that's `nas-orchestrator`'s job; it's the only
  service that knows if the SMB mount is actually reachable. The intended
  call order once integrated is: `nas-orchestrator` confirms connectivity →
  then calls into this permission logic → then serves the file.
- **Stateless vs. Stateful session** — the diagram poses this as an open
  question ("Even faster being logged in - Stateless? Stateful?"). This PoC
  is fully stateless (self-contained JWTs, no server-side session store),
  which is simpler to scale across your multiple microservices. A stateful
  option (session IDs backed by Redis) would let you revoke a session
  instantly instead of waiting for JWT expiry, at the cost of every service
  needing to hit Redis on each request — worth deciding once you have a
  concrete need to force-logout a device.

## Next steps (once this works standalone)

See the accompanying `antar-auth-service-architecture.md` for:
- extracting `security/` + `service/TokenService.java` into a shared
  `antar-auth-commons` library
- wiring `@RequiresBiometric` into `nas-orchestrator`'s delete/admin endpoints
- wiring `PermissionService`-style checks into `streaming-service`'s
  `/api/v1/stream/{movieId}`
- merging `auth-db` + `auth-service` into the main `antar-network`
  docker-compose file
