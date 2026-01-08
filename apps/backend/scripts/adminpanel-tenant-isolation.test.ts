import { NotFoundException } from '@nestjs/common';
import { OrgService } from '../src/org/org.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

class MockPrismaService {
  public lastFindManyArgs: any;
  public lastCountArgs: any;
  public users: any[] = [
    {
      id: 'owner-a',
      orgId: 'org-a',
      email: 'a@example.com',
      role: 'Owner',
      deactivatedAt: null,
    },
    {
      id: 'viewer-a',
      orgId: 'org-a',
      email: 'viewer@example.com',
      role: 'Viewer',
      deactivatedAt: null,
    },
    {
      id: 'owner-b',
      orgId: 'org-b',
      email: 'b@example.com',
      role: 'Owner',
      deactivatedAt: null,
    },
  ];

  user = {
    findMany: async (args: any) => {
      this.lastFindManyArgs = args;
      return this.users.filter((u) => u.orgId === args.where.orgId);
    },
    findFirst: async (args: any) => {
      return (
        this.users.find(
          (u) => u.id === args.where.id && u.orgId === args.where.orgId,
        ) || null
      );
    },
    count: async (args: any) => {
      this.lastCountArgs = args;
      return this.users.filter(
        (u) =>
          u.orgId === args.where.orgId &&
          u.role === args.where.role &&
          !u.deactivatedAt,
      ).length;
    },
    update: async (args: any) => {
      const target = this.users.find((u) => u.id === args.where.id);
      if (!target) {
        throw new Error('Missing user');
      }
      Object.assign(target, args.data);
      return target;
    },
  };

  session = {
    updateMany: async () => ({ count: 0 }),
  };

  organization = {
    findUnique: async (args: any) => {
      if (args.where.id === 'org-a') {
        return {
          id: 'org-a',
          name: 'Org A',
          slug: 'org-a',
          defaultLanguage: 'EN',
          policyAiEnabled: true,
          policyShareLinksEnabled: false,
          policyEmailIngestEnabled: false,
        };
      }
      return null;
    },
  };
}

class MockEventService {
  public emitted: any[] = [];
  async emitEvent(event: any) {
    this.emitted.push(event);
    return event;
  }
}

async function assertNotFound(fn: () => Promise<any>, message: string) {
  let threw = false;
  try {
    await fn();
  } catch (err) {
    if (err instanceof NotFoundException) {
      threw = true;
    }
  }
  assert(threw, message);
}

async function run() {
  const prisma = new MockPrismaService();
  const events = new MockEventService();
  const svc = new OrgService(prisma as any, {} as any, events as any);

  await svc.listMembers('org-a');
  assert(
    prisma.lastFindManyArgs?.where?.orgId === 'org-a',
    'listMembers must scope by orgId',
  );

  await assertNotFound(
    () =>
      svc.updateMemberRole({
        orgId: 'org-a',
        actorUserId: 'owner-a',
        targetUserId: 'owner-b',
        role: 'Viewer',
      }),
    'updateMemberRole must reject cross-org target',
  );

  await assertNotFound(
    () =>
      svc.deactivateMember({
        orgId: 'org-a',
        actorUserId: 'owner-a',
        targetUserId: 'owner-b',
      }),
    'deactivateMember must reject cross-org target',
  );

  // eslint-disable-next-line no-console
  console.log('Admin panel tenant isolation tests passed.');
}

run();
