import { ForbiddenException } from '@nestjs/common';
import { OrgController } from '../src/org/org.controller';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

class MockOrgService {
  getOrg() {
    throw new Error('Unexpected call');
  }
  updateOrg() {
    throw new Error('Unexpected call');
  }
  listMembers() {
    throw new Error('Unexpected call');
  }
  createMember() {
    throw new Error('Unexpected call');
  }
  updateMemberRole() {
    throw new Error('Unexpected call');
  }
  deactivateMember() {
    throw new Error('Unexpected call');
  }
}

async function assertForbidden(fn: () => Promise<any>, message: string) {
  let threw = false;
  try {
    await fn();
  } catch (err) {
    if (err instanceof ForbiddenException) {
      threw = true;
    }
  }
  assert(threw, message);
}

async function run() {
  const controller = new OrgController(new MockOrgService() as any);
  const req = {
    user: {
      id: 'user-1',
      email: 'viewer@example.com',
      orgId: 'org-1',
      role: 'Viewer',
    },
  } as any;

  await assertForbidden(() => controller.getOrg(req), 'GET /org/me must require Owner');
  await assertForbidden(
    () => controller.updateOrg(req, { name: 'Org' } as any),
    'PATCH /org/me must require Owner',
  );
  await assertForbidden(
    () => controller.listMembers(req),
    'GET /org/members must require Owner',
  );
  await assertForbidden(
    () => controller.createMember(req, { email: 'test@example.com' } as any),
    'POST /org/members must require Owner',
  );
  await assertForbidden(
    () => controller.updateMemberRole(req, 'user-2', { role: 'Viewer' } as any),
    'PATCH /org/members/:userId/role must require Owner',
  );
  await assertForbidden(
    () => controller.deactivateMember(req, 'user-2'),
    'POST /org/members/:userId/deactivate must require Owner',
  );

  // eslint-disable-next-line no-console
  console.log('Admin panel RBAC tests passed.');
}

run();
