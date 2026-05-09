/**
 * Seed: roles, demo users (password: password123), Lebanese venues, fields, competitions, teams.
 * Built-in ADMIN (only one): ibrahimsaraline@outlook.com / ADMIN2026 — not creatable via registration.
 * Re-seed: npm run db:seed
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Only basketball, soccer, tennis, volleyball (matches frontend sportImages.js) */
const IMG = {
  facilityBeirut:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
  facilityTripoli:
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&q=80',
  basketball:
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  soccer:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  tennis:
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80',
  volleyball:
    'https://images.unsplash.com/photo-1540747913346-19a329ad5b82?w=800&q=80',
};

function weeklySlots(startTime = '08:00', endTime = '22:00') {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startTime,
    endTime,
  }));
}

const hoursJson = JSON.stringify({
  mon: { open: '08:00', close: '22:00' },
  tue: { open: '08:00', close: '22:00' },
  wed: { open: '08:00', close: '22:00' },
  thu: { open: '08:00', close: '22:00' },
  fri: { open: '08:00', close: '22:00' },
  sat: { open: '09:00', close: '21:00' },
  sun: { open: '09:00', close: '21:00' },
});

async function main() {
  await prisma.notification.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.match.deleteMany();
  await prisma.competitionTeam.deleteMany();
  await prisma.sponsorship.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.fieldImage.deleteMany();
  await prisma.field.deleteMany();
  await prisma.facilityPhoto.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  await prisma.role.createMany({
    data: [
      { name: 'PLAYER' },
      { name: 'FACILITY_OWNER' },
      { name: 'SPONSOR' },
      { name: 'ADMIN' },
    ],
  });

  const R = await prisma.role.findMany();
  const byName = Object.fromEntries(R.map((r) => [r.name, r.id]));

  const hash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('ADMIN2026', 10);

  /** Built-in platform admin — not creatable via public registration. */
  const adminUser = await prisma.user.create({
    data: {
      email: 'ibrahimsaraline@outlook.com',
      passwordHash: adminHash,
      name: 'Platform Administrator',
      roleId: byName.ADMIN,
      roleVerificationStatus: 'APPROVED',
    },
  });

  const player = await prisma.user.create({
    data: {
      email: 'player@lb.sportsbook.app',
      passwordHash: hash,
      name: 'Rami Khoury',
      roleId: byName.PLAYER,
    },
  });

  const player2 = await prisma.user.create({
    data: {
      email: 'player2@lb.sportsbook.app',
      passwordHash: hash,
      name: 'Layla Haddad',
      roleId: byName.PLAYER,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: 'owner@lb.sportsbook.app',
      passwordHash: hash,
      name: 'Marc Audi',
      roleId: byName.FACILITY_OWNER,
      roleVerificationStatus: 'APPROVED',
    },
  });

  const sponsorUser = await prisma.user.create({
    data: {
      email: 'sponsor@lb.sportsbook.app',
      passwordHash: hash,
      name: 'Nadia Gemayel',
      roleId: byName.SPONSOR,
      roleVerificationStatus: 'APPROVED',
    },
  });

  const sponsor = await prisma.sponsor.create({
    data: {
      userId: sponsorUser.id,
      companyName: 'Mediterranean Sports Beverages',
      description: 'Hydration partner for Lebanon leagues.',
      website: 'https://example.lb',
    },
  });

  const facBeirut = await prisma.facility.create({
    data: {
      ownerId: owner.id,
      name: 'Beirut Waterfront Sports Club',
      description:
        'Indoor and outdoor courts along the Corniche — basketball, football, tennis, and volleyball with night lighting.',
      address: 'Corniche al-Nahr',
      city: 'Beirut',
      lat: 33.9022,
      lng: 35.5182,
      approvalRequired: false,
      photos: {
        create: [{ url: IMG.facilityBeirut }, { url: IMG.basketball, sortOrder: 1 }],
      },
    },
  });

  const facTripoli = await prisma.facility.create({
    data: {
      ownerId: owner.id,
      name: 'Tripoli North Arena',
      description:
        'Regional hub for training and matches in North Lebanon — tennis and volleyball with covered courts.',
      address: 'El-Mina waterfront district',
      city: 'Tripoli',
      lat: 34.4346,
      lng: 35.8362,
      approvalRequired: false,
      photos: {
        create: [{ url: IMG.facilityTripoli }],
      },
    },
  });

  const fieldDefs = [
    {
      facilityId: facBeirut.id,
      name: 'Court 1 — Basketball',
      sportType: 'Basketball',
      description: 'Full indoor court, FIBA lines, electronic scoreboard.',
      pricePerSlot: 55,
      image: IMG.basketball,
    },
    {
      facilityId: facBeirut.id,
      name: 'Pitch A — Soccer',
      sportType: 'Soccer',
      description: '5-a-side artificial turf, floodlights.',
      pricePerSlot: 70,
      image: IMG.soccer,
    },
    {
      facilityId: facBeirut.id,
      name: 'Courts 3–4 — Tennis',
      sportType: 'Tennis',
      description: 'Outdoor hard courts, professional nets.',
      pricePerSlot: 48,
      image: IMG.tennis,
    },
    {
      facilityId: facBeirut.id,
      name: 'Hall B — Volleyball',
      sportType: 'Volleyball',
      description: 'Indoor volleyball with sprung floor and FIVB dimensions.',
      pricePerSlot: 52,
      image: IMG.volleyball,
    },
    {
      facilityId: facTripoli.id,
      name: 'Tennis Center — Clay & hard',
      sportType: 'Tennis',
      description: 'Two outdoor courts, coaching on request.',
      pricePerSlot: 42,
      image: IMG.tennis,
    },
    {
      facilityId: facTripoli.id,
      name: 'Volleyball Pavilion',
      sportType: 'Volleyball',
      description: 'Beach-style sand court + indoor backup in winter.',
      pricePerSlot: 45,
      image: IMG.volleyball,
    },
  ];

  const createdFields = [];
  for (const def of fieldDefs) {
    const { image, ...rest } = def;
    const f = await prisma.field.create({
      data: {
        ...rest,
        openingHoursJson: hoursJson,
        images: { create: [{ url: image }] },
        slots: { create: weeklySlots('08:00', '22:00') },
      },
    });
    createdFields.push(f);
  }

  const comp = await prisma.competition.create({
    data: {
      name: 'Lebanon Summer Cup 2026',
      description: 'Open league for teams across Beirut and Tripoli venues.',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-09-30'),
      status: 'OPEN',
    },
  });

  const teamHawks = await prisma.team.create({
    data: {
      name: 'Beirut Hawks',
      creatorId: player.id,
      members: { create: [{ userId: player.id }] },
    },
  });

  const teamEagles = await prisma.team.create({
    data: {
      name: 'Tripoli Eagles',
      creatorId: player2.id,
      members: { create: [{ userId: player2.id }] },
    },
  });

  await prisma.competitionTeam.createMany({
    data: [
      { competitionId: comp.id, teamId: teamHawks.id },
      { competitionId: comp.id, teamId: teamEagles.id },
    ],
  });

  await prisma.sponsorship.create({
    data: {
      sponsorId: sponsor.id,
      competitionId: comp.id,
      amount: 750,
      rewardContribution: 150,
      status: 'APPROVED',
      notes: 'Main sponsor — Lebanon Summer Cup.',
    },
  });

  console.log('Built-in admin (only seeded ADMIN user):', {
    email: adminUser.email,
    password: 'ADMIN2026',
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
