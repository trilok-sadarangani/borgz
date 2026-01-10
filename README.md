# Borgz - Poker Application

A React Native (Expo) poker application supporting multiple poker variants, clubs, and real-time multiplayer gameplay.

## Project Structure

```
borgz/
├── client/          # React Native (Expo) app - iOS & Web
├── backend/         # Node.js/TypeScript server
└── shared/          # Shared TypeScript types
```

## Tech Stack

### Frontend
- React Native (Expo)
- Expo Router (navigation)
- Zustand (state management)
- Socket.io-client (WebSocket)
- @tanstack/react-query (data fetching)

### Backend
- Node.js + TypeScript
- Express.js (REST API)
- Socket.io (WebSocket)
- PostgreSQL (future)
- Redis (future)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (optional, can use npx)

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The server will run on `http://localhost:3001`

### Client Setup

```bash
cd client
npm install
npm start
```

Then:
- Press `i` for iOS simulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

## Development

### Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run Jest test suite
- `npm run test:coverage` - Run tests with coverage
- `npm run test:db` - Run tests that require a real database (sets `RUN_DB_TESTS=true`)

### Client Scripts
- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser

## Testing Strategy

This project follows a layered approach (fast tests at the bottom, higher confidence tests at the top). Each layer catches a different class of bugs.

### 1) Unit tests (logic)

**What**: Test pure functions / game logic with no I/O.
**Catch**: rule edge-cases, regressions, determinism issues.

- **Where**: `backend/src/game/**/__tests__/*`, `backend/src/utils/**/__tests__/*`
- **Run**:
  - `cd backend && npm test`

### 2) Component tests (UI pieces)

**What**: Test a React/Vue component + interactions without the whole backend.
**Catch**: rendering glitches, state bugs, bad disabled/enabled states.

Poker examples:
- **Action buttons enable/disable rules**
- **Bet slider input validation**
- **“It’s your turn” indicator updates correctly**

- **Status in this repo**: not wired up yet on the Expo client (no Jest/Testing Library setup under `client/`).
- **Suggested setup**: Jest + React Native Testing Library (component + hook interactions), with API/socket calls mocked at the boundary.

### 3) API / Integration tests (backend with real dependencies or close to real)

**What**: Hit HTTP endpoints (or service functions) with a real DB (often a test DB / container).
**Catch**: auth/permissions, DB constraints, serialization, “works locally but not wired right”.

Poker examples:
- **Join table / leave table**
- **Start hand only when conditions met (enough players, everyone ready)**
- **Posting blinds and creating a hand is atomic (no duplicate hands)**

- **Where**: `backend/src/routes/__tests__/*`, `backend/src/services/__tests__/*`
- **DB-backed tests**: guarded by `RUN_DB_TESTS=true` (see `backend/src/services/__tests__/dbPersistenceService.test.ts`)
- **Run**:
  - Unit + integration (in-memory/mocked deps): `cd backend && npm test`
  - DB integration (requires a Postgres DB): `cd backend && npm run test:db`
    - If you want a local DB quickly: `docker compose up -d db` (see `docker-compose.yml`)

Opinion: these pay off huge for full-stack apps because most bugs are “the glue”.

### 4) Contract tests (frontend ↔ backend agreement)

**What**: Ensure request/response shapes don’t drift.
**Catch**: “frontend expects seatId but backend sends seat_id” / missing fields / wrong enum values.

Poker examples:
- **GameState schema (players, stacks, pot, current street, whose turn)**
- **Event payloads for real-time updates**

- **Status in this repo**: the primary contract is TypeScript types in `shared/types/*` (compile-time).
- **Typical next step**: add runtime schema validation (e.g., JSON Schema or Zod) and assert backend responses + client decodes match.

### 5) End-to-end (E2E) tests (slow, but highest confidence)

**What**: Drive the app like a user (browser automation).
**Catch**: broken flows across UI + API + DB + auth.

Poker flows to automate:
- **Create club → create table → invite/join → sit → start hand → play a few actions → showdown → balances update**
- **Reconnect / refresh mid-hand and state recovers**
- **Two players act “at the same time” and server resolves correctly**

Opinion: do a small number of E2Es for critical flows. Don’t try to E2E everything.

- **Status in this repo**: not set up yet.
- **Typical tooling**:
  - Web: Playwright (drives `client` on web)
  - Native: Detox (drives iOS/Android)

### 6) Real-time / WebSocket tests (poker-specific)

**What**: Test event ordering, delivery, and state sync.
**Catch**: out-of-order events, double-processing, ghost turns, desync between clients.

Poker examples:
- **When Player A bets, Player B receives update before being allowed to act**
- **Reconnect sends a full state snapshot, not just incremental events**
- **Duplicate event IDs don’t apply twice**

- **Where**: `backend/src/sockets/__tests__/gameSocket.integration.test.ts`

## Environment Variables

Create a `.env` file in the `backend` directory:

```
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:8081
```

## Auth0 (optional)

This repo currently supports two auth modes:
- Dev seed auth (default): in-memory tokens from `/api/auth/login`
- Auth0 JWT auth: backend verifies Auth0 access tokens (RS256) via JWKS

### Backend (Auth0 JWT verification)
Set these env vars (e.g. in `backend/.env` or your docker compose env):

```
AUTH0_DOMAIN=YOUR_TENANT.us.auth0.com
AUTH0_AUDIENCE=api.borgz.com
# Optional (defaults to https://AUTH0_DOMAIN/):
AUTH0_ISSUER=https://YOUR_TENANT.us.auth0.com/
```

Notes:
- `AUTH0_AUDIENCE` must match an **Auth0 API Identifier** in your tenant.
  - In Auth0 Dashboard: **Applications → APIs → Create API**
  - Set **Identifier** to exactly your audience value (e.g. `borgz.com` or `https://borgz.com`)

### Client (Expo)
You can set these either:
- in `client/app.json` under `expo.extra` (recommended, “project settings”), or
- as Expo public env vars (handy overrides per environment).

Env var option (e.g. in your shell when running Expo):

```
EXPO_PUBLIC_AUTH0_DOMAIN=dev-hl2hhkyfntxf14em.us.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=aP8oDBwbFtJLSxJZOHQ1AUEdOgwHtKGG
EXPO_PUBLIC_AUTH0_AUDIENCE=api.borgz.com
```

Notes:
- The app uses the Expo scheme `borgz` (see `client/app.json`) for redirects.
- Auth0 users are represented in-app by `sub` (stored as `player.id`).

## Features (Planned)

- [x] Project setup
- [ ] Game engine (Texas Hold'em)
- [ ] Real-time multiplayer (WebSocket)
- [ ] Game code system
- [ ] Clubs and invitations
- [ ] Player statistics
- [x] Seed players for testing
- [ ] Authentication (future)

## License

ISC

