import { NdaChannel } from '@prisma/client';
import { NdaService } from '../src/nda/nda.service';
import { EVENT_TYPES } from '../src/events/event-registry';
import { NDA_VERSION, NDA_V0_1_EN_HASH } from '../src/nda/nda.constants';

class MockEventService {
  public emitted: any[] = [];
  async emitEvent(event: any): Promise<any> {
    this.emitted.push(event);
    return event;
  }
}

class MockPrismaService {
  public ndaAcceptances: any[] = [];
  public ndaDocuments: any[] = [];

  ndaDocument = {
    findFirst: async () => null,
  };

  ndaAcceptance = {
    findFirst: async (args: any) => {
      return this.ndaAcceptances.find((entry) => {
        if (args.where?.orgId && entry.orgId !== args.where.orgId) return false;
        if (args.where?.ndaType && entry.ndaType !== args.where.ndaType) return false;
        if (args.where?.ndaVersion && entry.ndaVersion !== args.where.ndaVersion) return false;
        if (args.where?.enHashSha256 && entry.enHashSha256 !== args.where.enHashSha256) return false;
        if (args.where?.counterpartyOrgId !== undefined) {
          return entry.counterpartyOrgId === args.where.counterpartyOrgId;
        }
        return true;
      }) ?? null;
    },
    create: async (args: any) => {
      const record = { id: `nda-${this.ndaAcceptances.length + 1}`, ...args.data };
      this.ndaAcceptances.push(record);
      return record;
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

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const prisma = new MockPrismaService();
  const events = new MockEventService();
  const trustScore = new MockTrustScoreService();
  const ndaService = new NdaService(prisma as any, events as any, trustScore as any);

  const acceptance = await ndaService.acceptMutualNda({
    orgId: 'org-1',
    userId: 'user-1',
    typedName: 'Jane Doe',
    typedRole: 'Owner',
    language: 'EN',
    channel: NdaChannel.ui,
  });

  assert(acceptance.ndaVersion === NDA_VERSION, 'ndaVersion mismatch');
  assert(acceptance.enHashSha256 === NDA_V0_1_EN_HASH, 'enHash mismatch');
  assert(prisma.ndaAcceptances.length === 1, 'acceptance not persisted');

  const event = events.emitted.find((e) => e.type === EVENT_TYPES.NDA_ACCEPTED);
  assert(event, 'NDA_ACCEPTED event not emitted');

  const second = await ndaService.acceptMutualNda({
    orgId: 'org-1',
    userId: 'user-1',
    typedName: 'Jane Doe',
    typedRole: 'Owner',
    language: 'EN',
    channel: NdaChannel.ui,
  });

  assert(second.id === acceptance.id, 'idempotency failed');
  assert(prisma.ndaAcceptances.length === 1, 'duplicate acceptance created');

  // eslint-disable-next-line no-console
  console.log('NDA acceptance tests passed.');
}

run();
