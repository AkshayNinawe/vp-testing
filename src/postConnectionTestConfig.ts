import { TransformerCapacity, TransformerType } from './types';
import { getPreConnWindingResMaxGuaranteed, PRE_CONN_WINDING_TERMS } from './preConnectionTestConfig';

export const getPostConnScImpedanceLvCurrent = (
  type?: TransformerType,
  capacity?: TransformerCapacity
): number => {
  if (type === 'Auto' && capacity === '12.3MVA') return 447.27;
  if (type === 'Auto' && capacity === '16.5MVA') return 600;
  if (type === 'Auto' && capacity === '8MVA') return 290.91;
  return 290.91;
};

export const calculatePostConnScImpedanceZ = (
  appliedVoltage: number,
  measuredCurrent: number,
  type?: TransformerType,
  capacity?: TransformerCapacity
): string => {
  if (isNaN(appliedVoltage) || isNaN(measuredCurrent) || measuredCurrent === 0) return '';
  const lvCurrent = getPostConnScImpedanceLvCurrent(type, capacity);
  return ((appliedVoltage / 55000) * (lvCurrent / measuredCurrent) * 100).toFixed(2);
};

export const getPostConnWindingResMaxGuaranteed = getPreConnWindingResMaxGuaranteed;

export const seedPostConnWindingResGuaranteed = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const updated = { ...data };
  const forceOverwrite = type === 'Auto' && capacity === '12.3MVA';

  PRE_CONN_WINDING_TERMS.forEach(term => {
    const key = `pct_res_${term}_max`;
    const defaultVal = getPostConnWindingResMaxGuaranteed(term, type, capacity);
    if (forceOverwrite || updated[key] === undefined || updated[key] === '') {
      updated[key] = defaultVal;
    }
  });

  return updated;
};
