/**
 * Seed: roles, demo users (password: password123), Lebanese venues, fields, competitions, teams.
 * Built-in ADMIN (only one): ibrahimsaraline@outlook.com / ADMIN2026 — not creatable via registration.
 * Re-seed: npm run db:seed
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Render / production: only ensure Role rows exist (idempotent). No deletes — safe to run every deploy.
 * Full demo seed below runs locally when RENDER is not set.
 */
async function ensureProductionRoles() {
  const names = ['PLAYER', 'FACILITY_OWNER', 'SPONSOR', 'ADMIN'];
  for (const name of names) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

/**
 * Production: upsert one ADMIN user from env (no deletes). Skips if ADMIN_EMAIL or ADMIN_PASSWORD unset.
 */
async function ensureProductionAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      'ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping production admin upsert.',
    );
    return;
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    console.warn('ADMIN role missing — skipping production admin upsert.');
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const name =
    process.env.ADMIN_NAME?.trim() || 'Platform Administrator';

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      roleId: adminRole.id,
      roleVerificationStatus: 'APPROVED',
      status: 'ACTIVE',
      ...(process.env.ADMIN_NAME?.trim() ? { name } : {}),
    },
    create: {
      email,
      passwordHash,
      name,
      roleId: adminRole.id,
      roleVerificationStatus: 'APPROVED',
    },
  });

  console.log('Render seed: admin user upserted for', email);
}

/** Default demo identities — override with DEMO_OWNER_EMAIL, etc. if needed */
const DEMO_EMAIL = {
  owner:
    process.env.DEMO_OWNER_EMAIL?.trim() ||
    'platform-demo-owner@sportsbook.internal',
  player1:
    process.env.DEMO_PLAYER1_EMAIL?.trim() ||
    'platform-demo-player1@sportsbook.internal',
  player2:
    process.env.DEMO_PLAYER2_EMAIL?.trim() ||
    'platform-demo-player2@sportsbook.internal',
  sponsor:
    process.env.DEMO_SPONSOR_EMAIL?.trim() ||
    'platform-demo-sponsor@sportsbook.internal',
};

const DEMO_COMPETITION_NAME = 'Lebanon Summer Cup 2026';

function demoSeedPassword() {
  return (
    process.env.DEMO_SEED_PASSWORD?.trim() || 'ChangeMeDemo2026!'
  );
}

/**
 * Idempotent demo venues, fields, competition, teams, sponsor (no deletes).
 * Skips updating users that already exist under a different role than expected.
 */
async function ensureProductionDemoContent() {
  const password = demoSeedPassword();

  async function upsertDemoUser(email, name, roleName) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return null;
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (existing) {
      if (existing.role.name !== roleName) {
        console.warn(
          `Demo seed: ${email} exists as ${existing.role.name}, not ${roleName} — skip demo user (won't attach demo venues to this account).`,
        );
        return null;
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          roleVerificationStatus: 'APPROVED',
          status: 'ACTIVE',
        },
      });
      return prisma.user.findUnique({
        where: { id: existing.id },
        include: { role: true },
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        roleId: role.id,
        roleVerificationStatus: 'APPROVED',
      },
      include: { role: true },
    });
  }

  const owner = await upsertDemoUser(
    DEMO_EMAIL.owner,
    'Demo Facility Owner',
    'FACILITY_OWNER',
  );
  const player1 = await upsertDemoUser(
    DEMO_EMAIL.player1,
    'Demo Player One',
    'PLAYER',
  );
  const player2 = await upsertDemoUser(
    DEMO_EMAIL.player2,
    'Demo Player Two',
    'PLAYER',
  );
  const sponsorUser = await upsertDemoUser(
    DEMO_EMAIL.sponsor,
    'Demo Sponsor',
    'SPONSOR',
  );

  if (!owner || !player1 || !player2 || !sponsorUser) {
    console.warn('Demo seed: missing role or user — aborting demo content.');
    return;
  }

  await prisma.sponsor.upsert({
    where: { userId: sponsorUser.id },
    update: {
      companyName: 'Mediterranean Sports Beverages',
      description: 'Hydration partner for Lebanon leagues.',
      website: 'https://example.lb',
    },
    create: {
      userId: sponsorUser.id,
      companyName: 'Mediterranean Sports Beverages',
      description: 'Hydration partner for Lebanon leagues.',
      website: 'https://example.lb',
    },
  });

  const sponsor = await prisma.sponsor.findUnique({
    where: { userId: sponsorUser.id },
  });

  async function ensureFacility(data) {
    let fac = await prisma.facility.findFirst({
      where: { name: data.name, city: data.city },
    });
    if (!fac) {
      fac = await prisma.facility.create({
        data: {
          ownerId: owner.id,
          name: data.name,
          description: data.description,
          address: data.address,
          city: data.city,
          lat: data.lat,
          lng: data.lng,
          approvalRequired: false,
        },
      });
    }
    const photoCount = await prisma.facilityPhoto.count({
      where: { facilityId: fac.id },
    });
    if (photoCount === 0) {
      await prisma.facilityPhoto.createMany({
        data: data.photoUrls.map((url, i) => ({
          facilityId: fac.id,
          url,
          sortOrder: i,
        })),
      });
    }
    return fac;
  }

  const facBeirut = await ensureFacility({
    name: 'Beirut Waterfront Sports Club',
    description:
      'Indoor and outdoor courts along the Corniche — basketball, football, tennis, and volleyball with night lighting.',
    address: 'Corniche al-Nahr',
    city: 'Beirut',
    lat: 33.9022,
    lng: 35.5182,
    photoUrls: [IMG.facilityBeirut, IMG.basketball],
  });

  const facTripoli = await ensureFacility({
    name: 'Tripoli North Arena',
    description:
      'Regional hub for training and matches in North Lebanon — tennis and volleyball with covered courts.',
    address: 'El-Mina waterfront district',
    city: 'Tripoli',
    lat: 34.4346,
    lng: 35.8362,
    photoUrls: [IMG.facilityTripoli],
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

  for (const def of fieldDefs) {
    const { image, ...rest } = def;
    let field = await prisma.field.findFirst({
      where: { facilityId: rest.facilityId, name: rest.name },
    });
    if (!field) {
      field = await prisma.field.create({
        data: {
          ...rest,
          openingHoursJson: hoursJson,
          images: { create: [{ url: image }] },
          slots: { create: weeklySlots('08:00', '22:00') },
        },
      });
    } else {
      const imgCount = await prisma.fieldImage.count({ where: { fieldId: field.id } });
      if (imgCount === 0) {
        await prisma.fieldImage.create({
          data: { fieldId: field.id, url: image, sortOrder: 0 },
        });
      }
      const slotCount = await prisma.availabilitySlot.count({
        where: { fieldId: field.id },
      });
      if (slotCount === 0) {
        await prisma.availabilitySlot.createMany({
          data: weeklySlots('08:00', '22:00').map((s) => ({
            ...s,
            fieldId: field.id,
          })),
        });
      }
      if (!field.openingHoursJson) {
        await prisma.field.update({
          where: { id: field.id },
          data: { openingHoursJson: hoursJson },
        });
      }
    }
  }

  let competition = await prisma.competition.findFirst({
    where: { name: DEMO_COMPETITION_NAME },
  });
  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: DEMO_COMPETITION_NAME,
        description:
          'Open league for teams across Beirut and Tripoli venues.',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-09-30'),
        status: 'OPEN',
      },
    });
  } else if (
    !['OPEN', 'CLOSED', 'COMPLETED'].includes(competition.status)
  ) {
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: { status: 'OPEN' },
    });
  }

  async function ensureTeam(name, creatorId) {
    let team = await prisma.team.findFirst({ where: { name } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name,
          creatorId,
          members: { create: [{ userId: creatorId }] },
        },
      });
    } else {
      await prisma.teamMember.upsert({
        where: {
          teamId_userId: { teamId: team.id, userId: creatorId },
        },
        update: {},
        create: { teamId: team.id, userId: creatorId },
      });
    }
    return team;
  }

  const teamHawks = await ensureTeam('Beirut Hawks', player1.id);
  const teamEagles = await ensureTeam('Tripoli Eagles', player2.id);

  await prisma.competitionTeam.createMany({
    data: [
      { competitionId: competition.id, teamId: teamHawks.id },
      { competitionId: competition.id, teamId: teamEagles.id },
    ],
    skipDuplicates: true,
  });

  if (sponsor) {
    const existingSpon = await prisma.sponsorship.findFirst({
      where: {
        sponsorId: sponsor.id,
        competitionId: competition.id,
      },
    });
    if (!existingSpon) {
      await prisma.sponsorship.create({
        data: {
          sponsorId: sponsor.id,
          competitionId: competition.id,
          amount: 750,
          rewardContribution: 150,
          status: 'APPROVED',
          notes: 'Main sponsor — Lebanon Summer Cup.',
        },
      });
    }
  }

  console.log(
    'Render seed: demo facilities, fields, competition, teams, sponsorship ensured.',
  );
}

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
  if (process.env.RENDER === 'true') {
    await ensureProductionRoles();
    console.log('Render seed: roles ensured (PLAYER, FACILITY_OWNER, SPONSOR, ADMIN).');
    await ensureProductionAdminFromEnv();
    await ensureProductionDemoContent();
    return;
  }

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
