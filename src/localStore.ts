import type {
  AuthRole,
  AuthUser,
  Job,
  TestStage,
  TransformerCapacity,
  TransformerTest,
  TransformerType,
  UserRole,
} from './types';

const JOBS_KEY = 'volttrack_local_jobs_v1';
const USERS_KEY = 'volttrack_local_users_v1';
const OFFLINE_KEY = 'volttrack_offline_v1';

const TEST_NAMES = [
  'CT TEST',
  'BUSHING TEST',
  '2 KV TEST',
  'PRE-CONNECTION TEST',
  'POST-CONNECTION TEST',
  'PRE & POST VPD SERVICING',
  'OIL SOAKING SERVICING PLANNING',
  'POST-TANKING TEST',
  'FINAL LV TEST REPORT',
  'Checklist for TFR BEFORE HV',
  'List of HV Test',
] as const;

const AUTO_8MVA_RATING_DEFAULTS: Record<string, string> = {
  rating_sr_no: 'V/M/ 2061',
  rating_comm_year: '2026',
  rating_hv_v: '55',
  rating_lv_v: '27.5',
  rating_hv_a: '145.45',
  rating_lv_a: '290.91',
  rating_oil_ltrs: '2500 Ltrs',
  rating_oil_kg: '2225 kG',
  rating_core_wdg: '7350 kG',
  rating_taps: 'NA',
  rating_impedance: '0.49 %',
  rating_temp_rise: '40/50 °C',
  rating_transport_wt: '13375 KG (WITH OIL)',
  rating_radiators: '4 NOS',
};

const AUTO_12_3MVA_RATING_DEFAULTS: Record<string, string> = {
  rating_sr_no: 'V/M/ 2061',
  rating_comm_year: '2026',
  rating_hv_v: '55',
  rating_lv_v: '27.5',
  rating_hv_a: '223.64',
  rating_lv_a: '447.27',
  rating_oil_ltrs: '3100 Ltrs',
  rating_oil_kg: '2759 kG',
  rating_core_wdg: '10200 kG',
  rating_taps: 'NA',
  rating_impedance: '0.49 %',
  rating_temp_rise: '40/50 °C',
  rating_transport_wt: '17259 KG (WITH OIL)',
  rating_radiators: '4 NOS',
};

const AUTO_16_5MVA_RATING_DEFAULTS: Record<string, string> = {
  rating_sr_no: 'V/M/ 3260',
  rating_comm_year: '2026',
  rating_hv_v: '55',
  rating_lv_v: '27.5',
  rating_hv_a: '300.00',
  rating_lv_a: '600.00',
  rating_oil_ltrs: '3450 Ltrs',
  rating_oil_kg: '3070 kG',
  rating_core_wdg: '12275 kG',
  rating_taps: 'NA',
  rating_impedance: '0.55 %',
  rating_temp_rise: '40/50 °C',
  rating_transport_wt: '19845 KG (WITH OIL)',
  rating_radiators: '4 NOS',
};

function getJobRatingDefaults(type: TransformerType, capacity: TransformerCapacity) {
  if (type === 'Auto' && capacity === '8MVA') return AUTO_8MVA_RATING_DEFAULTS;
  if (type === 'Auto' && capacity === '12.3MVA') return AUTO_12_3MVA_RATING_DEFAULTS;
  if (type === 'Auto' && capacity === '16.5MVA') return AUTO_16_5MVA_RATING_DEFAULTS;
  return {
    rating_hv_v: '55',
    rating_lv_v: '27.5',
    rating_hv_a: '300',
    rating_lv_a: '600',
    rating_oil_ltrs: '3450',
    rating_oil_kg: '3070',
    rating_core_wdg: '12275',
    rating_taps: 'NA',
    rating_impedance: '0.55',
    rating_temp_rise: '40/50',
    rating_transport_wt: '19845',
    rating_radiators: '4',
  };
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function recomputeJobStatus(tests: TransformerTest[]) {
  const hasAuthorizerSignOff = (test: TransformerTest) => {
    const n = test.name.toUpperCase();
    const data = test.observationData || {};
    if (n === 'POST-CONNECTION TEST') return String(data.pct_authorized_by || '').trim().length > 0;
    if (n === 'POST-TANKING TEST') return String(data.pt_authorized_by || '').trim().length > 0;
    return String(data.authorized_by || '').trim().length > 0;
  };
  return tests.every(t => t.stage === 'Authorized' && hasAuthorizerSignOff(t))
    ? 'Completed'
    : 'Processing';
}

export function isOfflineMode() {
  return localStorage.getItem(OFFLINE_KEY) === '1';
}

export function setOfflineMode(enabled: boolean) {
  if (enabled) localStorage.setItem(OFFLINE_KEY, '1');
  else localStorage.removeItem(OFFLINE_KEY);
}

export function loadLocalJobs(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Job[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalJobs(jobs: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function replaceLocalJob(job: Job): Job {
  const jobs = loadLocalJobs();
  const next = jobs.some(j => j.id === job.id)
    ? jobs.map(j => (j.id === job.id ? job : j))
    : [job, ...jobs];
  saveLocalJobs(next);
  return job;
}

export function deleteLocalJob(jobId: string): boolean {
  const jobs = loadLocalJobs();
  const next = jobs.filter(j => j.id !== jobId);
  if (next.length === jobs.length) return false;
  saveLocalJobs(next);
  return true;
}

export function createLocalJob(input: {
  name: string;
  capacity: TransformerCapacity;
  type: TransformerType;
}): Job {
  const now = Date.now();
  const tests: TransformerTest[] = TEST_NAMES.map(name => ({
    id: newId(),
    name,
    stage: 'Not Started',
    accepted: false,
    updatedAt: now,
    observationData: {},
  }));

  const matches = input.name.match(/\d+/g);
  const jobNumber = matches && matches.length > 0 ? matches[matches.length - 1] : '';
  const autoSrNo = jobNumber ? `V/M/${jobNumber}` : '';
  const ratingDefaults = getJobRatingDefaults(input.type, input.capacity);

  const job: Job = {
    id: newId(),
    name: input.name.trim(),
    capacity: input.capacity,
    type: input.type,
    createdAt: now,
    status: 'Processing',
    tests,
    ratingData: {
      ...ratingDefaults,
      rating_sr_no: autoSrNo || input.name.trim() || ratingDefaults.rating_sr_no || '',
    },
  };

  const jobs = [job, ...loadLocalJobs()];
  saveLocalJobs(jobs);
  return job;
}

export function updateLocalRating(jobId: string, ratingData: Record<string, string>): Job | null {
  const job = loadLocalJobs().find(j => j.id === jobId);
  if (!job) return null;
  return replaceLocalJob({ ...job, ratingData: { ...ratingData } });
}

export function updateLocalObservation(
  jobId: string,
  testId: string,
  observationData: Record<string, string>
): { job: Job; test: TransformerTest } | null {
  const job = loadLocalJobs().find(j => j.id === jobId);
  if (!job) return null;
  let updatedTest: TransformerTest | null = null;
  const tests = job.tests.map(test => {
    if (test.id !== testId) return test;
    updatedTest = {
      ...test,
      observationData: { ...observationData },
      updatedAt: Date.now(),
    };
    return updatedTest;
  });
  if (!updatedTest) return null;
  const next = replaceLocalJob({ ...job, tests });
  return { job: next, test: updatedTest };
}

export function updateLocalStage(
  jobId: string,
  testId: string,
  targetStage: TestStage,
  action: 'promote' | 'reject' = 'promote'
): { job: Job; openTestId?: string | null } | null {
  const job = loadLocalJobs().find(j => j.id === jobId);
  if (!job) return null;

  let openTestId: string | null = null;
  const nowString = new Date().toLocaleString();

  const techKey = (name: string) => {
    const n = name.toUpperCase();
    if (n === 'POST-CONNECTION TEST') return 'pct_tested_by';
    if (n === 'POST-TANKING TEST') return 'pt_tested_by';
    if (n === 'FINAL LV TEST REPORT') return 'offered_by';
    return 'tested_by';
  };
  const revKey = (name: string) => {
    const n = name.toUpperCase();
    if (n === 'POST-CONNECTION TEST') return 'pct_reviewed_by';
    if (n === 'POST-TANKING TEST') return 'pt_reviewed_by';
    if (n === 'FINAL LV TEST REPORT') return 'tested_by';
    return 'reviewed_by';
  };
  const clearPerson = (data: Record<string, string>, byKey: string, dateKeys: string[]) => {
    delete data[byKey];
    for (const k of dateKeys) delete data[k];
  };

  const tests = job.tests.map(test => {
    if (test.id !== testId) return test;

    let observationData = { ...(test.observationData || {}) };
    const isFinalLv = test.name.toUpperCase() === 'FINAL LV TEST REPORT';
    const isPct = test.name.toUpperCase() === 'POST-CONNECTION TEST';
    const isPt = test.name.toUpperCase() === 'POST-TANKING TEST';

    if (action === 'promote') {
      if (targetStage === 'Reviewed' && !String(observationData[techKey(test.name)] || '').trim()) {
        return test;
      }
      if (targetStage === 'Authorized' && !String(observationData[revKey(test.name)] || '').trim()) {
        return test;
      }

      if (isPct) {
        if (observationData.pct_tested_by && !observationData.pct_tested_date) observationData.pct_tested_date = nowString;
        if ((targetStage === 'Reviewed' || targetStage === 'Authorized') && observationData.pct_reviewed_by && !observationData.pct_reviewed_date) {
          observationData.pct_reviewed_date = nowString;
        }
        if (targetStage === 'Authorized' && observationData.pct_authorized_by && !observationData.pct_authorized_date) {
          observationData.pct_authorized_date = nowString;
        }
      }
      if (isPt) {
        if (observationData.pt_tested_by && !observationData.pt_tested_date) observationData.pt_tested_date = nowString;
        if ((targetStage === 'Reviewed' || targetStage === 'Authorized') && observationData.pt_reviewed_by && !observationData.pt_reviewed_date) {
          observationData.pt_reviewed_date = nowString;
        }
        if (targetStage === 'Authorized' && observationData.pt_authorized_by && !observationData.pt_authorized_date) {
          observationData.pt_authorized_date = nowString;
        }
      }

      if (targetStage === 'Tested') {
        if (isFinalLv) {
          observationData = {
            ...observationData,
            offered_at: observationData.offered_at || nowString,
            offered_by: observationData.offered_by || '',
          };
        } else {
          observationData = {
            ...observationData,
            tested_at: nowString,
            tested_by: observationData.tested_by || '',
          };
        }
        openTestId = test.id;
      }
      if (targetStage === 'Reviewed') {
        if (isFinalLv) {
          observationData = {
            ...observationData,
            tested_at: nowString,
            tested_by: observationData.tested_by || '',
          };
        } else {
          observationData = {
            ...observationData,
            reviewed_at: nowString,
            reviewed_by: observationData.reviewed_by || '',
          };
        }
      }
      if (targetStage === 'Authorized') {
        observationData = {
          ...observationData,
          authorized_at: nowString,
          authorized_by: observationData.authorized_by || '',
        };
      }
      return { ...test, stage: targetStage, observationData, updatedAt: Date.now() };
    }

    if (targetStage === 'Tested') {
      clearPerson(observationData, 'reviewed_by', ['reviewed_at', 'reviewed_date']);
      clearPerson(observationData, 'pct_reviewed_by', ['pct_reviewed_date', 'pct_reviewed_at']);
      clearPerson(observationData, 'pt_reviewed_by', ['pt_reviewed_date', 'pt_reviewed_at']);
    } else if (targetStage === 'Reviewed') {
      clearPerson(observationData, 'authorized_by', ['authorized_at', 'authorized_date']);
      clearPerson(observationData, 'pct_authorized_by', ['pct_authorized_date', 'pct_authorized_at']);
      clearPerson(observationData, 'pt_authorized_by', ['pt_authorized_date', 'pt_authorized_at']);
    } else if (targetStage === 'Not Started') {
      clearPerson(observationData, 'tested_by', ['tested_at', 'tested_date']);
      clearPerson(observationData, 'reviewed_by', ['reviewed_at', 'reviewed_date']);
      clearPerson(observationData, 'authorized_by', ['authorized_at', 'authorized_date']);
      clearPerson(observationData, 'offered_by', ['offered_at', 'offered_date']);
      clearPerson(observationData, 'pct_tested_by', ['pct_tested_date', 'pct_tested_at']);
      clearPerson(observationData, 'pct_reviewed_by', ['pct_reviewed_date', 'pct_reviewed_at']);
      clearPerson(observationData, 'pct_authorized_by', ['pct_authorized_date', 'pct_authorized_at']);
      clearPerson(observationData, 'pt_tested_by', ['pt_tested_date', 'pt_tested_at']);
      clearPerson(observationData, 'pt_reviewed_by', ['pt_reviewed_date', 'pt_reviewed_at']);
      clearPerson(observationData, 'pt_authorized_by', ['pt_authorized_date', 'pt_authorized_at']);
    }

    return { ...test, stage: targetStage, observationData, updatedAt: Date.now() };
  });

  const next = replaceLocalJob({
    ...job,
    tests,
    status: recomputeJobStatus(tests),
  });
  return { job: next, openTestId };
}

export function acceptLocalTest(jobId: string, testId: string): Job | null {
  const job = loadLocalJobs().find(j => j.id === jobId);
  if (!job) return null;
  const tests = job.tests.map(test =>
    test.id === testId ? { ...test, accepted: true, updatedAt: Date.now() } : test
  );
  return replaceLocalJob({ ...job, tests });
}

export function unacceptLocalTest(jobId: string, testId: string): Job | null {
  const job = loadLocalJobs().find(j => j.id === jobId);
  if (!job) return null;
  let touched = false;
  const tests = job.tests.map(test => {
    if (test.id !== testId) return test;
    if (test.stage !== 'Not Started') return test;
    touched = true;
    return { ...test, accepted: false, updatedAt: Date.now() };
  });
  if (!touched) return null;
  return replaceLocalJob({ ...job, tests });
}

export function acceptAllLocalTests(jobId: string): Job | null {
  const job = loadLocalJobs().find(j => j.id === jobId);
  if (!job) return null;
  const tests = job.tests.map(test =>
    test.accepted === false ? { ...test, accepted: true, updatedAt: Date.now() } : test
  );
  return replaceLocalJob({ ...job, tests });
}

export function isNetworkError(err: unknown) {
  return (
    err instanceof TypeError ||
    (err instanceof Error &&
      /failed to fetch|networkerror|request failed|econnrefused/i.test(err.message))
  );
}

export type LocalUser = AuthUser & { password: string };

function loadLocalUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function authRoleToUserRole(role: AuthRole): UserRole {
  if (role === 'Tester') return 'Admin_Tested';
  if (role === 'Reviewer') return 'Admin_Reviewed';
  return 'Admin_Authorized';
}

export function registerLocalUser(input: {
  name: string;
  username: string;
  password: string;
  role: AuthRole;
}): LocalUser {
  const username = input.username.trim().toLowerCase();
  const users = loadLocalUsers();
  if (users.some(u => u.username === username)) {
    throw new Error('Username already exists');
  }

  const user: LocalUser = {
    id: newId(),
    name: input.name.trim(),
    username,
    password: input.password,
    role: input.role,
    createdAt: Date.now(),
  };
  saveLocalUsers([user, ...users]);
  return user;
}

export function loginLocalUser(input: {
  username: string;
  password: string;
  role: AuthRole;
}): LocalUser | null {
  const username = input.username.trim().toLowerCase();
  const user = loadLocalUsers().find(
    u => u.username === username && u.password === input.password && u.role === input.role
  );
  return user || null;
}

export function listLocalUsers(): Array<Omit<LocalUser, 'password'>> {
  return loadLocalUsers().map(({ password: _password, ...user }) => user);
}

const NOTIFICATIONS_KEY = 'volttrack_local_notifications_v1';

export type AppNotification = {
  id: string;
  role: AuthRole;
  title: string;
  message: string;
  jobId?: string;
  testId?: string;
  createdAt: number;
  read: boolean;
};

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 100)));
}

export function pushNotification(input: {
  role: AuthRole;
  title: string;
  message: string;
  jobId?: string;
  testId?: string;
}): AppNotification {
  const item: AppNotification = {
    id: newId(),
    role: input.role,
    title: input.title,
    message: input.message,
    jobId: input.jobId,
    testId: input.testId,
    createdAt: Date.now(),
    read: false,
  };
  saveNotifications([item, ...loadNotifications()]);
  return item;
}

export function listNotificationsForRole(role: AuthRole): AppNotification[] {
  return loadNotifications()
    .filter(n => n.role === role)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function markNotificationRead(id: string) {
  const next = loadNotifications().map(n => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(next);
}

export function markAllNotificationsRead(role: AuthRole) {
  const next = loadNotifications().map(n => (n.role === role ? { ...n, read: true } : n));
  saveNotifications(next);
}

export function unreadNotificationCount(role: AuthRole) {
  return loadNotifications().filter(n => n.role === role && !n.read).length;
}
