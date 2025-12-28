import { getPrisma } from '../src/utils/prisma';

type SeedPlayer = { id: string; name: string; avatar?: string };

const SEED_PLAYERS: SeedPlayer[] = [
  { id: 'seed-alice', name: 'Alice', avatar: '👩' },
  { id: 'seed-bob', name: 'Bob', avatar: '👨' },
  { id: 'seed-charlie', name: 'Charlie', avatar: '🧑' },
  { id: 'seed-diana', name: 'Diana', avatar: '👩‍🦰' },
  { id: 'seed-eve', name: 'Eve', avatar: '👱‍♀️' },
  { id: 'seed-frank', name: 'Frank', avatar: '👨‍🦱' },
  { id: 'seed-grace', name: 'Grace', avatar: '👩‍🦳' },
  { id: 'seed-henry', name: 'Henry', avatar: '👨‍🦳' },
  { id: 'seed-ivy', name: 'Ivy', avatar: '👱' },
];

async function main(): Promise<void> {
  const prisma = getPrisma();
  // Seed players (idempotent via upsert on custom ids).
  for (const p of SEED_PLAYERS) {
    await prisma.player.upsert({
      where: { id: p.id },
      create: { id: p.id, name: p.name, avatar: p.avatar, isSeed: true },
      update: { name: p.name, avatar: p.avatar, isSeed: true },
    });
  }

  // Seed a single club owned by Alice, with Bob as a member (mirrors current in-memory seed).
  const clubId = 'seed-club';
  const inviteCode = 'SEEDCLUB';

  await prisma.club.upsert({
    where: { id: clubId },
    create: {
      id: clubId,
      name: 'seed-club',
      description: 'Seed club for development',
      inviteCode,
      ownerId: 'seed-alice',
      members: {
        create: [
          { playerId: 'seed-alice', role: 'owner' },
          { playerId: 'seed-bob', role: 'member' },
        ],
      },
    },
    update: {
      name: 'seed-club',
      description: 'Seed club for development',
      inviteCode,
      ownerId: 'seed-alice',
    },
  });
}

main()
  .then(async () => {
    await getPrisma().$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await getPrisma().$disconnect();
    process.exit(1);
  });


