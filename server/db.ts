import { MongoClient, type Collection, type Db } from 'mongodb';
import type { AuthUser, Job } from './types';

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

const DB_NAME = resolveDbName(MONGODB_URI);

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);

  await users().createIndex({ username: 1 }, { unique: true });
  await users().createIndex({ id: 1 }, { unique: true });
  await jobs().createIndex({ id: 1 }, { unique: true });
  await jobs().createIndex({ createdAt: -1 });

  console.log(`MongoDB connected: ${DB_NAME}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return db;
}

function users(): Collection<AuthUser> {
  return getDb().collection<AuthUser>('users');
}

function jobs(): Collection<Job> {
  return getDb().collection<Job>('jobs');
}

function stripMongoId<T extends object>(doc: T & { _id?: unknown }): T {
  const { _id, ...rest } = doc as T & { _id?: unknown };
  return rest as T;
}

export async function findUserByUsername(username: string): Promise<AuthUser | null> {
  const user = await users().findOne({ username: username.toLowerCase() });
  return user ? stripMongoId(user) : null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const user = await users().findOne({ id });
  return user ? stripMongoId(user) : null;
}

export async function insertUser(user: AuthUser): Promise<AuthUser> {
  await users().insertOne({ ...user });
  return user;
}

export async function countUsersByRole(role: AuthUser['role']): Promise<number> {
  return users().countDocuments({ role });
}

export async function listUsers(): Promise<AuthUser[]> {
  const docs = await users().find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(doc => stripMongoId(doc));
}

export async function updateUserById(
  userId: string,
  patch: Partial<Pick<AuthUser, 'name' | 'username' | 'role' | 'passwordHash'>>
): Promise<AuthUser | null> {
  const existing = await findUserById(userId);
  if (!existing) return null;
  const next: AuthUser = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
  };
  const result = await users().replaceOne({ id: userId }, { ...next });
  if (result.matchedCount === 0) return null;
  return next;
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const result = await users().deleteOne({ id: userId });
  return result.deletedCount > 0;
}

export async function listJobs(): Promise<Job[]> {
  const docs = await jobs().find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(doc => stripMongoId(doc));
}

export async function findJobById(id: string): Promise<Job | null> {
  const job = await jobs().findOne({ id });
  return job ? stripMongoId(job) : null;
}

export async function insertJob(job: Job): Promise<Job> {
  await jobs().insertOne({ ...job });
  return job;
}

export async function replaceJob(job: Job): Promise<Job | null> {
  const result = await jobs().replaceOne({ id: job.id }, { ...job });
  if (result.matchedCount === 0) return null;
  return job;
}

export async function updateJobById(
  jobId: string,
  mutator: (job: Job) => Job | null
): Promise<Job | null> {
  const existing = await findJobById(jobId);
  if (!existing) return null;
  const next = mutator(existing);
  if (!next) return null;
  return replaceJob(next);
}

export async function deleteJobById(jobId: string): Promise<boolean> {
  const result = await jobs().deleteOne({ id: jobId });
  return result.deletedCount > 0;
}
