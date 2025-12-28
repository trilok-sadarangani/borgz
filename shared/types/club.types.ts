// Shared club types between frontend and backend

export interface Club {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
  /**
   * Shareable code used to join this club.
   * Present in Phase 1 (in-memory service); may be restricted later.
   */
  inviteCode?: string;
}

export interface ClubMember {
  clubId: string;
  playerId: string;
  joinedAt: number;
  role: 'owner' | 'member';
}

