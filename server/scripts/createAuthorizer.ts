/**
 * Create a staff account (default role: Authorizer) directly against MongoDB.
 *
 * WHY THIS SCRIPT EXISTS
 * ----------------------
 * The HTTP API deliberately refuses to create Authorizer accounts after the
 * first one:
 *
 *   - POST /auth/register  -> an Authorizer may only create Tester/Reviewer.
 *                             Creating an Authorizer is allowed ONLY during
 *                             bootstrap (when zero Authorizers exist).
 *   - PATCH /users/:userId -> refuses to promote a Tester/Reviewer to Authorizer.
 *
 * That restriction is a security control (Authorizer is the final approval tier
 * on test reports), so we do NOT relax it. Instead this root-only CLI script
 * provides a deliberate, auditable path for the rare case of onboarding a new
 * Authorizer.
 *
 * Passwords are bcrypt hashed, so a manual `db.users.insertOne(...)` in mongosh
 * would create an account that can never log in. This script reuses the real
 * hashPassword() helper so the resulting document is identical to one created
 * through the API.
 *
 * USAGE
 *   npx tsx server/scripts/createAuthorizer.ts --list
 *
 *   npx tsx server/scripts/createAuthorizer.ts \
 *     --name "SHREYAS BHAVE" --username shreyas --password "secret" --dry-run
 *
 *   # same command without --dry-run to actually write
 *
 * FLAGS
 *   --name      Display name. Shown in the staff list. (required)
 *   --username  Login username. Lowercased, must be unique. (required)
 *   --password  Min 4 chars, matching the API rule. (required)
 *   --role      Tester | Reviewer | Authorizer. Default: Authorizer.
 *   --dry-run   Validate and report, but write nothing.
 *   --list      Print existing users and exit.
 *
 * No pm2 restart is needed afterwards - the API reads users per request.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';
import { hashPassword } from '../auth';
import type { AuthRole, AuthUser } from '../types';

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

const AUTH_ROLES: AuthRole[] = ['Tester', 'Reviewer', 'Authorizer'];

function getFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;

  const value = process.argv[index + 1];
  // Guard against `--name --username x` swallowing the next flag.
  if (!value || value.startsWith('--')) return undefined;
  return value;
}

const DRY_RUN = process.argv.includes('--dry-run');
const LIST_ONLY = process.argv.includes('--list');

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function main() {
  const dbName = resolveDbName(MONGODB_URI);
  const client = new MongoClient(MONGODB_URI);

  await client.connect();
  const users = client.db(dbName).collection<AuthUser>('users');

  console.log(`Database : ${dbName}`);

  if (LIST_ONLY) {
    const docs = await users.find({}).sort({ createdAt: 1 }).toArray();
    console.log(`Users    : ${docs.length}`);
    console.log('');
    for (const doc of docs) {
      console.log(`  ${String(doc.username).padEnd(20)} ${String(doc.role).padEnd(12)} ${doc.name}`);
    }
    console.log('');
    await client.close();
    return;
  }

  const name = (getFlag('name') || '').trim();
  const username = (getFlag('username') || '').trim().toLowerCase();
  const password = getFlag('password') || '';
  const role = ((getFlag('role') || 'Authorizer').trim() as AuthRole);

  // Validation mirrors POST /auth/register so accounts are consistent.
  if (!name) fail('--name is required. Example: --name "SHREYAS BHAVE"');
  if (!username) fail('--username is required. Example: --username shreyas');
  if (!password) fail('--password is required');
  if (password.length < 4) fail('Password must be at least 4 characters');
  if (!AUTH_ROLES.includes(role)) {
    fail(`--role must be one of: ${AUTH_ROLES.join(', ')}`);
  }

  console.log(`Mode     : ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log('');

  const existing = await users.findOne({ username });
  if (existing) {
    fail(
      `Username "${username}" already exists (role: ${existing.role}, name: ${existing.name}). ` +
        'Choose a different username, or edit the existing user from the Staff screen.'
    );
  }

  console.log('Will create:');
  console.log(`  Name     : ${name}`);
  console.log(`  Username : ${username}`);
  console.log(`  Role     : ${role}`);
  console.log('  Password : (hidden, will be bcrypt hashed)');
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run - nothing was written.');
    console.log('Re-run without --dry-run to create this account.');
    await client.close();
    return;
  }

  const user: AuthUser = {
    id: randomUUID(),
    name,
    username,
    passwordHash: await hashPassword(password),
    role,
    createdAt: Date.now(),
  };

  await users.insertOne({ ...user });

  const authorizerCount = await users.countDocuments({ role: 'Authorizer' });

  console.log(`Created ${role} "${name}" (id: ${user.id})`);
  console.log(`Authorizer accounts now: ${authorizerCount}`);
  console.log('');
  console.log(`Verify by logging in at the app with username "${username}" and role "${role}".`);

  await client.close();
}

main().catch(err => {
  console.error('Create user failed:', err);
  process.exit(1);
});