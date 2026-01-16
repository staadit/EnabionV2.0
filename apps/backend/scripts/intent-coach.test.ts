import { HttpException } from '@nestjs/common';
import { EVENT_TYPES } from '../src/events/event-registry';
import { EventService } from '../src/events/event.service';
import { IntentService } from '../src/intents/intent.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireDefined<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
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

function matchesWhere(record: any, where: any): boolean {
  if (!where) return true;
  if (where.id && record.id !== where.id) return false;
  if (where.orgId && record.orgId !== where.orgId) return false;
  if (where.intentId && record.intentId !== where.intentId) return false;
  if (where.intentName) {
    if (typeof where.intentName === 'string') {
      if (record.intentName !== where.intentName) return false;
    } else if (where.intentName.equals) {
      if (record.intentName?.toLowerCase() !== where.intentName.equals.toLowerCase()) return false;
    }
  }
  return true;
}

class StubAiGatewayService {
  async generateText(request: any) {
    if (request.useCase === 'summary_internal') {
      return {
        text: '- Summary bullet 1\n- Summary bullet 2',
        model: 'stub',
        requestId: 'req-summary',
      };
    }
    if (request.useCase === 'intent_structuring') {
      return {
        text: JSON.stringify({
          items: [
            { field: 'goal', action: 'update', value: 'Updated goal', rationale: 'Refine goal' },
            { field: 'scope', action: 'no_change' },
          ],
        }),
        model: 'stub',
        requestId: 'req-struct',
      };
    }
    return {
      text: 'ok',
      model: 'stub',
      requestId: 'req-default',
    };
  }
}

class MockPrismaService {
  organizations: any[] = [{ id: 'org-1', policyAiEnabled: true }];
  intents: any[] = [];
  intentCoachRuns: any[] = [];
  avatarSuggestions: any[] = [];
  avatarSuggestionFeedbacks: any[] = [];
  events: any[] = [];

  organization = {
    findUnique: async (args: any) => {
      const org = this.organizations.find((item) => item.id === args?.where?.id);
      if (!org) return null;
      if (args?.select) {
        return applySelect(org, args.select);
      }
      return org;
    },
  };

  intent = {
    findFirst: async (args: any) => {
      const record = this.intents.find((intent) => matchesWhere(intent, args?.where));
      if (!record) return null;
      return applySelect(record, args?.select);
    },
    update: async (args: any) => {
      let updated: any = null;
      this.intents = this.intents.map((intent) => {
        if (intent.id !== args?.where?.id) {
          return intent;
        }
        updated = {
          ...intent,
          ...args.data,
        };
        return updated;
      });
      return updated;
    },
    updateMany: async (args: any) => {
      let updated = 0;
      this.intents = this.intents.map((intent) => {
        if (!matchesWhere(intent, args?.where)) {
          return intent;
        }
        updated += 1;
        return {
          ...intent,
          ...args?.data,
        };
      });
      return { count: updated };
    },
  };

  intentCoachRun = {
    create: async (args: any) => {
      const record = {
        ...args.data,
        createdAt: args.data.createdAt ?? new Date(),
      };
      this.intentCoachRuns.push(record);
      return record;
    },
    findMany: async (args: any) => {
      const results = this.intentCoachRuns.filter((run) => matchesWhere(run, args?.where));
      return results;
    },
  };

  avatarSuggestion = {
    create: async (args: any) => {
      const record = { ...args.data };
      this.avatarSuggestions.push(record);
      return record;
    },
    findFirst: async (args: any) => {
      const record = this.avatarSuggestions.find((item) => matchesWhere(item, args?.where));
      if (!record) return null;
      if (args?.include?.intent) {
        const intent = this.intents.find((entry) => entry.id === record.intentId);
        return {
          ...record,
          intent: intent ? applySelect(intent, args.include.intent.select) : null,
        };
      }
      return record;
    },
    update: async (args: any) => {
      let updated: any = null;
      this.avatarSuggestions = this.avatarSuggestions.map((item) => {
        if (item.id !== args?.where?.id) {
          return item;
        }
        updated = {
          ...item,
          ...args.data,
        };
        return updated;
      });
      return updated;
    },
  };

  avatarSuggestionFeedback = {
    create: async (args: any) => {
      const record = {
        ...args.data,
        createdAt: args.data.createdAt ?? new Date(),
      };
      this.avatarSuggestionFeedbacks.push(record);
      return record;
    },
  };

  event = {
    create: async (args: any) => {
      this.events.push(args.data);
      return args.data;
    },
  };

  $transaction = async (actions: any[]) => Promise.all(actions);
}

async function testInsufficientL1Data() {
  const prisma = new MockPrismaService();
  const events = new EventService(prisma as any);
  const aiGateway = new StubAiGatewayService();
  const service = new IntentService(prisma as any, events as any, aiGateway as any);

  const intentId = 'intent-1';
  prisma.intents.push({
    id: intentId,
    orgId: 'org-1',
    intentName: 'Intent One',
    goal: 'Short goal',
    language: 'EN',
    stage: 'NEW',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  });

  let threw = false;
  try {
    await service.suggestIntentCoach({ orgId: 'org-1', intentId, actorUserId: 'user-1' });
  } catch (err) {
    threw = err instanceof HttpException && err.getStatus() === 422;
  }
  assert(threw, 'Insufficient L1 data should return 422');
}

async function testPolicyDisabled() {
  const prisma = new MockPrismaService();
  prisma.organizations = [{ id: 'org-1', policyAiEnabled: false }];
  const events = new EventService(prisma as any);
  const aiGateway = new StubAiGatewayService();
  const service = new IntentService(prisma as any, events as any, aiGateway as any);

  const intentId = 'intent-policy';
  prisma.intents.push({
    id: intentId,
    orgId: 'org-1',
    intentName: 'Intent Policy',
    goal: 'Launch pilot with sufficient context.',
    context: 'Enough context to pass L1 checks.',
    scope: 'Scope is defined.',
    language: 'EN',
    stage: 'NEW',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  });

  let threw = false;
  try {
    await service.suggestIntentCoach({ orgId: 'org-1', intentId, actorUserId: 'user-1' });
  } catch (err) {
    threw = err instanceof HttpException && err.getStatus() === 403;
  }
  assert(threw, 'Policy disabled should block Intent Coach');
}

async function testSuggestAndDecideFlow() {
  const prisma = new MockPrismaService();
  const events = new EventService(prisma as any);
  const aiGateway = new StubAiGatewayService();
  const service = new IntentService(prisma as any, events as any, aiGateway as any);

  const intentId = 'intent-2';
  prisma.intents.push({
    id: intentId,
    orgId: 'org-1',
    intentName: 'Intent Two',
    goal: 'Launch a pilot for analytics tooling',
    context: 'Internal pilot for Q2 with a small team.',
    scope: 'Data ingestion and dashboards.',
    language: 'EN',
    stage: 'NEW',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  });

  const result = await service.suggestIntentCoach({
    orgId: 'org-1',
    intentId,
    actorUserId: 'user-1',
  });

  assert(result.summaryBlock.length > 0, 'Summary block should be returned');
  assert(result.suggestions.length > 0, 'Suggestions should be returned');

  const kinds = new Set(result.suggestions.map((item: any) => item.kind));
  assert(kinds.has('missing_info'), 'Missing info suggestions should be generated');
  assert(kinds.has('question'), 'Question suggestions should be generated');
  assert(kinds.has('risk'), 'Risk suggestions should be generated');
  assert(kinds.has('rewrite'), 'Rewrite suggestions should be generated');

  assert(
    prisma.avatarSuggestions.length === result.suggestions.length,
    'Suggestions should be persisted',
  );

  const issuedEvents = prisma.events.filter(
    (event) => event.type === EVENT_TYPES.AVATAR_SUGGESTION_ISSUED,
  );
  assert(
    issuedEvents.length === result.suggestions.length,
    'Each suggestion should emit AVATAR_SUGGESTION_ISSUED',
  );
  issuedEvents.forEach((event) => {
    assert(
      event.correlationId === result.coachRunId,
      'Suggestion events should use coachRunId as correlationId',
    );
  });

  const actionable = requireDefined(
    result.suggestions.find((item: any) => item.kind === 'rewrite' && item.proposedPatch?.fields),
    'Expected at least one actionable rewrite suggestion',
  );
  const nonActionable = requireDefined(
    result.suggestions.find((item: any) => item.kind === 'missing_info'),
    'Expected a non-actionable missing info suggestion',
  );
  const question = requireDefined(
    result.suggestions.find((item: any) => item.kind === 'question'),
    'Expected a question suggestion',
  );

  const acceptActionable = await service.acceptIntentCoachSuggestion({
    orgId: 'org-1',
    intentId,
    suggestionId: actionable.id,
    actorUserId: 'user-1',
    rating: 5,
    sentiment: 'UP',
    reasonCode: 'HELPFUL_STRUCTURING',
    commentL1: 'Clear and actionable.',
  });
  assert(
    acceptActionable.appliedFields.includes('goal'),
    'Accepting actionable suggestion should apply patch',
  );
  const updatedIntent = prisma.intents.find((intent) => intent.id === intentId);
  assert(
    updatedIntent.goal === 'Updated goal',
    'Accepting actionable suggestion should update intent',
  );

  const acceptNonActionable = await service.acceptIntentCoachSuggestion({
    orgId: 'org-1',
    intentId,
    suggestionId: nonActionable.id,
    actorUserId: 'user-1',
  });
  assert(
    Array.isArray(acceptNonActionable.appliedFields) &&
      acceptNonActionable.appliedFields.length === 0,
    'Accepting non-actionable suggestion should return empty appliedFields',
  );

  const rejectResult = await service.rejectIntentCoachSuggestion({
    orgId: 'org-1',
    intentId,
    suggestionId: question.id,
    actorUserId: 'user-1',
    reasonCode: 'NOT_RELEVANT',
    sentiment: 'DOWN',
  });
  assert(rejectResult.suggestion.status === 'REJECTED', 'Rejected suggestion should update status');

  const extraSuggestionId = 'suggestion-extra';
  prisma.avatarSuggestions.push({
    id: extraSuggestionId,
    orgId: 'org-1',
    intentId,
    coachRunId: result.coachRunId,
    avatarType: 'INTENT_COACH',
    kind: 'question',
    title: 'Extra question',
    l1Text: 'Extra question text',
    evidenceRef: null,
    proposedPatch: null,
    status: 'ISSUED',
    actionable: false,
  });

  await service.rejectIntentCoachSuggestion({
    orgId: 'org-1',
    intentId,
    suggestionId: extraSuggestionId,
    actorUserId: 'user-1',
    commentL1: 'Please ask john.doe@example.com',
  });

  const acceptEvents = prisma.events.filter(
    (event) => event.type === EVENT_TYPES.AVATAR_SUGGESTION_ACCEPTED,
  );
  const rejectEvents = prisma.events.filter(
    (event) => event.type === EVENT_TYPES.AVATAR_SUGGESTION_REJECTED,
  );
  const feedbackEvents = prisma.events.filter(
    (event) => event.type === EVENT_TYPES.AVATAR_SUGGESTION_FEEDBACK,
  );
  assert(acceptEvents.length >= 2, 'Accept events should be emitted');
  assert(rejectEvents.length >= 1, 'Reject events should be emitted');
  assert(feedbackEvents.length === 2, 'Feedback events should be emitted when feedback is provided');
  acceptEvents.forEach((event) => {
    assert(
      event.correlationId === result.coachRunId,
      'Accept events should use coachRunId as correlationId',
    );
  });
  rejectEvents.forEach((event) => {
    assert(
      event.correlationId === result.coachRunId,
      'Reject events should use coachRunId as correlationId',
    );
  });
  assert(
    prisma.avatarSuggestionFeedbacks.length === 2,
    'Feedback records should be stored when feedback is provided',
  );
}

async function run() {
  await testInsufficientL1Data();
  await testPolicyDisabled();
  await testSuggestAndDecideFlow();
  // eslint-disable-next-line no-console
  console.log('Intent coach tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
