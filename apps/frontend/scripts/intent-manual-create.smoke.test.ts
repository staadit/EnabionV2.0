function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  process.env.BACKEND_URL = 'http://backend.test';
  const handler = (await import('../pages/api/intents/index')).default;
  const coachHandler = (await import('../pages/api/intents/[id]/coach/run')).default;

  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedOptions: any = null;

  globalThis.fetch = (async (url: any, options?: any) => {
    capturedUrl = String(url);
    capturedOptions = options || {};
    return {
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ intents: [] }),
      text: async () => JSON.stringify({ intents: [] }),
    } as any;
  }) as any;

  const res = {
    setHeader: () => res,
    status: () => res,
    json: () => res,
  } as any;

  try {
    const reqGet = {
      method: 'GET',
      query: {
        stage: 'NEW',
        status: ['NEW', 'CLARIFY'],
        ownerId: 'user-1',
        language: 'EN',
        from: '2026-01-01',
        to: '2026-01-07',
        q: 'test',
        orgId: 'evil',
        limit: '5',
      },
      headers: { cookie: 'enabion_session=tokenA' },
    } as any;

    await handler(reqGet, res);
    assert(capturedUrl.includes('/intents'), 'Proxy must call /intents');
    assert(capturedUrl.includes('stage=NEW'), 'Proxy must forward stage filter');
    assert(capturedUrl.includes('status=NEW'), 'Proxy must forward status filter');
    assert(capturedUrl.includes('ownerId=user-1'), 'Proxy must forward owner filter');
    assert(capturedUrl.includes('language=EN'), 'Proxy must forward language filter');
    assert(!capturedUrl.includes('orgId='), 'Proxy must not forward orgId');
    assert(
      capturedOptions?.headers?.cookie === 'enabion_session=tokenA',
      'Proxy must forward cookie',
    );

    const reqPost = {
      method: 'POST',
      query: {},
      headers: { cookie: 'enabion_session=tokenA' },
      body: { goal: 'Launch', context: 'Context' },
    } as any;

    await handler(reqPost, res);
    assert(capturedOptions?.method === 'POST', 'Proxy must POST to backend');
    assert(
      capturedOptions?.headers?.['content-type'] === 'application/json',
      'Proxy must set content-type',
    );

    capturedUrl = '';
    capturedOptions = null;
    const reqCoach = {
      method: 'POST',
      query: { id: 'intent-1' },
      headers: { cookie: 'enabion_session=tokenA' },
    } as any;

    await coachHandler(reqCoach, res);
    assert(
      capturedUrl.includes('/intents/intent-1/coach/run'),
      'Coach proxy must call /intents/:id/coach/run',
    );
    assert(
      capturedOptions?.headers?.cookie === 'enabion_session=tokenA',
      'Coach proxy must forward cookie',
    );
  } finally {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).fetch;
    }
  }

  // eslint-disable-next-line no-console
  console.log('Intent manual create proxy tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
