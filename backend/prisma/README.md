# Database Setup

This directory contains the Prisma schema and database configuration.

## Prisma Models

The schema includes the following models:

- **Player** - Player information (supports both seed players and authenticated users)
- **Club** - Club/organization information
- **ClubMember** - Many-to-many relationship between players and clubs
- **Game** - Game instances
- **GamePlayer** - Players participating in games
- **GameHand** - Individual hand records within games
- **PlayerAction** - Action history for statistics
- **PlayerStats** - Aggregated player statistics
- **GameHistory** - Game state snapshots and events

## Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your PostgreSQL connection string:
     ```
     DATABASE_URL="postgresql://user:password@localhost:5432/borgz?schema=public"
     ```

3. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

4. **Push schema to database** (for development):
   ```bash
   npm run db:push
   ```

   Or create a migration (for production):
   ```bash
   npm run db:migrate
   ```

5. **Open Prisma Studio** (optional, for database browsing):
   ```bash
   npm run db:studio
   ```

## Available Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply migrations (production)
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:seed` - Run database seed script (if available)

## Notes

- For Prisma 7+, the `DATABASE_URL` is read from environment variables at runtime
- The schema uses UUIDs for primary keys
- JSON fields are used for flexible data storage (cards, settings, stats)
- All relations include proper cascade deletes where appropriate

