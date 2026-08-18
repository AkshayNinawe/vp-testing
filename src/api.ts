import type { AuthRole, AuthUser, Job, TestStage, TransformerCapacity, TransformerType, UserRole } from './types';

const TOKEN_KEY = 'volttrack_token_v1';
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export type PublicAuthUser = Omit<AuthUser, 'password'> & { password?: never };

export type ApiError = Error & { status?: number };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string | null) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },

  registrationStatus() {
    return request<{
      canBootstrapAuthorizer: boolean;
      staffRegistrationRequiresAuthorizer: boolean;
    }>('/auth/registration-status');
  },

  register(body: { name: string; username: string; password: string; role: AuthRole }) {
    return request<{ user: PublicAuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  login(body: { username: string; password: string; role: AuthRole }) {
    return request<{ token: string; user: PublicAuthUser; userRole: UserRole }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  me() {
    return request<{ user: PublicAuthUser; userRole: UserRole }>('/auth/me');
  },

  logout() {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  listUsers() {
    return request<{ users: PublicAuthUser[] }>('/users');
  },

  updateUser(
    userId: string,
    body: { name?: string; username?: string; role?: AuthRole; password?: string }
  ) {
    return request<{ user: PublicAuthUser }>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  deleteUser(userId: string) {
    return request<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  listJobs() {
    return request<{ jobs: Job[] }>('/jobs');
  },

  createJob(body: { name: string; capacity: TransformerCapacity; type: TransformerType }) {
    return request<{ job: Job }>('/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteJob(jobId: string) {
    return request<void>(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },

  updateRating(jobId: string, ratingData: Record<string, string>) {
    return request<{ job: Job }>(`/jobs/${jobId}/rating`, {
      method: 'PATCH',
      body: JSON.stringify({ ratingData }),
    });
  },

  updateObservation(jobId: string, testId: string, observationData: Record<string, string>) {
    return request<{ job: Job; test: Job['tests'][number] }>(
      `/jobs/${jobId}/tests/${testId}/observation`,
      {
        method: 'PATCH',
        body: JSON.stringify({ observationData }),
      }
    );
  },

  updateStage(
    jobId: string,
    testId: string,
    body: { stage: TestStage; action?: 'promote' | 'reject' }
  ) {
    return request<{ job: Job; openTestId?: string | null }>(
      `/jobs/${jobId}/tests/${testId}/stage`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );
  },

  acceptTest(jobId: string, testId: string) {
    return request<{ job: Job }>(`/jobs/${jobId}/tests/${testId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  unacceptTest(jobId: string, testId: string) {
    return request<{ job: Job }>(`/jobs/${jobId}/tests/${testId}/unaccept`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  acceptAllTests(jobId: string) {
    return request<{ job: Job }>(`/jobs/${jobId}/tests/accept-all`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
