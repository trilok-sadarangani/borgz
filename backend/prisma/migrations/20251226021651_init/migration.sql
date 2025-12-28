-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "email" TEXT,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inviteCode" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMember" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'waiting',
    "clubId" TEXT,
    "pot" INTEGER NOT NULL DEFAULT 0,
    "currentBet" INTEGER NOT NULL DEFAULT 0,
    "dealerPosition" INTEGER NOT NULL DEFAULT 0,
    "smallBlindPosition" INTEGER NOT NULL DEFAULT 0,
    "bigBlindPosition" INTEGER NOT NULL DEFAULT 0,
    "activePlayerIndex" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL,
    "communityCards" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "stack" INTEGER NOT NULL,
    "currentBet" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAllIn" BOOLEAN NOT NULL DEFAULT false,
    "hasFolded" BOOLEAN NOT NULL DEFAULT false,
    "finalStack" INTEGER,
    "winnings" INTEGER,
    "cards" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameHand" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "endReason" TEXT,
    "winnerIds" TEXT[],
    "winners" JSONB,
    "pot" INTEGER NOT NULL,
    "communityCards" JSONB,
    "table" JSONB,
    "stacksStartByPlayerId" JSONB,
    "stacksEndByPlayerId" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GameHand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAction" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "handId" TEXT,
    "playerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" INTEGER,
    "phase" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "betTo" INTEGER,
    "currentBetAfter" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "totalHands" INTEGER NOT NULL DEFAULT 0,
    "handsWon" INTEGER NOT NULL DEFAULT 0,
    "winPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vpip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "threeBetPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cbetPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aggressionFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePotSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWinnings" INTEGER NOT NULL DEFAULT 0,
    "positionStats" JSONB NOT NULL DEFAULT '{}',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameHistory" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Player_email_idx" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Player_isSeed_idx" ON "Player"("isSeed");

-- CreateIndex
CREATE UNIQUE INDEX "Club_inviteCode_key" ON "Club"("inviteCode");

-- CreateIndex
CREATE INDEX "Club_ownerId_idx" ON "Club"("ownerId");

-- CreateIndex
CREATE INDEX "Club_inviteCode_idx" ON "Club"("inviteCode");

-- CreateIndex
CREATE INDEX "ClubMember_clubId_idx" ON "ClubMember"("clubId");

-- CreateIndex
CREATE INDEX "ClubMember_playerId_idx" ON "ClubMember"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMember_clubId_playerId_key" ON "ClubMember"("clubId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE INDEX "Game_code_idx" ON "Game"("code");

-- CreateIndex
CREATE INDEX "Game_clubId_idx" ON "Game"("clubId");

-- CreateIndex
CREATE INDEX "Game_phase_idx" ON "Game"("phase");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- CreateIndex
CREATE INDEX "GamePlayer_gameId_idx" ON "GamePlayer"("gameId");

-- CreateIndex
CREATE INDEX "GamePlayer_playerId_idx" ON "GamePlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_playerId_key" ON "GamePlayer"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "GameHand_gameId_idx" ON "GameHand"("gameId");

-- CreateIndex
CREATE INDEX "GameHand_gameId_handNumber_idx" ON "GameHand"("gameId", "handNumber");

-- CreateIndex
CREATE INDEX "PlayerAction_gameId_idx" ON "PlayerAction"("gameId");

-- CreateIndex
CREATE INDEX "PlayerAction_handId_idx" ON "PlayerAction"("handId");

-- CreateIndex
CREATE INDEX "PlayerAction_playerId_idx" ON "PlayerAction"("playerId");

-- CreateIndex
CREATE INDEX "PlayerAction_timestamp_idx" ON "PlayerAction"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_playerId_key" ON "PlayerStats"("playerId");

-- CreateIndex
CREATE INDEX "PlayerStats_playerId_idx" ON "PlayerStats"("playerId");

-- CreateIndex
CREATE INDEX "GameHistory_gameId_idx" ON "GameHistory"("gameId");

-- CreateIndex
CREATE INDEX "GameHistory_timestamp_idx" ON "GameHistory"("timestamp");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameHand" ADD CONSTRAINT "GameHand_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_handId_fkey" FOREIGN KEY ("handId") REFERENCES "GameHand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameHistory" ADD CONSTRAINT "GameHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
