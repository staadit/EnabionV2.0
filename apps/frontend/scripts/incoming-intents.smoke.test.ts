function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  process.env.BACKEND_URL = 'http://backend.test';
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: any) => {
    const href = String(url);
    if (href.includes('/auth/me')) {
      return {
        ok: true,
        json: async () => ({
          user: {
            id: 'user-1',
            email: 'user@test',
            orgId: 'org-1',
            orgSlug: 'acme',
            role: 'Owner',
          },
        }),
      } as any;
    }
    if (href.includes('/v1/org/me')) {
      return {
        ok: true,
        json: async () => ({
          org: { id: 'org-1', name: 'Acme', slug: 'acme', defaultLanguage: 'EN' },
        }),
      } as any;
    }
    if (href.includes('/v1/incoming-intents')) {
      return {
        ok: true,
        json: async () => [
          {
            intentId: 'intent-1',
            intentName: 'Intent 1',
            title: 'Shared intent',
            clientOrgName: 'Org X',
            status: 'NEW',
            deadlineAt: null,
            confidentialityLevel: 'L1',
            ndaGate: { canViewL2: true, reason: 'NOT_L2' },
            senderOrgId: 'org-x',
            recipientRole: 'Y',
            ndaRequestedAt: null,
          },
        ],
      } as any;
    }
    throw new Error(`Unexpected fetch call: ${href}`);
  }) as any;

  try {
    const page = await import('../pages/[orgSlug]/incoming-intents/index');
    const ctx = {
      req: { headers: { cookie: 'enabion_session=tokenA' } },
      params: { orgSlug: 'acme' },
      resolvedUrl: '/acme/incoming-intents',
    } as any;
    const result = await page.getServerSideProps(ctx);
    assert('props' in result, 'Expected props from getServerSideProps');
    const props = (result as any).props;
    assert(props.org.slug === 'acme', 'Org slug should be resolved');
    assert(Array.isArray(props.intents), 'Intents should be an array');
    assert(props.intents.length === 1, 'Intents list should contain one item');
  } finally {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).fetch;
    }
  }

  // eslint-disable-next-line no-console
  console.log('Incoming intents SSR smoke test passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
