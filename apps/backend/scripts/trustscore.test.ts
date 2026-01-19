import { EVENT_TYPES } from '../src/events/event-registry';
import { TrustScoreService, computeTrustScore } from '../src/trustscore/trustscore.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

class MockPrismaService {
  organizations: any[] = [
    {
      id: 'org-1',
      name: 'Org One',
      slug: 'org-one',
      providerLanguages: ['EN'],
      providerRegions: ['EU'],
      providerTags: ['ai'],
      providerBudgetBucket: 'EUR_10K_50K',
      providerTeamSizeBucket: 'TEAM_11_50',
      trustScoreLatestId: null,
    },
  ];
  profiles: any[] = [
    {
      orgId: 'org-1',
      markets: ['EU'],
      industries: ['saas'],
      clientTypes: ['b2b'],
      servicePortfolio: ['consulting'],
      techStack: ['node'],
      excludedSectors: [],
      constraints: {},
    },
  ];
  intents: any[] = [
    {
      id: 'intent-1',
      orgId: 'org-1',
      createdAt: new Date('2026-01-20T08:00:00.000Z'),
      stage: 'WON',
      ownerUserId: 'user-1',
    },
    {
      id: 'intent-2',
      orgId: 'org-1',
      createdAt: new Date('2026-01-21T08:00:00.000Z'),
      stage: 'LOST',
      ownerUserId: 'user-2',
    },
  ];
  responseEvents: any[] = [
    {
      subjectId: 'intent-1',
      occurredAt: new Date('2026-01-20T10:00:00.000Z'),
      type: 'INTENT_UPDATED',
    },
    {
      subjectId: 'intent-2',
      occurredAt: new Date('2026-01-21T12:00:00.000Z'),
      type: 'INTENT_PIPELINE_STAGE_CHANGED',
    },
  ];
  trustScoreSnapshots: any[] = [];
  events: any[] = [];

  organization = {
    findUnique: async (args: any) => {
      return this.organizations.find((org) => org.id === args.where.id) ?? null;
    },
    update: async (args: any) => {
      const org = this.organizations.find((item) => item.id === args.where.id);
      if (!org) return null;
      Object.assign(org, args.data);
      return org;
    },
  };

  orgAvatarProfile = {
    findUnique: async (args: any) => {
      return this.profiles.find((profile) => profile.orgId === args.where.orgId) ?? null;
    },
  };

  intent = {
    findMany: async (args: any) => {
      const results = this.intents.filter((intent) => intent.orgId === args.where.orgId);
      return results.slice(0, args.take ?? results.length);
    },
  };

  event = {
    findMany: async (args: any) => {
      return this.responseEvents.filter((event) =>
        args.where.subjectId.in.includes(event.subjectId),
      );
    },
    create: async (args: any) => {
      this.events.push(args.data);
      return args.data;
    },
  };

  trustScoreSnapshot = {
    findFirst: async () => null,
    create: async (args: any) => {
      const record = { id: `ts-${this.trustScoreSnapshots.length + 1}`, ...args.data };
      this.trustScoreSnapshots.push(record);
      return record;
    },
  };

  $transaction = async (input: any) => {
    if (typeof input === 'function') {
      return input(this);
    }
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    return input;
  };
}

async function testComputeTrustScore() {
  const result = computeTrustScore({
    profileCompletenessPercent: 80,
    responseMedianHours: 2,
    behaviourCompletionRatio: 1,
    intentCount: 5,
    responseSampleCount: 5,
    missingResponseCount: 0,
  });

  assert(result.scoreOverall === 75, 'Expected overall score to be 75');
  assert(result.statusLabel === 'Good behaviour', 'Expected Good behaviour label');
  assert(result.scoreProfile === 80, 'Expected profile score to be 80');
  assert(result.scoreResponsiveness === 100, 'Expected responsiveness score to be 100');
}

async function testRecalculateTrustScore() {
  const prisma = new MockPrismaService();
  const service = new TrustScoreService(prisma as any);

  const result = await service.recalculateOrgTrustScore({
    orgId: 'org-1',
    actorUserId: 'user-1',
    reason: 'INTENT_CREATED',
  });

  assert(prisma.trustScoreSnapshots.length === 1, 'Snapshot should be created');
  assert(prisma.events.length === 1, 'Event should be created');
  assert(
    prisma.events[0].type === EVENT_TYPES.TRUSTSCORE_RECALCULATED,
    'TRUSTSCORE_RECALCULATED event expected',
  );
  assert(result.snapshot.statusLabel.length > 0, 'Snapshot should have status label');
  assert(
    prisma.organizations[0].trustScoreLatestId === prisma.trustScoreSnapshots[0].id,
    'Org trustScoreLatestId should be updated',
  );
}

async function run() {
  await testComputeTrustScore();
  await testRecalculateTrustScore();
  // eslint-disable-next-line no-console
  console.log('TrustScore tests passed.');
}

run();
