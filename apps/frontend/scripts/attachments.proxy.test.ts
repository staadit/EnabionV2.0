function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  process.env.BACKEND_URL = 'http://backend.test';
  const handler = (await import('../pages/api/intents/[id]/attachments')).default;

  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedOptions: any = null;

  globalThis.fetch = (async (url: any, options?: any) => {
    capturedUrl = String(url);
    capturedOptions = options || {};
    return {
      status: 200,
      text: async () => JSON.stringify({ items: [] }),
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
        id: 'intent-1',
        ndaAccepted: 'true',
        orgId: 'evil',
      },
      headers: { cookie: 'enabion_session=tokenA' },
    } as any;

    await handler(reqGet, res);
    assert(
      capturedUrl.includes('/v1/intents/intent-1/attachments'),
      'Proxy must call /v1/intents/:id/attachments',
    );
    assert(
      capturedUrl.includes('ndaAccepted=true'),
      'Proxy must forward ndaAccepted parameter',
    );
    assert(!capturedUrl.includes('orgId='), 'Proxy must not forward orgId');
    assert(
      capturedOptions?.headers?.cookie === 'enabion_session=tokenA',
      'Proxy must forward cookie',
    );

    capturedUrl = '';
    capturedOptions = null;
    const reqPost = {
      method: 'POST',
      query: { id: 'intent-1' },
      headers: {
        cookie: 'enabion_session=tokenA',
        'content-type': 'multipart/form-data; boundary=----test',
        'content-length': '42',
      },
    } as any;

    await handler(reqPost, res);
    assert(capturedOptions?.method === 'POST', 'Proxy must POST to backend');
    assert(
      capturedOptions?.headers?.['content-type']?.includes('multipart/form-data'),
      'Proxy must forward content-type',
    );
    assert(
      capturedOptions?.headers?.['content-length'] === '42',
      'Proxy must forward content-length',
    );
    assert(
      capturedOptions?.headers?.cookie === 'enabion_session=tokenA',
      'Proxy must forward cookie',
    );
    assert(capturedOptions?.body === reqPost, 'Proxy must stream request body');
    assert(capturedOptions?.duplex === 'half', 'Proxy must set duplex for streams');
  } finally {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).fetch;
    }
  }

  // eslint-disable-next-line no-console
  console.log('Attachments proxy tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
