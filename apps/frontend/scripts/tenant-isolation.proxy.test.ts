import type { NextApiRequest, NextApiResponse } from 'next';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  process.env.BACKEND_URL = 'http://backend.test';
  const handler = (await import('../pages/api/attachments/[id]')).default;

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
      json: async () => ({ ok: true }),
    } as any;
  }) as any;

  const req = {
    method: 'GET',
    query: {
      id: 'att-1',
      orgId: 'org-b',
      role: 'Owner',
      userId: 'evil',
      ndaAccepted: 'true',
      asInline: 'true',
    },
    headers: {
      cookie: 'enabion_session=tokenA',
    },
  } as Partial<NextApiRequest>;

  const resHeaders: Record<string, string | string[]> = {};
  const res = {
    setHeader: (name: string, value: string | string[]) => {
      resHeaders[name.toLowerCase()] = value;
      return res;
    },
    status: (code: number) => {
      (res as any).statusCode = code;
      return res;
    },
    json: (payload: any) => {
      (res as any).jsonBody = payload;
      return res;
    },
    end: (payload?: any) => {
      (res as any).ended = true;
      (res as any).endPayload = payload;
      return res;
    },
  } as Partial<NextApiResponse>;

  try {
    await handler(req as NextApiRequest, res as NextApiResponse);

    assert(capturedUrl, 'fetch should be called');
    const parsed = new URL(capturedUrl);

    assert(!parsed.searchParams.has('orgId'), 'proxy must not forward orgId');
    assert(!parsed.searchParams.has('role'), 'proxy must not forward role');
    assert(!parsed.searchParams.has('userId'), 'proxy must not forward userId');
    assert(
      !parsed.searchParams.has('ndaAccepted'),
      'proxy must not forward ndaAccepted',
    );
    assert(
      parsed.searchParams.get('asInline') === 'true',
      'proxy must forward asInline',
    );

    assert(
      capturedOptions?.headers?.cookie === 'enabion_session=tokenA',
      'proxy must forward cookie header',
    );

    // eslint-disable-next-line no-console
    console.log('Tenant proxy isolation tests passed.');
  } finally {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).fetch;
    }
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
