import { TransformerCapacity, TransformerType } from './types';
import { getPreConnWindingResMaxGuaranteed, PRE_CONN_WINDING_TERMS } from './preConnectionTestConfig';
import { calculatePostConnScImpedanceZ } from './postConnectionTestConfig';

export const calculateFinalLvScImpedanceZ = calculatePostConnScImpedanceZ;

export const getFinalLvWindingResMaxGuaranteed = getPreConnWindingResMaxGuaranteed;

const toLvWrTermKey = (term: string) => term.replace('.', '_');

export const seedFinalLvWindingResGuaranteed = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const updated = { ...data };
  const forceOverwrite = type === 'Auto' && capacity === '12.3MVA';

  PRE_CONN_WINDING_TERMS.forEach(term => {
    const key = `lv_wr_${toLvWrTermKey(term)}_max`;
    const defaultVal = getFinalLvWindingResMaxGuaranteed(term, type, capacity);
    if (forceOverwrite || updated[key] === undefined || updated[key] === '') {
      updated[key] = defaultVal;
    }
  });

  return updated;
};
