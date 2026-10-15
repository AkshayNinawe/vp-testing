import type { AuthRole } from './types';

/** Clear legacy offline/local job+user caches from older builds. */
export function clearLegacyLocalData() {
  try {
    localStorage.removeItem('volttrack_offline_v1');
    localStorage.removeItem('volttrack_local_jobs_v1');
    localStorage.removeItem('volttrack_local_users_v1');
  } catch {
    // ignore
  }
}

export function isNetworkError(err: unknown) {
  return (
    err instanceof TypeError ||
    (err instanceof Error &&
      /failed to fetch|networkerror|request failed|econnrefused/i.test(err.message))
  );
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

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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