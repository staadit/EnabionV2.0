import { AuthService } from '../src/auth/auth.service';
import { EVENT_TYPES } from '../src/events/event-registry';

type TestUser = {
  id: string;
  orgId: string;
  email: string;
  role: string;
};

type EmittedEvent = {
  type: string;
  correlationId: string;
  subjectType: string;
  subjectId: string;
  payload: Record<string, unknown>;
};

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function createPrismaStub(user: TestUser) {
  return {
    user: {
      findUnique: async ({ where: { email } }: { where: { email: string } }) =>
        email === user.email ? user : null,
    },
    $transaction: async (fn: any) => {
      const tx = {
        passwordResetToken: {
          updateMany: async () => ({ count: 1 }),
          create: async ({ data }: { data: any }) => ({
            id: 'reset_token_1',
            ...data,
          }),
        },
      };
      return fn(tx);
    },
  };
}

async function runDebugModeTest(user: TestUser) {
  process.env.AUTH_RESET_DEBUG = 'true';
  process.env.AUTH_RESET_TTL_MINUTES = '45';
  process.env.APP_PUBLIC_URL = 'https://dev.enabion.com';

  const events: EmittedEvent[] = [];
  const emailCalls: any[] = [];

  const prisma = createPrismaStub(user);
  const eventService = {
    emitEvent: async (input: EmittedEvent) => {
      events.push(input);
      return input;
    },
  };
  const emailService = {
    sendPasswordResetEmail: async (input: any) => {
      emailCalls.push(input);
      return { messageId: 'msg-debug' };
    },
  };

  const authService = new AuthService(prisma as any, eventService as any, emailService as any);
  const response = await authService.requestPasswordReset(user.email);

  assert(response.resetToken, 'debug mode should return reset token');
  assert(emailCalls.length === 0, 'debug mode should not send email');
  assert(
    !events.some((event) => event.type === EVENT_TYPES.EMAIL_SENT || event.type === EVENT_TYPES.EMAIL_FAILED),
    'debug mode should not emit email events',
  );

  const eventsJson = JSON.stringify(events);
  assert(!eventsJson.includes(user.email), 'email should not appear in events');
  assert(!eventsJson.includes(response.resetToken as string), 'reset token should not appear in events');
}

async function runNonDebugModeTest(user: TestUser) {
  process.env.AUTH_RESET_DEBUG = 'false';
  process.env.AUTH_RESET_TTL_MINUTES = '30';
  process.env.APP_PUBLIC_URL = 'https://dev.enabion.com';

  const events: EmittedEvent[] = [];
  const emailCalls: any[] = [];

  const prisma = createPrismaStub(user);
  const eventService = {
    emitEvent: async (input: EmittedEvent) => {
      events.push(input);
      return input;
    },
  };
  const emailService = {
    sendPasswordResetEmail: async (input: any) => {
      emailCalls.push(input);
      return { messageId: 'msg-non-debug' };
    },
  };

  const authService = new AuthService(prisma as any, eventService as any, emailService as any);
  const response = await authService.requestPasswordReset(user.email);

  assert(!('resetToken' in response), 'non-debug should not return reset token');
  assert(emailCalls.length === 1, 'non-debug should send email once');
  assert(
    emailCalls[0].resetUrl.startsWith('https://dev.enabion.com/reset/confirm?token='),
    'reset URL should use APP_PUBLIC_URL',
  );
  assert(emailCalls[0].ttlMinutes === 30, 'ttl minutes should be passed to email service');

  const resetRequested = events.find((event) => event.type === EVENT_TYPES.USER_PASSWORD_RESET_REQUESTED);
  const emailSent = events.find((event) => event.type === EVENT_TYPES.EMAIL_SENT);
  assert(resetRequested, 'password reset requested event should be emitted');
  assert(emailSent, 'email sent event should be emitted');
  assert(
    resetRequested?.correlationId === emailSent?.correlationId,
    'email event should share correlationId with reset request',
  );

  const eventsJson = JSON.stringify(events);
  assert(!eventsJson.includes(user.email), 'email should not appear in events');
}

async function run() {
  const user: TestUser = {
    id: 'user_test',
    orgId: 'org_test',
    email: 'user@example.com',
    role: 'Owner',
  };

  await runDebugModeTest(user);
  await runNonDebugModeTest(user);

  // eslint-disable-next-line no-console
  console.log('Auth reset email tests passed.');
}

run();
