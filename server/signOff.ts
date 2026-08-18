/** Sign-off field keys and name lists — keep in sync with src/App.tsx */

export const NAMES_TECHNICIANS = [
  'NITIN PATIL',
  'PANKAJ KAWALE',
  'AKASH PANCHESWAR',
  'CHANCHALESH RABALE',
  'ROHIT SONEWANE',
  'RIPEKSHIT TUMBALE',
  'ABHIJIT KHARKATE',
  'HEMANT BHAGAT',
] as const;

export const NAMES_REVIEWERS = [
  'GAURAV KUREKAR',
  'KAPIL GAUTAM',
  'HEMANT BHAGAT',
  'PANKAJ KAWALE',
] as const;

export const NAMES_AUTHORIZERS = [
  'KIRAN JOHARAPURKAR',
  'SHREYAS BHAVE',
  'VIKAS CHAUHAN',
] as const;

export const getTechnicianFieldKey = (testName: string) => {
  const n = testName.toUpperCase();
  if (n === 'POST-CONNECTION TEST') return 'pct_tested_by';
  if (n === 'POST-TANKING TEST') return 'pt_tested_by';
  if (n === 'FINAL LV TEST REPORT') return 'offered_by';
  return 'tested_by';
};

export const getReviewerFieldKey = (testName: string) => {
  const n = testName.toUpperCase();
  if (n === 'POST-CONNECTION TEST') return 'pct_reviewed_by';
  if (n === 'POST-TANKING TEST') return 'pt_reviewed_by';
  if (n === 'FINAL LV TEST REPORT') return 'tested_by';
  return 'reviewed_by';
};

export const getAuthorizerFieldKey = (testName: string) => {
  const n = testName.toUpperCase();
  if (n === 'POST-CONNECTION TEST') return 'pct_authorized_by';
  if (n === 'POST-TANKING TEST') return 'pt_authorized_by';
  return 'authorized_by';
};

const DATE_KEYS: Record<string, string[]> = {
  tested_by: ['tested_at', 'tested_date'],
  reviewed_by: ['reviewed_at', 'reviewed_date'],
  authorized_by: ['authorized_at', 'authorized_date'],
  offered_by: ['offered_at', 'offered_date'],
  pct_tested_by: ['pct_tested_date', 'pct_tested_at'],
  pct_reviewed_by: ['pct_reviewed_date', 'pct_reviewed_at'],
  pct_authorized_by: ['pct_authorized_date', 'pct_authorized_at'],
  pt_tested_by: ['pt_tested_date', 'pt_tested_at'],
  pt_reviewed_by: ['pt_reviewed_date', 'pt_reviewed_at'],
  pt_authorized_by: ['pt_authorized_date', 'pt_authorized_at'],
};

export const getSignOffDateKeys = (byKey: string) => DATE_KEYS[byKey] || [];

export const getSelectedValue = (data: Record<string, string> | undefined, key: string) =>
  String(data?.[key] || '').trim();

/** Stamp PCT / PT date fields on promote when a person is already selected. */
export const stampPrefixedSignOffDates = (
  testName: string,
  observationData: Record<string, string>,
  targetStage: string,
  nowString: string
) => {
  const n = testName.toUpperCase();
  const stamp = (byKey: string, dateKey: string) => {
    if (observationData[byKey] && !observationData[dateKey]) {
      observationData[dateKey] = nowString;
    }
  };

  if (n === 'POST-CONNECTION TEST') {
    stamp('pct_tested_by', 'pct_tested_date');
    if (targetStage === 'Reviewed' || targetStage === 'Authorized') {
      stamp('pct_reviewed_by', 'pct_reviewed_date');
    }
    if (targetStage === 'Authorized') {
      stamp('pct_authorized_by', 'pct_authorized_date');
    }
  }

  if (n === 'POST-TANKING TEST') {
    stamp('pt_tested_by', 'pt_tested_date');
    if (targetStage === 'Reviewed' || targetStage === 'Authorized') {
      stamp('pt_reviewed_by', 'pt_reviewed_date');
    }
    if (targetStage === 'Authorized') {
      stamp('pt_authorized_by', 'pt_authorized_date');
    }
  }
};

/** Clear sign-off keys when rejecting to a lower stage. */
export const clearSignOffOnReject = (
  observationData: Record<string, string>,
  targetStage: 'Not Started' | 'Tested' | 'Reviewed'
) => {
  const del = (...keys: string[]) => {
    for (const k of keys) delete observationData[k];
  };

  const clearPerson = (byKey: string) => {
    del(byKey, ...getSignOffDateKeys(byKey));
  };

  if (targetStage === 'Tested') {
    clearPerson('reviewed_by');
    clearPerson('pct_reviewed_by');
    clearPerson('pt_reviewed_by');
  } else if (targetStage === 'Reviewed') {
    clearPerson('authorized_by');
    clearPerson('pct_authorized_by');
    clearPerson('pt_authorized_by');
  } else if (targetStage === 'Not Started') {
    clearPerson('tested_by');
    clearPerson('reviewed_by');
    clearPerson('authorized_by');
    clearPerson('offered_by');
    clearPerson('pct_tested_by');
    clearPerson('pct_reviewed_by');
    clearPerson('pct_authorized_by');
    clearPerson('pt_tested_by');
    clearPerson('pt_reviewed_by');
    clearPerson('pt_authorized_by');
  }
};

/** Reviewer cannot change Technician / Authorizer; Tester cannot change Reviewer / Authorizer. */
export const applyRoleSignOffLocks = (
  testName: string,
  role: string,
  previous: Record<string, string>,
  incoming: Record<string, string>
) => {
  const techKey = getTechnicianFieldKey(testName);
  const revKey = getReviewerFieldKey(testName);
  const authKey = getAuthorizerFieldKey(testName);
  const next = { ...incoming };

  const restore = (byKey: string) => {
    next[byKey] = previous[byKey] || '';
    for (const dateKey of getSignOffDateKeys(byKey)) {
      if (previous[dateKey] !== undefined) next[dateKey] = previous[dateKey];
      else delete next[dateKey];
    }
  };

  if (role === 'Admin_Reviewed') {
    restore(techKey);
    restore(authKey);
  }
  if (role === 'Admin_Tested') {
    restore(revKey);
    restore(authKey);
  }

  return next;
};

export const normalizeJobName = (raw: string) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.toUpperCase().startsWith('V/M/')) {
    const suffix = trimmed.slice(4).trim();
    return suffix ? `V/M/${suffix}` : 'V/M/';
  }
  return `V/M/${trimmed.replace(/^V\/M\/?/i, '').trim()}`;
};
