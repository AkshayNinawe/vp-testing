import { TransformerCapacity, TransformerType } from './types';

export const PRE_CONN_WINDING_TERMS = ['1.1-2', '1.1-2.1', '2.1-2'] as const;

export const getPreConnWindingResMaxGuaranteed = (
  term: string,
  type?: TransformerType,
  capacity?: TransformerCapacity
): string => {
  if (type === 'Auto' && capacity === '12.3MVA') {
    return term === '1.1-2' ? '0.36' : '0.18';
  }
  if (type === 'Auto' && capacity === '16.5MVA') {
    return term === '1.1-2' ? '0.26' : '0.13';
  }
  return term === '1.1-2' ? '0.66' : '0.33';
};

export const seedPreConnWindingResGuaranteed = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const updated = { ...data };
  const forceOverwrite = type === 'Auto' && (capacity === '12.3MVA' || capacity === '16.5MVA');

  PRE_CONN_WINDING_TERMS.forEach(term => {
    const key = `res_winding_${term}_guaranteed`;
    const defaultVal = getPreConnWindingResMaxGuaranteed(term, type, capacity);
    if (forceOverwrite || updated[key] === undefined || updated[key] === '') {
      updated[key] = defaultVal;
    }
  });

  return updated;
};
