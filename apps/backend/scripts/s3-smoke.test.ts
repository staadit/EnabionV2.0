import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const requiredEnv = [
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.log(
    `S3 smoke test skipped: missing env ${missing.join(', ')} (set S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY).`,
  );
  process.exit(0);
}

async function main() {
  const client = new S3Client({
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });

  const bucket = process.env.S3_BUCKET!;
  console.log(`S3 smoke: HEAD bucket '${bucket}'...`);

  await client.send(new HeadBucketCommand({ Bucket: bucket }));

  console.log('S3 smoke: OK (bucket reachable)');
}

main().catch((err) => {
  console.error('S3 smoke failed:', err?.message || err);
  process.exit(1);
});
