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

## Features (Planned)

- [x] Project setup
- [ ] Game engine (Texas Hold'em)
- [ ] Real-time multiplayer (WebSocket)
- [ ] Game code system
- [ ] Clubs and invitations
- [ ] Player statistics
- [ ] Seed players for testing
- [ ] Authentication (future)

## License

ISC

