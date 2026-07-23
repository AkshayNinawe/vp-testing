import { TransformerCapacity, TransformerType } from './types';
import { getPreConnWindingResMaxGuaranteed, PRE_CONN_WINDING_TERMS } from './preConnectionTestConfig';
import { calculatePostConnScImpedanceZ } from './postConnectionTestConfig';

export const calculatePostTankingScImpedanceZ = calculatePostConnScImpedanceZ;

export const getPostTankingWindingResMaxGuaranteed = getPreConnWindingResMaxGuaranteed;

export const seedPostTankingWindingResGuaranteed = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const updated = { ...data };
  const forceOverwrite = type === 'Auto' && capacity === '12.3MVA';

  PRE_CONN_WINDING_TERMS.forEach(term => {
    const key = `pt_res_${term}_max`;
    const defaultVal = getPostTankingWindingResMaxGuaranteed(term, type, capacity);
    if (forceOverwrite || updated[key] === undefined || updated[key] === '') {
      updated[key] = defaultVal;
    }
  });

  return updated;
};
