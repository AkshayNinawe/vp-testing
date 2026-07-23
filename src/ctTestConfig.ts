import { TransformerCapacity, TransformerType } from './types';

export type CTNameplateRow = {
  id: string;
  label: string;
  key: string;
  defaults: Record<string, string>;
};

const DEFAULT_CT_NAMEPLATE_ROWS: CTNameplateRow[] = [
  { id: '1', label: 'Make', key: 'make', defaults: { '1.1': '', '2': '', '2.1': '', 'WTI': '' } },
  { id: '2', label: 'Burden', key: 'burden', defaults: { '1.1': '0 VA', '2': '0 VA', '2.1': '0 VA', 'WTI': '10 VA' } },
  { id: '3', label: 'Class of accuracy', key: 'class', defaults: { '1.1': 'PS', '2': 'PS', '2.1': 'PS', 'WTI': '5' } },
  { id: '4', label: 'Ratio', key: 'ratio', defaults: { '1.1': '300 /5A', '2': '300 /5A', '2.1': '600 /5A', 'WTI': '145 /1.2A' } },
  { id: '5', label: 'Knee point voltage', key: 'knee_v', defaults: { '1.1': '150 V', '2': '150 V', '2.1': '125 V', 'WTI': 'NA' } },
  { id: '6', label: 'Manufacturing SR. NO', key: 'mfg_sr', defaults: { '1.1': '', '2': '', '2.1': '', 'WTI': '' } },
  { id: '7', label: 'Year of manufacture', key: 'year', defaults: { '1.1': '', '2': '', '2.1': '', 'WTI': '' } },
];

const AUTO_12_3MVA_CT_NAMEPLATE_ROWS: CTNameplateRow[] = [
  { id: '1', label: 'Make', key: 'make', defaults: { '1.1': '', '1.2': '', '2.1': '', 'WTI': '' } },
  { id: '2', label: 'Burden', key: 'burden', defaults: { '1.1': '0 VA', '1.2': '0 VA', '2.1': '0 VA', 'WTI': '10 VA' } },
  { id: '3', label: 'Class of accuracy', key: 'class', defaults: { '1.1': 'PS', '1.2': 'PS', '2.1': 'PS', 'WTI': '5' } },
  { id: '4', label: 'Ratio', key: 'ratio', defaults: { '1.1': '500 /5A', '1.2': '500 /5A', '2.1': '1000 /5A', 'WTI': '224 /1.2A' } },
  { id: '5', label: 'Knee point voltage', key: 'knee_v', defaults: { '1.1': '175 V', '1.2': '175 V', '2.1': '175 V', 'WTI': 'NA' } },
  { id: '6', label: 'Manufacturing SR. NO', key: 'mfg_sr', defaults: { '1.1': '', '1.2': '', '2.1': '', 'WTI': '' } },
  { id: '7', label: 'Year of manufacture', key: 'year', defaults: { '1.1': '', '1.2': '', '2.1': '', 'WTI': '' } },
];

const AUTO_16_5MVA_CT_NAMEPLATE_ROWS: CTNameplateRow[] = [
  { id: '1', label: 'Make', key: 'make', defaults: { '1.1': '', '2': '', '2.1': '', 'WTI': '' } },
  { id: '2', label: 'Burden', key: 'burden', defaults: { '1.1': '0 VA', '2': '0 VA', '2.1': '0 VA', 'WTI': '10 VA' } },
  { id: '3', label: 'Class of accuracy', key: 'class', defaults: { '1.1': 'PS', '2': 'PS', '2.1': 'PS', 'WTI': '5' } },
  { id: '4', label: 'Ratio', key: 'ratio', defaults: { '1.1': '600 /5A', '2': '600 /5A', '2.1': '1200 /5A', 'WTI': '300 /1.2A' } },
  { id: '5', label: 'Knee point voltage', key: 'knee_v', defaults: { '1.1': '175 V', '2': '175 V', '2.1': '175 V', 'WTI': 'NA' } },
  { id: '6', label: 'Manufacturing SR. NO', key: 'mfg_sr', defaults: { '1.1': '', '2': '', '2.1': '', 'WTI': '' } },
  { id: '7', label: 'Year of manufacture', key: 'year', defaults: { '1.1': '', '2': '', '2.1': '', 'WTI': '' } },
];

const AUTO_12_3MVA_CT_NAMEPLATE_VERSION = 'image-2026-07-13-v2';
const AUTO_16_5MVA_CT_NAMEPLATE_VERSION = 'image-2026-07-13-v1';
const CT_NAMEPLATE_VERSION_KEY = '_ct_nameplate_version';

const isForcedCTCapacity = (type?: TransformerType, capacity?: TransformerCapacity) =>
  type === 'Auto' && (capacity === '12.3MVA' || capacity === '16.5MVA');

const getCTNameplateVersion = (type?: TransformerType, capacity?: TransformerCapacity) => {
  if (type === 'Auto' && capacity === '12.3MVA') return AUTO_12_3MVA_CT_NAMEPLATE_VERSION;
  if (type === 'Auto' && capacity === '16.5MVA') return AUTO_16_5MVA_CT_NAMEPLATE_VERSION;
  return '';
};

export const getCTConfig = (type?: TransformerType, capacity?: TransformerCapacity) => {
  if (type === 'Auto' && capacity === '12.3MVA') {
    return {
      sections: ['1.1', '1.2', '2.1', 'WTI'] as const,
      nameplateRows: AUTO_12_3MVA_CT_NAMEPLATE_ROWS,
      getRatioPrimaryFallback: (sec: string) => {
        if (sec === '1.1' || sec === '1.2') return 500;
        if (sec === '2.1') return 1000;
        return 224;
      },
      getKneeFallback: (sec: string) => (sec === 'WTI' ? '0' : '175'),
    };
  }

  if (type === 'Auto' && capacity === '16.5MVA') {
    return {
      sections: ['1.1', '2', '2.1', 'WTI'] as const,
      nameplateRows: AUTO_16_5MVA_CT_NAMEPLATE_ROWS,
      getRatioPrimaryFallback: (sec: string) => {
        if (sec === '1.1' || sec === '2') return 600;
        if (sec === '2.1') return 1200;
        return 300;
      },
      getKneeFallback: (sec: string) => (sec === 'WTI' ? '0' : '175'),
    };
  }

  return {
    sections: ['1.1', '2', '2.1', 'WTI'] as const,
    nameplateRows: DEFAULT_CT_NAMEPLATE_ROWS,
    getRatioPrimaryFallback: (sec: string) => {
      if (sec === '1.1' || sec === '2') return 300;
      if (sec === '2.1') return 600;
      return 145;
    },
    getKneeFallback: (sec: string) => {
      if (sec === '1.1' || sec === '2') return '150';
      if (sec === '2.1') return '125';
      return '0';
    },
  };
};

export const seedCTNameplateDefaults = (
  data: Record<string, string>,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const config = getCTConfig(type, capacity);
  const updated = { ...data };
  const forceOverwrite = isForcedCTCapacity(type, capacity);
  const version = getCTNameplateVersion(type, capacity);
  const requiresMigration = forceOverwrite && updated[CT_NAMEPLATE_VERSION_KEY] !== version;
  const editableKeys = new Set(['make', 'year', 'mfg_sr']);

  config.nameplateRows.forEach(row => {
    config.sections.forEach(section => {
      const key = `np_${section}_${row.key}`;
      const defaultVal = row.defaults[section];
      const shouldForce = forceOverwrite && !editableKeys.has(row.key);
      if (defaultVal !== undefined && (requiresMigration || shouldForce || updated[key] === undefined || updated[key] === '')) {
        updated[key] = defaultVal;
      }
    });
  });

  if (forceOverwrite) {
    updated[CT_NAMEPLATE_VERSION_KEY] = version;
  }

  return updated;
};

export const getRatioAppliedPrimary = (
  sec: string,
  percentStr: string,
  npRatioVal: string | undefined,
  type?: TransformerType,
  capacity?: TransformerCapacity
) => {
  const config = getCTConfig(type, capacity);
  const percentPct = parseFloat(percentStr) / 100;
  const ratioStr = npRatioVal || String(config.getRatioPrimaryFallback(sec));
  const cleanMatch = ratioStr.replace(/\s+/g, '').match(/^([\d.]+)/);
  const primary = cleanMatch ? parseFloat(cleanMatch[1]) : config.getRatioPrimaryFallback(sec);
  const applied = percentPct * primary;
  return applied % 1 === 0 ? applied.toFixed(0) : applied.toFixed(1);
};
