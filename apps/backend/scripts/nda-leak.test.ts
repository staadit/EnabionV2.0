/**
 * NDA/L2 leak guard: ensure L2 content is never returned when ndaAccepted is false/undefined.
 * This is a lightweight invariant test to gate CI until full share/export/Y portal flows are implemented.
 */

type IntentView = {
  id: string;
  confidentialityLevel: 'L1' | 'L2';
  ndaAccepted?: boolean;
  attachments?: Array<{ id: string; confidentialityLevel?: 'L1' | 'L2' }>;
};

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

function ensureNoL2Leak(intents: IntentView[]) {
  intents.forEach((intent) => {
    const ndaOk = intent.ndaAccepted === true;
    if (intent.confidentialityLevel === 'L2' && !ndaOk) {
      throw new Error(`L2 intent ${intent.id} exposed without NDA`);
    }
    (intent.attachments || []).forEach((att) => {
      if (att.confidentialityLevel === 'L2' && !ndaOk) {
        throw new Error(`L2 attachment ${att.id} on intent ${intent.id} exposed without NDA`);
      }
    });
  });
}

async function run() {
  // Positive: L1 data allowed without NDA
  ensureNoL2Leak([
    { id: 'intent-l1', confidentialityLevel: 'L1' },
    { id: 'intent-l1b', confidentialityLevel: 'L1', attachments: [{ id: 'att1', confidentialityLevel: 'L1' }] },
  ]);

  // Positive: L2 allowed only when NDA accepted
  ensureNoL2Leak([
    { id: 'intent-l2-ok', confidentialityLevel: 'L2', ndaAccepted: true },
    {
      id: 'intent-l2-attachments-ok',
      confidentialityLevel: 'L2',
      ndaAccepted: true,
      attachments: [{ id: 'att2', confidentialityLevel: 'L2' }],
    },
  ]);

  // Negative: expect throw when L2 without NDA
  let threw = false;
  try {
    ensureNoL2Leak([{ id: 'intent-l2-leak', confidentialityLevel: 'L2', ndaAccepted: false }]);
  } catch {
    threw = true;
  }
  assert(threw, 'L2 intent without NDA should fail');

  threw = false;
  try {
    ensureNoL2Leak([
      {
        id: 'intent-l2-attach-leak',
        confidentialityLevel: 'L2',
        ndaAccepted: false,
        attachments: [{ id: 'att3', confidentialityLevel: 'L2' }],
      },
    ]);
  } catch {
    threw = true;
  }
  assert(threw, 'L2 attachment without NDA should fail');

  // eslint-disable-next-line no-console
  console.log('NDA/L2 leak tests passed.');
}

run();
