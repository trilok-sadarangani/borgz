// Shared club types between frontend and backend

export interface Club {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ClubMember {
  clubId: string;
  playerId: string;
  joinedAt: number;
  role: 'owner' | 'member';
}

