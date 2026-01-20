# 🃏 Borgz - Multiplayer Poker Platform

A modern, real-time multiplayer poker platform built with React Native, featuring stunning visual effects and seamless cross-platform support.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Game Design](#game-design)
- [UI/UX Design](#uiux-design)
- [Setup & Installation](#setup--installation)
- [Development](#development)
- [API Documentation](#api-documentation)

---

## 🎯 Overview

Borgz is a full-stack poker application that enables players to:
- Create and join real-time poker games
- Form and manage poker clubs
- Track game history and statistics
- Play on web, iOS, and Android from a single codebase

### Key Highlights
- **Real-time Multiplayer**: WebSocket-based gameplay with Socket.IO
- **Cross-Platform**: React Native for mobile, React Native Web for browser
- **Beautiful UI**: Aurora effects, MagicBento navigation, and modern animations
- **Secure Authentication**: Auth0 integration with JWT tokens
- **Persistent Data**: PostgreSQL with Prisma ORM

---

## 🛠 Tech Stack

### Frontend (Client)
- **Framework**: React Native 0.81.5 + Expo 54
- **Navigation**: Expo Router 6
- **State Management**: Zustand 5
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Real-time**: Socket.IO Client 4.8
- **Authentication**: Expo Auth Session + Auth0
- **Storage**: AsyncStorage (mobile), localStorage (web)

### Backend (Server)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **Real-time**: Socket.IO 4.8
- **Database**: PostgreSQL 
- **ORM**: Prisma 7
- **Authentication**: Auth0 with Jose (JWT)
- **Development**: Nodemon + ts-node

### Infrastructure
- **Database**: PostgreSQL (via Prisma)
- **Containerization**: Docker + Docker Compose
- **Deployment**: Render (configured via render.yaml)

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
├─────────────┬──────────────┬─────────────────────────────┤
│   Web App   │   iOS App    │      Android App            │
│ (Browser)   │  (Native)    │      (Native)               │
└──────┬──────┴──────┬───────┴──────────┬──────────────────┘
       │             │                  │
       │         React Native Web / Native
       │             │                  │
       └─────────────┴──────────────────┘
                     │
            ┌────────▼────────┐
            │  Expo Router    │
            │  (Navigation)   │
            └────────┬────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
   ┌───▼────┐              ┌──────▼─────┐
   │ Zustand│              │ Socket.IO  │
   │ Stores │              │   Client   │
   └───┬────┘              └──────┬─────┘
       │                          │
       │      REST API + WebSocket│
       └────────────┬─────────────┘
                    │
         ┌──────────▼──────────┐
         │   BACKEND SERVER    │
         ├─────────────────────┤
         │  Express + Socket.IO│
         └──────────┬──────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
   ┌───▼────┐              ┌─────▼─────┐
   │ Prisma │              │   Auth0   │
   │  ORM   │              │   (JWT)   │
   └───┬────┘              └───────────┘
       │
   ┌───▼────────┐
   │ PostgreSQL │
   └────────────┘
```

### Data Flow

#### Game Creation & Join Flow
```
1. Player → Create Game Request → Backend
2. Backend → Generate Game Code → Save to Memory/DB
3. Backend → Return Game Code → Player
4. Player enters Buy-in Amount
5. Player → Join Game (Code + Buy-in) → Backend
6. Backend → Validate & Add Player → Game State
7. Backend → Emit Game State → All Players (Socket.IO)
8. Players receive updated state → UI Updates
```

#### Real-time Game Flow
```
Player Action (Bet/Fold/Call)
    ↓
Socket.IO Client Emit
    ↓
Backend Game Engine
    ↓
Validate Action
    ↓
Update Game State
    ↓
Calculate Next State
    ↓
Broadcast to All Players
    ↓
UI Updates (All Connected Players)
```

---

## 📁 Project Structure

```
borgz/
├── backend/                      # Node.js/Express server
│   ├── src/
│   │   ├── game/                 # Game engine & logic
│   │   │   ├── engine.ts         # Core game state machine
│   │   │   ├── rules.ts          # Poker rules & validation
│   │   │   ├── utils/
│   │   │   │   ├── cards.ts      # Card deck management
│   │   │   │   └── handEvaluation.ts  # Hand ranking logic
│   │   │   └── variants/
│   │   │       └── texasHoldem.ts     # Texas Hold'em implementation
│   │   ├── routes/               # Express routes
│   │   │   ├── authRoutes.ts     # Auth endpoints
│   │   │   ├── gameRoutes.ts     # Game CRUD
│   │   │   ├── clubRoutes.ts     # Club management
│   │   │   ├── statsRoutes.ts    # Player statistics
│   │   │   └── historyRoutes.ts  # Game history
│   │   ├── services/             # Business logic
│   │   │   ├── gameService.ts    # Game management
│   │   │   ├── clubService.ts    # Club operations
│   │   │   ├── statsService.ts   # Statistics calculations
│   │   │   └── dbPersistenceService.ts  # Database operations
│   │   ├── sockets/              # Socket.IO handlers
│   │   │   └── gameSocket.ts     # Real-time game events
│   │   ├── middleware/           # Express middleware
│   │   │   ├── requireAuth.ts    # Auth0 JWT validation
│   │   │   ├── errorHandler.ts   # Error handling
│   │   │   └── requestLogger.ts  # Logging
│   │   ├── types/                # TypeScript types
│   │   └── server.ts             # App entry point
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # DB migrations
│   └── package.json
│
├── client/                       # React Native app
│   ├── app/                      # Expo Router pages
│   │   ├── (tabs)/               # Tab navigation screens
│   │   │   ├── index.tsx         # Lobby (mobile)
│   │   │   ├── index.web.tsx     # Home with MagicBento (web)
│   │   │   ├── game.tsx          # Active game screen
│   │   │   ├── clubs.tsx         # Clubs management
│   │   │   ├── profile.tsx       # Stats & history
│   │   │   ├── plus.tsx          # Premium features
│   │   │   └── _layout.tsx       # Tab layout
│   │   ├── club/
│   │   │   └── [clubId].tsx      # Club detail page
│   │   ├── history/
│   │   │   └── game/
│   │   │       └── [gameId].tsx  # Game replay
│   │   ├── login.tsx             # Auth screen
│   │   └── _layout.tsx           # Root layout
│   ├── components/               # Reusable components
│   │   ├── Aurora.tsx            # WebGL aurora background
│   │   ├── MagicBento.tsx        # Interactive bento cards
│   │   ├── PlayingCard.tsx       # Poker card component
│   │   ├── GameChat.tsx          # In-game chat
│   │   ├── BuyInModal.tsx        # Buy-in prompt
│   │   ├── GameSettingsForm.tsx  # Game configuration
│   │   ├── WebHomePage.tsx       # Web layout wrapper
│   │   └── LoadingScreen.tsx     # Loading states
│   ├── store/                    # Zustand state stores
│   │   ├── authStore.ts          # Authentication state
│   │   ├── gameStore.ts          # Active game state
│   │   ├── clubStore.ts          # Clubs data
│   │   ├── chatStore.ts          # Chat messages
│   │   ├── historyStore.ts       # Game history
│   │   └── statsStore.ts         # Player stats
│   ├── services/                 # API & Socket clients
│   │   ├── api.ts                # REST API client
│   │   ├── socket.ts             # Socket.IO client
│   │   └── runtimeConfig.ts      # Environment config
│   └── package.json
│
├── shared/                       # Shared TypeScript types
│   ├── types/
│   │   ├── game.types.ts         # Game state types
│   │   ├── club.types.ts         # Club types
│   │   └── player.types.ts       # Player types
│   └── auth0Diagnostics.ts       # Auth debugging
│
├── docker-compose.yml            # Local development setup
├── render.yaml                   # Deployment configuration
└── README.md                     # This file
```

---

## ✨ Features

### 🎮 Core Gameplay
- **Texas Hold'em Poker**: Full implementation with proper hand evaluation
- **Real-time Multiplayer**: Live gameplay with instant state synchronization
- **Game Modes**:
  - Quick Play: Instant game with default settings
  - Custom Games: Configure blinds, buy-ins, and rules
  - Private Games: Join via unique game codes

### 🏠 Club System
- Create and manage poker clubs
- Invite members via club codes
- Club-specific games and leaderboards
- Member management and permissions

### 📊 Statistics & History
- Detailed game history with hand-by-hand replay
- Player statistics:
  - Win rate
  - Total hands played
  - Biggest wins/losses
  - Profit tracking
- Club leaderboards

### 🎨 UI Features
- **Aurora Background**: WebGL-powered animated gradients
- **MagicBento Navigation**: Interactive bento box grid with:
  - Border glow effects
  - 3D tilt on hover
  - Particle burst animations
  - Spotlight tracking
- **Responsive Design**: Adapts to mobile, tablet, and desktop
- **Dark Theme**: Easy on the eyes during long sessions

### 🔐 Authentication
- Auth0 integration
- Social login (Google, Apple)
- Email/password authentication
- Persistent sessions with automatic token refresh

---

## 🎲 Game Design

### Game Engine Architecture

The game engine is built on a **state machine** pattern:

```typescript
GameState = {
  code: string              // Unique game identifier
  players: Player[]         // All players in game
  settings: GameSettings    // Game configuration
  currentRound: Round       // Active round state
  deck: Card[]             // Shuffled deck
  communityCards: Card[]   // Board cards
  pot: number              // Total pot
  currentBet: number       // Current bet to match
  turn: string             // Current player ID
  phase: GamePhase         // Current game phase
}

GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
```

### Game Flow

1. **Waiting Phase**
   - Host creates game with settings
   - Players join with buy-in amounts
   - Host starts when ready

2. **Pre-flop**
   - Blinds posted (small blind, big blind)
   - 2 hole cards dealt to each player
   - Betting round (fold, call, raise)

3. **Flop**
   - 3 community cards revealed
   - Betting round

4. **Turn**
   - 4th community card revealed
   - Betting round

5. **River**
   - 5th community card revealed
   - Final betting round

6. **Showdown**
   - Remaining players reveal cards
   - Hand evaluation determines winner(s)
   - Pot distributed
   - New round begins or game ends

### Hand Evaluation

Uses a **7-card evaluator** (2 hole + 5 community):
- Royal Flush: 10, J, Q, K, A of same suit
- Straight Flush: 5 consecutive cards, same suit
- Four of a Kind: 4 cards of same rank
- Full House: 3 of a kind + pair
- Flush: 5 cards of same suit
- Straight: 5 consecutive cards
- Three of a Kind: 3 cards of same rank
- Two Pair: 2 different pairs
- Pair: 2 cards of same rank
- High Card: Highest single card

### Action Validation

All actions validated server-side:
- Player is in the game
- It's the player's turn
- Player has sufficient chips
- Action is valid for current phase
- Bet amounts meet minimum requirements

---

## 🎨 UI/UX Design

### Design System

#### Color Palette
```css
/* Primary Colors */
--purple-primary: rgba(132, 0, 255, 1);
--purple-glow: rgba(132, 0, 255, 0.2);
--background-dark: #060010;
--border-color: #392e4e;

/* Semantic Colors */
--success: #22c55e (Green - Call, Join)
--danger: #ef4444 (Red - Fold, Logout)
--warning: #f59e0b (Orange - Raise)
--info: #3b82f6 (Blue - Info)
```

#### Typography
- **Headings**: System font, 900 weight
- **Body**: System font, 300-600 weight
- **Monospace**: Game codes, chip counts

### Component Architecture

#### Aurora Background
- WebGL-based animated gradient
- Uses OGL library for performance
- Simplex noise for organic motion
- Configurable color stops and speed

#### MagicBento Grid
- CSS Grid with responsive breakpoints
- Interactive hover effects:
  - Mouse position tracking
  - Border glow (radial gradient)
  - 3D tilt transform
  - Particle effects on click
- Bento box layout (varied card sizes)

#### Playing Cards
- SVG-based for crisp rendering
- Suit colors (red/black)
- Card flip animations
- Responsive sizing

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  - Single column layout
  - Larger touch targets
  - Simplified animations
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  - 2 column grid
  - Moderate animations
}

/* Desktop */
@media (min-width: 1025px) {
  - 6 column bento grid
  - Full effects enabled
  - Optimized for mouse interaction
}
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Docker (optional, for local DB)

### Environment Setup

#### Backend `.env`
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/borgz"

# Auth0
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_AUDIENCE="your-api-identifier"

# Server
PORT=3001
CORS_ORIGIN="http://localhost:8081"

# Optional: Database Persistence
ENABLE_DB_PERSISTENCE=false
```

#### Client Environment
Update `client/services/runtimeConfig.ts`:
```typescript
export const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  return 'http://localhost:3001'; // Or your backend URL
};

export const getAuth0Config = () => ({
  domain: 'your-domain.auth0.com',
  clientId: 'your-client-id',
  audience: 'your-api-identifier',
});
```

### Installation

```bash
# Clone repository
git clone <repo-url>
cd borgz

# Install backend dependencies
cd backend
npm install
npx prisma generate
npx prisma db push

# Install client dependencies
cd ../client
npm install

# Start development servers
# Terminal 1 (Backend)
cd backend
npm run dev

# Terminal 2 (Client Web)
cd client
npm run web

# Terminal 3 (Client Mobile - optional)
cd client
npm run ios     # iOS
npm run android # Android
```

### Database Setup (Docker)

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Run migrations
cd backend
npx prisma migrate dev
```

---

## 💻 Development

### Running the App

#### Web Development
```bash
# Start both servers
cd backend && npm run dev &
cd client && npm run web &

# Access at http://localhost:8081
```

#### Mobile Development
```bash
# iOS
cd client && npm run ios

# Android
cd client && npm run android
```

### Testing

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Client tests (if configured)
cd client
npm test
```

### Code Quality

```bash
# Lint backend
cd backend
npm run lint

# Format code
npm run format
```

---

## 📡 API Documentation

### REST Endpoints

#### Authentication
```
POST /api/auth/login
  Body: { accessToken: string }
  Returns: { token: string, player: Player }
```

#### Games
```
POST /api/games
  Body: { settings?: GameSettings }
  Returns: { code: string }

GET /api/games/:code
  Returns: GameState

POST /api/games/:code/join
  Body: { playerId: string, playerName: string, buyIn: number }
  Returns: GameState
```

#### Clubs
```
POST /api/clubs
  Body: { name: string, description?: string }
  Returns: Club

GET /api/clubs/:clubId
  Returns: Club

POST /api/clubs/:clubId/join
  Body: { playerName: string }
  Returns: Club
```

#### Statistics
```
GET /api/stats/player/:playerId
  Returns: { wins, losses, handsPlayed, totalProfit }
```

### Socket.IO Events

#### Client → Server
```typescript
'join-game': { code: string, playerId: string }
'player-action': { gameCode: string, playerId: string, action: Action }
'leave-game': { code: string, playerId: string }
'send-message': { gameCode: string, playerId: string, message: string }
```

#### Server → Client
```typescript
'game-state': GameState
'game-error': { message: string }
'chat-message': { playerId: string, playerName: string, message: string }
'player-joined': { playerId: string, playerName: string }
'player-left': { playerId: string }
```

---

## 🎯 Future Enhancements

- [ ] Tournament mode
- [ ] Video chat integration
- [ ] Advanced statistics and analytics
- [ ] Achievement system
- [ ] Customizable avatars
- [ ] Replays and hand analysis
- [ ] Mobile app store deployment
- [ ] Multi-table support
- [ ] Sit-and-go games
- [ ] Omaha and other poker variants

---

## 📄 License

[Specify your license here]

---

## 👥 Contributing

[Add contribution guidelines]

---

## 📞 Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: [your-email]

---

**Built with ❤️ using React Native, Express, and Socket.IO**
