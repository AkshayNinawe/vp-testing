import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { recomputeJobStatus } from '../jobFactory';
import type { Job } from '../types';

const MONGODB_URI =
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/volttrack';

function resolveDbName(uri: string) {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, '');
    if (pathname) return pathname.split('?')[0];
  } catch {
    // ignore invalid URL parsing for non-standard URIs
  }
  return 'volttrack';
}

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const dbName = resolveDbName(MONGODB_URI);
  const client = new MongoClient(MONGODB_URI);

  await client.connect();
  const jobs = client.db(dbName).collection<Job>('jobs');

  const docs = await jobs.find({}).sort({ createdAt: -1 }).toArray();

  console.log(`Database : ${dbName}`);
  console.log(`Mode     : ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log(`Jobs     : ${docs.length}`);
  console.log('');

  const changes: Array<{ name: string; from: string; to: string }> = [];

  for (const doc of docs) {
    const tests = Array.isArray(doc.tests) ? doc.tests : [];
    const expected = recomputeJobStatus(tests);

    if (doc.status === expected) continue;

    changes.push({ name: doc.name, from: doc.status, to: expected });

    if (!DRY_RUN) {
      await jobs.updateOne({ id: doc.id }, { $set: { status: expected } });
    }
  }

  if (changes.length === 0) {
    console.log('All job statuses are already correct. Nothing to do.');
  } else {
    console.log(`${DRY_RUN ? 'Would update' : 'Updated'} ${changes.length} job(s):`);
    console.log('');
    for (const change of changes) {
      console.log(`  ${change.name.padEnd(16)} ${change.from} -> ${change.to}`);
    }
    console.log('');

    const toCompleted = changes.filter(c => c.to === 'Completed').length;
    const toProcessing = changes.filter(c => c.to === 'Processing').length;
    console.log(`  -> Completed  : ${toCompleted}`);
    console.log(`  -> Processing : ${toProcessing}`);
  }

  if (DRY_RUN && changes.length > 0) {
    console.log('');
    console.log('Re-run without --dry-run to apply these changes.');
  }

  await client.close();
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});