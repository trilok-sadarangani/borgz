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

### Client Scripts
- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser

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
AUTH0_AUDIENCE=borgz.com
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
EXPO_PUBLIC_AUTH0_AUDIENCE=borgz.com
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

