import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DatabaseShape, Job, AuthUser } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DATA_DIR, 'volttrack.json');

const emptyDb = (): DatabaseShape => ({ users: [], jobs: [] });

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb(), null, 2), 'utf8');
  }
}

export function readDb(): DatabaseShape {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as DatabaseShape;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return emptyDb();
  }
}

export function writeDb(db: DatabaseShape) {
  ensureDbFile();
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

export function updateUsers(mutator: (users: AuthUser[]) => AuthUser[]) {
  const db = readDb();
  db.users = mutator(db.users);
  writeDb(db);
  return db.users;
}

export function updateJobs(mutator: (jobs: Job[]) => Job[]) {
  const db = readDb();
  db.jobs = mutator(db.jobs);
  writeDb(db);
  return db.jobs;
}

export function findUserByUsername(username: string) {
  return readDb().users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function findUserById(id: string) {
  return readDb().users.find(u => u.id === id) || null;
}

export function findJobById(id: string) {
  return readDb().jobs.find(j => j.id === id) || null;
}
