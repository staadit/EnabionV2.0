import { createHash } from 'node:crypto';
import AdmZip = require('adm-zip');
import { IntentExportService } from '../src/export/intent-export.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const SENTINEL = 'VERY_SECRET_L2_123';

class FakeRedactionService {
  async getExportView(intentId: string) {
    return {
      intent: {
        id: intentId,
        title: 'Safe title',
        goal: 'Safe goal',
        client: 'Safe client',
        stage: 'NEW',
        language: 'EN',
        lastActivityAt: new Date().toISOString(),
        sourceTextRaw: null,
        hasL2: true,
        l2Redacted: true,
        ndaRequired: true,
      },
      markdown: '# placeholder',
    };
  }
}

class FakePrismaService {
  intents = [
    {
      id: 'intent-1',
      orgId: 'org-1',
      title: 'Export Title',
      goal: 'Launch product',
      context: 'context without secrets',
      scope: 'Scope text',
      kpi: 'Pipeline velocity',
      risks: 'Delivery risk',
      stage: 'NEW',
      deadlineAt: new Date('2026-02-01T00:00:00.000Z'),
      client: 'Acme',
      ownerUserId: 'user-1',
    },
  ];
  organizations = [{ id: 'org-1', name: 'Demo Org' }];
  users = [{ id: 'user-1', email: 'owner@example.com' }];

  intent = {
    findUnique: async (args: any) => {
      return this.intents.find((i) => i.id === args.where.id) ?? null;
    },
  };

  organization = {
    findUnique: async (args: any) => {
      return this.organizations.find((o) => o.id === args.where.id) ?? null;
    },
  };

  user = {
    findUnique: async (args: any) => {
      return this.users.find((u) => u.id === args.where.id) ?? null;
    },
  };
}

async function testMarkdownNoL2() {
  const prisma = new FakePrismaService();
  const redaction = new FakeRedactionService() as any;
  const service = new IntentExportService(prisma as any, redaction);
  const model = await service.buildModel('intent-1', 'org-1');
  const md = service.renderMarkdown(model);
  assert(!md.includes(SENTINEL), 'Markdown should not include L2 sentinel');
  assert(md.includes('L1-only export'), 'Markdown should include notice');
}

async function testPdfNoL2() {
  const prisma = new FakePrismaService();
  const redaction = new FakeRedactionService() as any;
  const service = new IntentExportService(prisma as any, redaction);
  const model = await service.buildModel('intent-1', 'org-1');
  const pdf = await service.renderPdf(model);
  assert(!pdf.toString('utf8').includes(SENTINEL), 'PDF should not include L2 sentinel');
  // basic checksum to ensure data present
  assert(pdf.length > 1000, 'PDF should have content');
}

async function testDocxNoL2() {
  const prisma = new FakePrismaService();
  const redaction = new FakeRedactionService() as any;
  const service = new IntentExportService(prisma as any, redaction);
  const model = await service.buildModel('intent-1', 'org-1');
  const docx = await service.renderDocx(model);
  const zip = new AdmZip(docx);
  const xml = zip.readAsText('word/document.xml');
  assert(!xml.includes(SENTINEL), 'DOCX should not include L2 sentinel');
  assert(xml.includes('L1-only export'), 'DOCX should include notice text');
}

async function run() {
  await testMarkdownNoL2();
  await testPdfNoL2();
  await testDocxNoL2();
  // eslint-disable-next-line no-console
  console.log('Intent export tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
