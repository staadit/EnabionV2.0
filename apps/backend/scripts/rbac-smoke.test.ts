import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../src/auth/roles.decorator';
import { RolesGuard } from '../src/auth/roles.guard';

class DummyController {
  @Roles('Owner', 'BD-AM')
  upload() {
    return true;
  }
}

function assert(cond: any, msg: string) {
  if (!cond) {
    throw new Error(msg);
  }
}

function makeContext(role: string) {
  const controller = new DummyController();
  const handler = controller.upload;
  return {
    getHandler: () => handler,
    getClass: () => DummyController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          orgId: 'org-1',
          role,
        },
      }),
    }),
  } as any;
}

async function run() {
  const guard = new RolesGuard(new Reflector());

  let threw = false;
  try {
    guard.canActivate(makeContext('Viewer'));
  } catch (err) {
    if (err instanceof ForbiddenException) {
      threw = true;
    }
  }
  assert(threw, 'Viewer should be forbidden to upload');

  const ownerAllowed = guard.canActivate(makeContext('Owner'));
  assert(ownerAllowed === true, 'Owner should be allowed to upload');

  // eslint-disable-next-line no-console
  console.log('RBAC smoke tests passed.');
}

run();
