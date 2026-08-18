import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import {
  connectDb,
  countUsersByRole,
  findJobById,
  findUserById,
  findUserByUsername,
  deleteJobById,
  insertJob,
  insertUser,
  listJobs,
  updateJobById,
} from './db';
import {
  authRoleToUserRole,
  hashPassword,
  requireAuth,
  signToken,
  toPublicUser,
  verifyPassword,
  verifyToken,
  type AuthedRequest,
} from './auth';
import { createJob, recomputeJobStatus } from './jobFactory';
import {
  applyRoleSignOffLocks,
  clearSignOffOnReject,
  getReviewerFieldKey,
  getSelectedValue,
  getTechnicianFieldKey,
  normalizeJobName,
  stampPrefixedSignOffDates,
} from './signOff';
import type {
  AuthRole,
  Job,
  TestStage,
  TransformerCapacity,
  TransformerType,
  TransformerTest,
} from './types';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DEFAULT_CORS_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000,https://test.apivishvaspower.com';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.APP_URL || DEFAULT_CORS_ORIGINS)
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Required when Express sits behind nginx / a reverse proxy (production HTTPS).
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      const allowed =
        CORS_ORIGINS.includes('*') ||
        CORS_ORIGINS.includes(normalized) ||
        normalized.includes('localhost') ||
        normalized.includes('127.0.0.1') ||
        normalized.includes('test.apivishvaspower.com') ||
        normalized.includes('vishwaspower.in') ||
        normalized.includes('apivishvaspower.com');
      if (allowed) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

const api = express.Router();
const API_BASE_PATH = (process.env.API_BASE_PATH || '').replace(/\/$/, '');

const AUTH_ROLES: AuthRole[] = ['Tester', 'Reviewer', 'Authorizer'];
const CAPACITIES: TransformerCapacity[] = ['8MVA', '12.3MVA', '16.5MVA'];
const TYPES: TransformerType[] = ['Auto', 'Traction', 'V Connect'];

const isReportable = (name: string) => {
  const n = name.toUpperCase();
  return (
    n === 'CT TEST' ||
    n === 'BUSHING TEST' ||
    n === '2 KV TEST' ||
    n === 'PRE-CONNECTION TEST' ||
    n === 'POST-CONNECTION TEST' ||
    n === 'PRE & POST VPD SERVICING' ||
    n.includes('OIL SOAKING') ||
    n === 'POST-TANKING TEST' ||
    n === 'FINAL LV TEST REPORT' ||
    n === 'CHECKLIST FOR TFR BEFORE HV' ||
    n === 'LIST OF HV TEST'
  );
};

api.get('/health', async (_req, res) => {
  res.json({ ok: true, service: 'volttrack-api', db: 'mongodb' });
});

api.get('/auth/registration-status', async (_req, res) => {
  try {
    const authorizerCount = await countUsersByRole('Authorizer');
    return res.json({
      canBootstrapAuthorizer: authorizerCount === 0,
      staffRegistrationRequiresAuthorizer: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load registration status' });
  }
});

api.post('/auth/register', async (req: AuthedRequest, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = req.body?.role as AuthRole;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    if (!AUTH_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Role must be Tester, Reviewer, or Authorizer' });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    let actorRole: AuthRole | null = null;
    if (token) {
      try {
        const payload = verifyToken(token);
        actorRole = payload.role;
        req.auth = payload;
        req.userRole = authRoleToUserRole(actorRole);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    const authorizerCount = await countUsersByRole('Authorizer');
    const isBootstrap = authorizerCount === 0;

    if (isBootstrap) {
      if (role !== 'Authorizer') {
        return res.status(403).json({
          error: 'First account must be an Authorizer. Testers and Reviewers are created by an Authorizer.',
        });
      }
    } else if (actorRole === 'Authorizer') {
      if (role !== 'Tester' && role !== 'Reviewer') {
        return res.status(403).json({
          error: 'Authorizers can only register Tester or Reviewer accounts',
        });
      }
    } else {
      return res.status(403).json({
        error: 'Only an Authorizer can register Tester and Reviewer accounts',
      });
    }

    if (await findUserByUsername(username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);
    const user = {
      id: randomUUID(),
      name,
      username,
      passwordHash,
      role,
      createdAt: Date.now(),
    };
    await insertUser(user);
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

api.post('/auth/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = req.body?.role as AuthRole;

    if (!username || !password || !AUTH_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const user = await findUserByUsername(username);
    if (!user || user.role !== role) {
      return res.status(401).json({ error: `Invalid credentials for ${role}` });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: `Invalid credentials for ${role}` });
    }

    const token = signToken({ userId: user.id, role: user.role, username: user.username });
    return res.json({
      token,
      user: toPublicUser(user),
      userRole: authRoleToUserRole(user.role),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

api.get('/auth/me', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await findUserById(req.auth!.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    return res.json({
      user: toPublicUser(user),
      userRole: authRoleToUserRole(user.role),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

api.post('/auth/logout', requireAuth, (_req, res) => {
  return res.status(204).send();
});

api.get('/jobs', requireAuth, async (_req, res) => {
  try {
    const jobs = await listJobs();
    return res.json({ jobs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load jobs' });
  }
});

api.get('/jobs/:jobId', requireAuth, async (req, res) => {
  try {
    const job = await findJobById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json({ job });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load job' });
  }
});

api.post('/jobs', requireAuth, async (req, res) => {
  try {
    const name = normalizeJobName(String(req.body?.name || ''));
    const capacity = req.body?.capacity as TransformerCapacity;
    const type = req.body?.type as TransformerType;

    if (!name || name === 'V/M/') return res.status(400).json({ error: 'Job name is required' });
    if (!CAPACITIES.includes(capacity)) return res.status(400).json({ error: 'Invalid capacity' });
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const job = createJob({ name, capacity, type });
    await insertJob(job);
    return res.status(201).json({ job });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create job' });
  }
});

api.delete('/jobs/:jobId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.userRole !== 'Admin_Authorized') {
      return res.status(403).json({ error: 'Only Authorizers can delete jobs' });
    }

    const deleted = await deleteJobById(req.params.jobId);
    if (!deleted) return res.status(404).json({ error: 'Job not found' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete job' });
  }
});

api.patch('/jobs/:jobId/rating', requireAuth, async (req, res) => {
  try {
    const ratingData = req.body?.ratingData;
    if (!ratingData || typeof ratingData !== 'object') {
      return res.status(400).json({ error: 'ratingData object is required' });
    }

    const updated = await updateJobById(req.params.jobId, job => ({
      ...job,
      ratingData: { ...(ratingData as Record<string, string>) },
    }));

    if (!updated) return res.status(404).json({ error: 'Job not found' });
    return res.json({ job: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update rating' });
  }
});

api.patch('/jobs/:jobId/tests/:testId/observation', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const observationData = req.body?.observationData;
    if (!observationData || typeof observationData !== 'object') {
      return res.status(400).json({ error: 'observationData object is required' });
    }

    const role = req.userRole!;
    let updatedTest: TransformerTest | null = null;
    let denied = false;

    const updatedJob = await updateJobById(req.params.jobId, job => {
      const tests = job.tests.map(test => {
        if (test.id !== req.params.testId) return test;

        const lockedForTester =
          role === 'Admin_Tested' && (test.stage === 'Reviewed' || test.stage === 'Authorized');
        const lockedForReviewer = role === 'Admin_Reviewed' && test.stage === 'Authorized';
        if (lockedForTester || lockedForReviewer) {
          denied = true;
          return test;
        }

        updatedTest = {
          ...test,
          observationData: applyRoleSignOffLocks(
            test.name,
            role,
            test.observationData || {},
            observationData as Record<string, string>
          ),
          updatedAt: Date.now(),
        };
        return updatedTest;
      });

      if (!updatedTest && !denied) return null;
      return { ...job, tests };
    });

    if (denied) return res.status(403).json({ error: 'Test is locked for your role' });
    if (!updatedJob || !updatedTest) return res.status(404).json({ error: 'Job or test not found' });
    return res.json({ job: updatedJob, test: updatedTest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save observations' });
  }
});

api.patch('/jobs/:jobId/tests/:testId/stage', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const targetStage = req.body?.stage as TestStage;
    const action = (req.body?.action as 'promote' | 'reject') || 'promote';
    const role = req.userRole!;

    if (!['Not Started', 'Tested', 'Reviewed', 'Authorized'].includes(targetStage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    let error: string | null = null;
    let openedTestId: string | null = null;
    let touched = false;

    const updatedJob = await updateJobById(req.params.jobId, job => {
      const tests = job.tests.map(test => {
        if (test.id !== req.params.testId) return test;
        touched = true;

        if (action === 'promote') {
          const canPromote =
            (role === 'Admin_Tested' && test.stage === 'Not Started' && targetStage === 'Tested') ||
            (role === 'Admin_Reviewed' && test.stage === 'Tested' && targetStage === 'Reviewed') ||
            (role === 'Admin_Authorized' && test.stage === 'Reviewed' && targetStage === 'Authorized');

          if (!canPromote) {
            error = 'You are not allowed to promote to this stage';
            return test;
          }

          if (targetStage === 'Reviewed' && !getSelectedValue(test.observationData, getTechnicianFieldKey(test.name))) {
            error = 'Select Technician is mandatory before submitting to Reviewer.';
            return test;
          }
          if (targetStage === 'Authorized' && !getSelectedValue(test.observationData, getReviewerFieldKey(test.name))) {
            error = 'Select Reviewer is mandatory before submitting to Authorizer.';
            return test;
          }

          let observationData = { ...(test.observationData || {}) };
          const nowString = new Date().toLocaleString();
          const testNameUpper = test.name.toUpperCase();
          const isFinalLv = testNameUpper === 'FINAL LV TEST REPORT';

          stampPrefixedSignOffDates(test.name, observationData, targetStage, nowString);

          if (isReportable(test.name)) {
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
              openedTestId = test.id;
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
          }

          return {
            ...test,
            stage: targetStage,
            observationData,
            updatedAt: Date.now(),
          };
        }

        if (role === 'Admin_Tested') {
          error = 'Testers cannot reject stages';
          return test;
        }

        const canReject =
          (targetStage === 'Tested' && test.stage === 'Reviewed') ||
          (targetStage === 'Reviewed' && test.stage === 'Authorized') ||
          (targetStage === 'Not Started' &&
            (test.stage === 'Tested' || test.stage === 'Reviewed' || test.stage === 'Authorized'));

        if (!canReject) {
          error = 'Invalid reject transition';
          return test;
        }

        const observationData = { ...(test.observationData || {}) };
        if (targetStage === 'Tested' || targetStage === 'Reviewed' || targetStage === 'Not Started') {
          clearSignOffOnReject(observationData, targetStage);
        }

        return {
          ...test,
          stage: targetStage,
          observationData,
          updatedAt: Date.now(),
        };
      });

      if (error || !touched) return null;
      return {
        ...job,
        tests,
        status: recomputeJobStatus(tests),
      };
    });

    if (error) return res.status(403).json({ error });
    if (!updatedJob) return res.status(404).json({ error: 'Job or test not found' });
    return res.json({ job: updatedJob, openTestId: openedTestId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update stage' });
  }
});

api.patch('/jobs/:jobId/tests/:testId/accept', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.userRole === 'Admin_Tested') {
      return res.status(403).json({ error: 'Testers cannot accept test offers' });
    }

    let updatedTest: TransformerTest | null = null;
    const updatedJob = await updateJobById(req.params.jobId, job => {
      const tests = job.tests.map(test => {
        if (test.id !== req.params.testId) return test;
        updatedTest = { ...test, accepted: true, updatedAt: Date.now() };
        return updatedTest;
      });
      if (!updatedTest) return null;
      return { ...job, tests };
    });

    if (!updatedJob || !updatedTest) return res.status(404).json({ error: 'Job or test not found' });
    return res.json({ job: updatedJob, test: updatedTest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to accept test' });
  }
});

api.patch('/jobs/:jobId/tests/:testId/unaccept', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.userRole === 'Admin_Tested') {
      return res.status(403).json({ error: 'Testers cannot take back test offers' });
    }

    let updatedTest: TransformerTest | null = null;
    let deniedReason: string | null = null;

    const updatedJob = await updateJobById(req.params.jobId, job => {
      const tests = job.tests.map(test => {
        if (test.id !== req.params.testId) return test;
        if (test.accepted === false) {
          deniedReason = 'Offer is not currently accepted';
          return test;
        }
        if (test.stage !== 'Not Started') {
          deniedReason = 'Cannot take back offer after testing has started';
          return test;
        }
        updatedTest = { ...test, accepted: false, updatedAt: Date.now() };
        return updatedTest;
      });
      if (!updatedTest) return null;
      return { ...job, tests };
    });

    if (deniedReason) return res.status(403).json({ error: deniedReason });
    if (!updatedJob || !updatedTest) return res.status(404).json({ error: 'Job or test not found' });
    return res.json({ job: updatedJob, test: updatedTest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to take back test offer' });
  }
});

api.post('/jobs/:jobId/tests/accept-all', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (req.userRole === 'Admin_Tested') {
      return res.status(403).json({ error: 'Testers cannot accept test offers' });
    }

    const updatedJob = await updateJobById(req.params.jobId, job => {
      const tests = job.tests.map(test =>
        test.accepted === false ? { ...test, accepted: true, updatedAt: Date.now() } : test
      );
      return { ...job, tests };
    });

    if (!updatedJob) return res.status(404).json({ error: 'Job not found' });
    return res.json({ job: updatedJob });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to accept tests' });
  }
});

app.use('/api', api);
if (API_BASE_PATH) {
  app.use(`${API_BASE_PATH}/api`, api);
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`VoltTrack API running on http://localhost:${PORT}`);
      if (API_BASE_PATH) console.log(`Also mounted at ${API_BASE_PATH}/api`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
