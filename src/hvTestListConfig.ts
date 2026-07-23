import { TransformerCapacity, TransformerType } from './types';

export const HV_NLL_VOLTAGE_ROWS = ['90', '100', '110'] as const;
export type HVNllVoltageRow = typeof HV_NLL_VOLTAGE_ROWS[number];

export type HVLLConfig = {
  ctRatio: string;
  ctFactor: number;
  mf: number;
  ratedA: string;
  ratedADefault: number;
  guarLoss: string;
  guarZPercent: string;
  ptFactor: number;
  ratedV: number;
};

const DEFAULT_HV_LL_CONFIG: HVLLConfig = {
  ctRatio: '200/1',
  ctFactor: 200,
  mf: 2000,
  ratedA: '145.45',
  ratedADefault: 145.45,
  guarLoss: '16kW',
  guarZPercent: '0.49%',
  ptFactor: 10,
  ratedV: 55000,
};

const AUTO_12_3MVA_HV_LL_CONFIG: HVLLConfig = {
  ctRatio: '250/1',
  ctFactor: 250,
  mf: 2500,
  ratedA: '223.64',
  ratedADefault: 223.64,
  guarLoss: '22kW',
  guarZPercent: '0.49%',
  ptFactor: 10,
  ratedV: 55000,
};

const AUTO_16_5MVA_HV_LL_CONFIG: HVLLConfig = {
  ctRatio: '500/1',
  ctFactor: 500,
  mf: 5000,
  ratedA: '300.00',
  ratedADefault: 300,
  guarLoss: '26kW',
  guarZPercent: '0.55%',
  ptFactor: 10,
  ratedV: 55000,
};

export const getHVLLConfig = (
  type?: TransformerType,
  capacity?: TransformerCapacity
): HVLLConfig => {
  if (type === 'Auto' && capacity === '12.3MVA') {
    return AUTO_12_3MVA_HV_LL_CONFIG;
  }
  if (type === 'Auto' && capacity === '16.5MVA') {
    return AUTO_16_5MVA_HV_LL_CONFIG;
  }
  return DEFAULT_HV_LL_CONFIG;
};

export const applyHVLLCalculations = (
  updated: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const config = getHVLLConfig(type, capacity);
  const mf = parseFloat(updated['hv_ll_mf'] || String(config.mf)) || config.mf;
  const u1 = parseFloat(updated['hv_ll_u1'] || '');
  const u3 = parseFloat(updated['hv_ll_u3'] || '');
  const i1 = parseFloat(updated['hv_ll_i1'] || '');
  const i3 = parseFloat(updated['hv_ll_i3'] || '');
  const p = parseFloat(updated['hv_ll_p'] || '');
  const ratedV = parseFloat(updated['hv_ll_rated_v'] || String(config.ratedV)) || config.ratedV;
  const ratedA = parseFloat(updated['hv_ll_rated_a'] || config.ratedA) || config.ratedADefault;

  if (!isNaN(u1) && !isNaN(u3)) {
    const meterV = u1 + u3;
    updated['hv_ll_meter_v'] = meterV.toFixed(4);
    updated['hv_ll_measured_v'] = (meterV * config.ptFactor).toFixed(2);
  } else {
    updated['hv_ll_meter_v'] = '';
    updated['hv_ll_measured_v'] = '';
  }

  if (!isNaN(i1) && !isNaN(i3)) {
    const meterI = (i1 + i3) / 2;
    updated['hv_ll_meter_i'] = meterI.toFixed(4);
    updated['hv_ll_applied_a'] = (meterI * config.ctFactor).toFixed(2);
  } else {
    updated['hv_ll_meter_i'] = '';
    updated['hv_ll_applied_a'] = '';
  }

  if (!isNaN(p)) {
    updated['hv_ll_meter_w'] = p.toFixed(4);
  } else {
    updated['hv_ll_meter_w'] = '';
  }

  const appliedA = parseFloat(updated['hv_ll_applied_a'] || '');
  const measuredV = parseFloat(updated['hv_ll_measured_v'] || '');
  const meterW = parseFloat(updated['hv_ll_meter_w'] || '');

  if (appliedA > 0 && !isNaN(meterW)) {
    updated['hv_ll_loss_corrected'] = ((meterW * mf / 1000) * Math.pow(ratedA / appliedA, 2)).toFixed(4);
  } else {
    updated['hv_ll_loss_corrected'] = '';
  }

  if (appliedA > 0 && !isNaN(measuredV)) {
    updated['hv_ll_z_percent'] = ((measuredV / ratedV) * (ratedA / appliedA) * 100).toFixed(4);
  } else {
    updated['hv_ll_z_percent'] = '';
  }
};

const DEFAULT_NLL_GUARANTEED = {
  '90': { curr: '1.2', pow: '3.60' },
  '100': { curr: '1.8', pow: '4.40' },
  '110': { curr: '3.0', pow: '5.50' },
} as const;

const AUTO_12_3MVA_NLL_GUARANTEED = {
  '90': { curr: '1.0', pow: '5.80' },
  '100': { curr: '1.5', pow: '6.80' },
  '110': { curr: '2.8', pow: '8.80' },
} as const;

const AUTO_16_5MVA_NLL_GUARANTEED = {
  '90': { curr: '1.0', pow: '6.50' },
  '100': { curr: '1.5', pow: '7.00' },
  '110': { curr: '2.8', pow: '8.30' },
} as const;

const getNllGuaranteedConfig = (type?: TransformerType, capacity?: TransformerCapacity) => {
  if (type === 'Auto' && capacity === '12.3MVA') {
    return AUTO_12_3MVA_NLL_GUARANTEED;
  }
  if (type === 'Auto' && capacity === '16.5MVA') {
    return AUTO_16_5MVA_NLL_GUARANTEED;
  }
  return DEFAULT_NLL_GUARANTEED;
};

export const getHVNllGuaranteedCurrent = (
  rowKey: string,
  type?: TransformerType,
  capacity?: TransformerCapacity
): string => {
  const config = getNllGuaranteedConfig(type, capacity);
  return config[rowKey as HVNllVoltageRow]?.curr ?? DEFAULT_NLL_GUARANTEED['100'].curr;
};

export const getHVNllGuaranteedPower = (
  rowKey: string,
  type?: TransformerType,
  capacity?: TransformerCapacity
): string => {
  const config = getNllGuaranteedConfig(type, capacity);
  return config[rowKey as HVNllVoltageRow]?.pow ?? DEFAULT_NLL_GUARANTEED['100'].pow;
};

export const seedHVNllGuaranteedDefaults = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const updated = { ...data };
  const forceOverwrite = type === 'Auto' && (capacity === '12.3MVA' || capacity === '16.5MVA');

  HV_NLL_VOLTAGE_ROWS.forEach(rowKey => {
    const currKey = `hv_nll_${rowKey}_curr_g`;
    const powKey = `hv_nll_${rowKey}_pow_g`;
    const currVal = getHVNllGuaranteedCurrent(rowKey, type, capacity);
    const powVal = getHVNllGuaranteedPower(rowKey, type, capacity);

    if (forceOverwrite || updated[currKey] === undefined || updated[currKey] === '') {
      updated[currKey] = currVal;
    }
    if (forceOverwrite || updated[powKey] === undefined || updated[powKey] === '') {
      updated[powKey] = powVal;
    }
  });

  return updated;
};

export const seedHVTestListDefaults = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const updated = seedHVNllGuaranteedDefaults(data, type, capacity);
  const config = getHVLLConfig(type, capacity);
  const forceOverwrite = type === 'Auto' && (capacity === '12.3MVA' || capacity === '16.5MVA');

  const llDefaults: Record<string, string> = {
    hv_ll_ct: config.ctRatio,
    hv_ll_mf: String(config.mf),
    hv_ll_rated_a: config.ratedA,
    hv_ll_guar_loss: config.guarLoss,
    hv_ll_guar_z_percent: config.guarZPercent,
  };

  Object.entries(llDefaults).forEach(([key, value]) => {
    if (forceOverwrite || updated[key] === undefined || updated[key] === '') {
      updated[key] = value;
    }
  });

  return updated;
};
