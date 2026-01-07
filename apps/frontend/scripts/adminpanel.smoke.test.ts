function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const { getAdminLabels } = await import('../lib/admin-i18n');

  const en = getAdminLabels('EN').settingsTitle;
  const pl = getAdminLabels('PL').settingsTitle;
  assert(en !== pl, 'Language switch should change labels');

  process.env.BACKEND_URL = 'http://backend.test';
  const handler = (await import('../pages/api/org/members/index')).default;

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
      json: async () => ({ members: [] }),
      text: async () => JSON.stringify({ members: [] }),
    } as any;
  }) as any;

  const req = {
    method: 'GET',
    query: { orgId: 'org-b' },
    headers: { cookie: 'enabion_session=tokenA' },
  } as any;

  const res = {
    setHeader: () => res,
    status: () => res,
    json: () => res,
  } as any;

  try {
    await handler(req, res);
    assert(capturedUrl.includes('/v1/org/members'), 'Proxy must call /v1/org/members');
    assert(!capturedUrl.includes('orgId='), 'Proxy must not forward orgId query');
    assert(
      capturedOptions?.headers?.cookie === 'enabion_session=tokenA',
      'Proxy must forward cookie',
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
  console.log('Admin panel smoke tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
