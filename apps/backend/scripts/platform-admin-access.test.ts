import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { PlatformAdminGuard } from '../src/auth/platform-admin.guard';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeContext(cookie?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: cookie ? { cookie } : {},
      }),
    }),
  } as any;
}

async function testAllowlist() {
  process.env.PLATFORM_ADMIN_EMAIL_ALLOWLIST = '';
  const authService = new AuthService({} as any, {} as any, {} as any);
  assert(
    (authService as any).isPlatformAdminEmail('admin@enabion.com') === false,
    'empty allowlist should deny',
  );

  process.env.PLATFORM_ADMIN_EMAIL_ALLOWLIST = 'admin@enabion.com, OPS@ENABION.COM ';
  const authService2 = new AuthService({} as any, {} as any, {} as any);
  assert(
    (authService2 as any).isPlatformAdminEmail('admin@enabion.com') === true,
    'allowlist should be case-insensitive',
  );
  assert(
    (authService2 as any).isPlatformAdminEmail('ops@enabion.com') === true,
    'allowlist should match trimmed entries',
  );
  assert(
    (authService2 as any).isPlatformAdminEmail('other@enabion.com') === false,
    'non-listed email should be denied',
  );
}

async function testGuard() {
  const authService = {
    getCookieName: () => 'enabion_session',
    validateSession: async () => ({
      sessionId: 'session-1',
      user: {
        id: 'user-1',
        email: 'admin@enabion.com',
        orgId: 'org-1',
        role: 'Owner',
        isPlatformAdmin: false,
      },
    }),
  };

  const guard = new PlatformAdminGuard(authService as any);

  let threwUnauthorized = false;
  try {
    await guard.canActivate(makeContext());
  } catch (err) {
    if (err instanceof UnauthorizedException) {
      threwUnauthorized = true;
    }
  }
  assert(threwUnauthorized, 'missing session should throw Unauthorized');

  let threwForbidden = false;
  try {
    await guard.canActivate(makeContext('enabion_session=token'));
  } catch (err) {
    if (err instanceof ForbiddenException) {
      threwForbidden = true;
    }
  }
  assert(threwForbidden, 'non-admin should throw Forbidden');

  const adminAuthService = {
    ...authService,
    validateSession: async () => ({
      sessionId: 'session-2',
      user: {
        id: 'user-2',
        email: 'admin@enabion.com',
        orgId: 'org-1',
        role: 'Owner',
        isPlatformAdmin: true,
      },
    }),
  };
  const adminGuard = new PlatformAdminGuard(adminAuthService as any);
  const allowed = await adminGuard.canActivate(makeContext('enabion_session=token'));
  assert(allowed === true, 'platform admin should be allowed');
}

async function run() {
  await testAllowlist();
  await testGuard();
  // eslint-disable-next-line no-console
  console.log('Platform admin access tests passed.');
}

run();
