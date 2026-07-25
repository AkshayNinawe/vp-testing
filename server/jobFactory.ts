import { randomUUID } from 'crypto';
import type {
  Job,
  TransformerCapacity,
  TransformerType,
  TransformerTest,
} from './types';

export const TEST_NAMES = [
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

export const getJobRatingDefaults = (type: TransformerType, capacity: TransformerCapacity) => {
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
};

export function createJob(input: {
  name: string;
  capacity: TransformerCapacity;
  type: TransformerType;
}): Job {
  const now = Date.now();
  const tests: TransformerTest[] = TEST_NAMES.map(name => ({
    id: randomUUID(),
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
  const shouldUseFixedAuto165SrNo = input.type === 'Auto' && input.capacity === '16.5MVA';

  return {
    id: randomUUID(),
    name: input.name.trim(),
    capacity: input.capacity,
    type: input.type,
    createdAt: now,
    status: 'Processing',
    tests,
    ratingData: {
      ...ratingDefaults,
      rating_sr_no: shouldUseFixedAuto165SrNo
        ? (ratingDefaults.rating_sr_no || '')
        : (autoSrNo || ratingDefaults.rating_sr_no || ''),
    },
  };
}

export function recomputeJobStatus(tests: TransformerTest[]) {
  return tests.every(t => t.stage === 'Authorized') ? 'Completed' : 'Processing';
}
