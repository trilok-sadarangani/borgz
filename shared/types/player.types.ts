// Shared player types between frontend and backend

export interface PlayerStats {
  playerId: string;
  totalHands: number;
  handsWon: number;
  winPercentage: number;
  vpip: number; // Voluntarily Put $ In Pot
  pfr: number; // Pre-Flop Raise
  threeBetPercentage: number;
  cbetPercentage: number; // Continuation bet
  aggressionFactor: number;
  averagePotSize: number;
  totalWinnings: number;
  positionStats: {
    [position: string]: {
      hands: number;
      vpip: number;
      pfr: number;
    };
  };
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  createdAt: number;
  stats: PlayerStats;
}

