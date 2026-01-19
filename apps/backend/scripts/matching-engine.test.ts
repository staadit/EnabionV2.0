import { randomUUID } from 'node:crypto';
import { EVENT_TYPES } from '../src/events/event-registry';
import { EventService } from '../src/events/event.service';
import { IntentMatchingService } from '../src/intents/intent-matching.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function applySelect(record: any, select: any) {
  if (!select) return record;
  const output: Record<string, any> = {};
  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      output[key] = record[key];
    }
  }
  return output;
}

class MockPrismaService {
  intents: any[] = [];
  organizations: any[] = [];
  matchLists: any[] = [];
  matchFeedbacks: any[] = [];
  events: any[] = [];
  trustScoreSnapshots: any[] = [];

  intent = {
    findFirst: async (args: any) => {
      const match = this.intents.find(
        (intent) =>
          (!args?.where?.id || intent.id === args.where.id) &&
          (!args?.where?.orgId || intent.orgId === args.where.orgId),
      );
      if (!match) return null;
      return applySelect(match, args?.select);
    },
    updateMany: async (args: any) => {
      let count = 0;
      this.intents = this.intents.map((intent) => {
        const matches =
          (!args?.where?.id || intent.id === args.where.id) &&
          (!args?.where?.orgId || intent.orgId === args.where.orgId);
        if (!matches) {
          return intent;
        }
        count += 1;
        return { ...intent, ...args.data };
      });
      return { count };
    },
  };

  organization = {
    findMany: async (args: any) => {
      const where = args?.where ?? {};
      let results = [...this.organizations];
      if (where.status) {
        results = results.filter((org) => org.status === where.status);
      }
      if (where.id?.not) {
        results = results.filter((org) => org.id !== where.id.not);
      }
      return results.map((org) => applySelect(org, args?.select));
    },
  };

  trustScoreSnapshot = {
    findMany: async (args: any) => {
      const ids = args?.where?.id?.in ?? [];
      const filtered = this.trustScoreSnapshots.filter((snapshot) => ids.includes(snapshot.id));
      return filtered.map((snapshot) => applySelect(snapshot, args?.select));
    },
  };

  matchList = {
    create: async (args: any) => {
      const record = {
        id: args.data.id ?? randomUUID(),
        createdAt: args.data.createdAt ?? new Date(),
        ...args.data,
      };
      this.matchLists.push(record);
      return applySelect(record, args?.select);
    },
    findFirst: async (args: any) => {
      const where = args?.where ?? {};
      let results = this.matchLists.filter((list) => {
        if (where.id && list.id !== where.id) return false;
        if (where.orgId && list.orgId !== where.orgId) return false;
        if (where.intentId && list.intentId !== where.intentId) return false;
        return true;
      });
      if (args?.orderBy?.createdAt === 'desc') {
        results = results.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        );
      }
      const match = results[0];
      if (!match) return null;
      return applySelect(match, args?.select);
    },
  };

  matchFeedback = {
    create: async (args: any) => {
      const record = {
        id: args.data.id ?? randomUUID(),
        createdAt: args.data.createdAt ?? new Date(),
        ...args.data,
      };
      this.matchFeedbacks.push(record);
      return applySelect(record, args?.select);
    },
  };

  event = {
    create: async (args: any) => {
      this.events.push(args.data);
      return args.data;
    },
  };
}

class MockTrustScoreService {
  public calls: any[] = [];

  async recalculateOrgTrustScore(input: any) {
    this.calls.push(input);
    return { snapshot: { id: 'snapshot-1' } };
  }
}

async function testMatchingEngine() {
  const prisma = new MockPrismaService();
  const events = new EventService(prisma as any);
  const trustScore = new MockTrustScoreService();
  const service = new IntentMatchingService(prisma as any, events as any, trustScore as any);

  prisma.intents = [
    {
      id: 'intent-1',
      orgId: 'org-x',
      confidentialityLevel: 'L1',
      language: 'EN',
      tech: ['react', 'node'],
      industry: ['saas'],
      region: ['EU'],
      budgetBucket: 'EUR_10K_50K',
    },
  ];

  prisma.organizations = [
    {
      id: 'org-x',
      name: 'X org',
      slug: 'x-org',
      status: 'ACTIVE',
      providerLanguages: ['EN'],
      providerRegions: ['EU'],
      providerTags: ['react'],
      providerBudgetBucket: 'EUR_10K_50K',
    },
    {
      id: 'org-a',
      name: 'Alpha',
      slug: 'alpha',
      status: 'ACTIVE',
      providerLanguages: ['EN'],
      providerRegions: ['EU'],
      providerTags: ['react', 'saas'],
      providerBudgetBucket: 'EUR_10K_50K',
      trustScoreLatestId: 'ts-alpha',
    },
    {
      id: 'org-b',
      name: 'Beta',
      slug: 'beta',
      status: 'ACTIVE',
      providerLanguages: ['EN'],
      providerRegions: ['EU'],
      providerTags: ['react', 'saas'],
      providerBudgetBucket: 'EUR_10K_50K',
    },
    {
      id: 'org-empty',
      name: 'Empty',
      slug: 'empty',
      status: 'ACTIVE',
      providerLanguages: [],
      providerRegions: [],
      providerTags: [],
      providerBudgetBucket: 'UNKNOWN',
    },
  ];

  prisma.trustScoreSnapshots = [
    {
      id: 'ts-alpha',
      scoreOverall: 62,
      statusLabel: 'Good behaviour',
      computedAt: new Date(),
    },
  ];

  const matchList = await service.runMatching({
    orgId: 'org-x',
    intentId: 'intent-1',
    actorUserId: 'user-1',
  });

  assert(matchList.algorithmVersion === 'rule-v1', 'Algorithm version should be rule-v1');
  assert(matchList.candidates.length === 2, 'Should return two scored candidates');
  assert(matchList.candidates[0].orgName === 'Alpha', 'Tie should sort by orgName');
  assert(matchList.candidates[1].orgName === 'Beta', 'Second candidate should be Beta');

  const breakdown = matchList.candidates[0].breakdown;
  assert(breakdown.language, 'Language breakdown should exist');
  assert(typeof breakdown.language.weight === 'number', 'Breakdown weight should be numeric');
  assert(Array.isArray(breakdown.tech.matched), 'Breakdown matched should be an array');
  assert(typeof breakdown.region.notes === 'string', 'Breakdown notes should be present');

  const matchListEvent = prisma.events.find((event) => event.type === EVENT_TYPES.MATCH_LIST_CREATED);
  assert(matchListEvent, 'MATCH_LIST_CREATED event should be emitted');
  assert(
    matchListEvent.payload.topCandidates.includes('org-a'),
    'Top candidates should include org-a',
  );

  await service.recordFeedback({
    orgId: 'org-x',
    intentId: 'intent-1',
    matchListId: matchList.matchListId,
    candidateOrgId: 'org-a',
    action: 'SHORTLIST',
    actorUserId: 'user-1',
  });

  const feedbackEvent = prisma.events.find(
    (event) => event.type === EVENT_TYPES.MATCH_FEEDBACK_RECORDED,
  );
  assert(feedbackEvent, 'MATCH_FEEDBACK_RECORDED event should be emitted');
  assert(feedbackEvent.payload.action === 'SHORTLIST', 'Feedback event should carry action');
}

async function run() {
  await testMatchingEngine();
  // eslint-disable-next-line no-console
  console.log('Matching engine tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
