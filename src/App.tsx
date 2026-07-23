import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LogIn, 
  Settings, 
  ArrowRight, 
  Database, 
  Cpu, 
  Zap, 
  ChevronRight, 
  Plus, 
  History,
  LayoutDashboard,
  Box,
  CheckCircle2,
  HardDrive,
  ClipboardList,
  ArrowLeft,
  Timer,
  Activity,
  AlertCircle,
  XCircle,
  Radio,
  ClipboardCheck,
  ShieldCheck,
  Shield,
  LayoutList,
  Lock,
  Save,
  FileDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppView, Job, TransformerCapacity, TransformerType, TransformerTest, TestStage, JobStatus, UserRole } from './types';
import { getTestFormHtml } from './reportTemplates';
import { getCTConfig, getRatioAppliedPrimary, seedCTNameplateDefaults } from './ctTestConfig';
import { getPreConnWindingResMaxGuaranteed, seedPreConnWindingResGuaranteed } from './preConnectionTestConfig';
import { calculatePostConnScImpedanceZ, getPostConnWindingResMaxGuaranteed, seedPostConnWindingResGuaranteed } from './postConnectionTestConfig';
import { calculatePostTankingScImpedanceZ, getPostTankingWindingResMaxGuaranteed, seedPostTankingWindingResGuaranteed } from './postTankingTestConfig';
import { calculateFinalLvScImpedanceZ, getFinalLvWindingResMaxGuaranteed, seedFinalLvWindingResGuaranteed } from './finalLvTestConfig';
import { applyHVLLCalculations, getHVLLConfig, getHVNllGuaranteedCurrent, getHVNllGuaranteedPower, seedHVTestListDefaults } from './hvTestListConfig';

// Storage Key
const JOBS_STORAGE_KEY = 'volttrack_jobs_v3';

const TEST_NAMES = [
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
  'List of HV Test'
];

const PDF_PRINT_STYLES = `
    @media print {
      body {
        padding: 0;
        background-color: transparent;
      }
      .no-print {
        display: none;
      }
      .report-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: none;
      }

      /* Keep tables and rows from splitting across pages */
      table {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
      tr, td, th {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
      }

      /* Keep table wrapper blocks together */
      .overflow-hidden,
      .rounded-xl,
      .test-form-wrapper > div,
      .test-form-wrapper > div > div,
      .test-form-wrapper .space-y-4,
      .test-form-wrapper .space-y-6,
      .test-form-wrapper .space-y-8 {
        page-break-inside: avoid;
        break-inside: avoid-page;
      }

      /* Keep section headings with following content */
      h3, h4, h6, .section-title {
        page-break-after: avoid;
        break-after: avoid-page;
      }
    }
`;

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

const AUTO_16_5MVA_RATING_VERSION = 'image-2026-07-13-v1';
const RATING_NAMEPLATE_VERSION_KEY = '_rating_nameplate_version';

const getJobRatingDefaults = (type: TransformerType, capacity: TransformerCapacity) => {
  if (type === 'Auto' && capacity === '8MVA') {
    return AUTO_8MVA_RATING_DEFAULTS;
  }
  if (type === 'Auto' && capacity === '12.3MVA') {
    return AUTO_12_3MVA_RATING_DEFAULTS;
  }
  if (type === 'Auto' && capacity === '16.5MVA') {
    return AUTO_16_5MVA_RATING_DEFAULTS;
  }
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

const getJobRatingNameplateFields = (job: Job) => {
  const rating = {
    ...getJobRatingDefaults(job.type, job.capacity),
    ...(job.ratingData || {}),
  };
  const isAutoNameplate =
    job.type === 'Auto' &&
    (job.capacity === '8MVA' || job.capacity === '12.3MVA' || job.capacity === '16.5MVA');

  return [
    { label: '1. Sr. No', value: rating.rating_sr_no },
    {
      label: isAutoNameplate ? '2. Manufacturing Year' : '2. Commissioning year',
      value: rating.rating_comm_year,
    },
    { label: '3. Voltage rating (kV) - HV', value: rating.rating_hv_v },
    { label: '3. Voltage rating (kV) - LV', value: rating.rating_lv_v },
    { label: '4. HV Current (Amp.)', value: rating.rating_hv_a },
    { label: '5. LV Current (Amp.)', value: rating.rating_lv_a },
    {
      label: isAutoNameplate ? '6. Oil Quanity (Ltrs.)' : '6. Oil Qty (Ltrs)',
      value: rating.rating_oil_ltrs,
    },
    {
      label: isAutoNameplate ? '7. Oil Quanity (kG.)' : '7. Oil Qty (kG)',
      value: rating.rating_oil_kg,
    },
    { label: '8. Core + Winding (kG)', value: rating.rating_core_wdg },
    { label: '9. No. of Taps', value: rating.rating_taps },
    { label: '10. % impedance (%)', value: rating.rating_impedance },
    {
      label: isAutoNameplate
        ? '11. Permissible Temp rise over Amb. Oil /Winding'
        : '11. Permissible Temp rise (°C)',
      value: rating.rating_temp_rise,
    },
    { label: '12. Transport weight', value: rating.rating_transport_wt },
    ...(!isAutoNameplate
      ? [{ label: '13. Length * Width * Height', value: rating.rating_dimensions }]
      : []),
    {
      label: isAutoNameplate ? '13. No. Of radiator' : '14. No. of Radiators',
      value: rating.rating_radiators,
    },
  ];
};

const renderJobRatingNameplateRows = (job: Job) => {
  const fields = getJobRatingNameplateFields(job);
  let rows = '';

  for (let index = 0; index < fields.length; index += 2) {
    const left = fields[index];
    const right = fields[index + 1];
    rows += `
      <tr>
        <td style="font-weight: 600; color: #475569; width: 25%;">${left.label}</td>
        <td style="font-weight: 700; color: #0f172a; width: 25%;">${left.value || '-'}</td>
        ${
          right
            ? `<td style="font-weight: 600; color: #475569; width: 25%;">${right.label}</td>
               <td style="font-weight: 700; color: #0f172a; width: 25%;">${right.value || '-'}</td>`
            : '<td colspan="2"></td>'
        }
      </tr>
    `;
  }

  return rows;
};

const CT_SECTIONS = ['1.1', '2', '2.1', 'WTI'] as const;
type CTSection = typeof CT_SECTIONS[number];

const RATIO_ROWS = [
  { percent: '20%', applied: { '1.1': '120', '2': '120', '2.1': '240', 'WTI': '60' } },
  { percent: '40%', applied: { '1.1': '240', '2': '240', '2.1': '480', 'WTI': '120' } },
  { percent: '60%', applied: { '1.1': '360', '2': '360', '2.1': '720', 'WTI': '180' } },
  { percent: '80%', applied: { '1.1': '480', '2': '480', '2.1': '960', 'WTI': '240' } },
  { percent: '100%', applied: { '1.1': '600', '2': '600', '2.1': '1200', 'WTI': '300' } }
];

const KNEE_ROWS = [
  { percent: '20%', applied: '35' },
  { percent: '40%', applied: '70' },
  { percent: '60%', applied: '105' },
  { percent: '80%', applied: '140' },
  { percent: '100%', applied: '175' },
  { percent: '110%', applied: '192.5' }
];

const NAMES_TECHNICIANS = [
  'NITIN PATIL', 'PANKAJ KAWLE', 'AKASH PANCHESWAR', 'CHANCHALESH RABLE', 
  'ROHIT SONEWANE', 'RIPEKSHIT TUMBALE', 'ABHIJIT KHARKATE', 'HEMANT BHAGAT'
];

const NAMES_REVIEWERS = [
  'SOMYA DAS', 'GAURAV KUREKAR', 'KAPIL GAUTAM', 'HEMANT BHAGAT', 'PANKAJ KAWLE'
];

const NAMES_AUTHORIZERS = [
  'KIRAN JOHARAPURKAR', 'SHREYASH BHAVE', 'VIKAS CHAUHAN'
];

const FormContext = createContext<{
  data: Record<string, string>;
  handleFieldChange: (key: string, value: string) => void;
  currentRole: UserRole;
  styleMode?: 'rating' | 'standard' | 'checklist';
} | null>(null);

function Field({ id, pdfValue, label, className = "", placeholder="-", type = "text", readOnly }: { id: string, pdfValue?: string, label?: string, className?: string, placeholder?: string, type?: string, readOnly?: boolean }) {
  const ctx = useContext(FormContext);
  if (!ctx) return null;
  const { data, handleFieldChange, styleMode } = ctx;
  const value = data[id] !== undefined ? data[id] : (pdfValue || '');

  if (styleMode === 'rating') {
    return (
      <div className={`flex flex-col gap-1 w-full ${className}`}>
        {label && <span className="text-[10px] font-bold text-[#64748b] bg-transparent uppercase px-1">{label}</span>}
        <input 
          type={type}
          className="w-full p-2 text-sm font-bold bg-industrial-bg/5 rounded border-b border-transparent focus:border-industrial-accent focus:bg-industrial-accent/5 outline-none transition-all"
          value={value}
          onChange={(e) => handleFieldChange(id, e.target.value)}
          placeholder={pdfValue || placeholder}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (styleMode === 'checklist') {
    return (
      <input 
        type={type}
        className={`w-full p-2 text-sm font-bold outline-none focus:bg-industrial-accent/5 transition-colors bg-transparent border-none text-center ${className}`}
        value={data[id] || ''}
        onChange={(e) => handleFieldChange(id, e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    );
  }

  // standard style
  const isEditableCTNameplate = /^np_.+_(make|year|mfg_sr)$/.test(id);
  const isReadOnlyPdf = pdfValue && !isEditableCTNameplate && id !== 'rating_sr_no' && id !== 'rating_comm_year' && id !== 'rating_dimensions' && !id.startsWith('ratio_') && !id.startsWith('kv_') && !id.startsWith('bushing_') && !id.startsWith('pct_') && !id.startsWith('vpd_') && !id.startsWith('oil_') && !id.startsWith('pt_') && !id.startsWith('before_') && !id.startsWith('after_') && !id.startsWith('ir_') && !id.startsWith('lv_') && !id.startsWith('hv_') && !id.startsWith('pre-servicing_') && !id.startsWith('post-servicing_');
  if (isReadOnlyPdf || readOnly) {
    return (
      <div className={`flex flex-col gap-1 w-full ${className}`}>
        {label && <span className="text-[10px] font-bold text-industrial-text-muted uppercase px-1">{label}</span>}
        <div className="p-2 text-center font-bold text-gray-500 bg-gray-100/30 border border-gray-100 rounded">
          {value || '-'}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && <span className="text-[10px] font-bold text-industrial-text-muted uppercase px-1">{label}</span>}
      <input 
        type={type}
        className={`w-full p-2 text-sm font-bold outline-none focus:bg-industrial-accent/5 transition-colors border-none ${label ? 'bg-industrial-bg/5 rounded' : 'bg-transparent text-center'}`}
        value={data[id] !== undefined ? data[id] : (pdfValue || '')}
        onChange={(e) => handleFieldChange(id, e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}

function CompanyHeader() {
  return (
    <div className="text-center mb-10 pb-6 border-b-2 border-industrial-border flex flex-col items-center justify-center">
      <img 
        src="https://apivishvaspower.com/logo.png" 
        alt="Vishvas Power Logo" 
        className="h-16 md:h-20 object-contain mb-4 filter drop-shadow-sm"
        referrerPolicy="no-referrer"
      />
      <h1 className="text-xl font-black text-industrial-text tracking-[0.2em] uppercase">M/S VISHVAS POWER ENGINEERING SERVICES (P) LTD</h1>
      <p className="text-xs text-industrial-text-muted font-bold tracking-[0.4em] mt-2">K-5, MIDC, BUTIBORI INDUSTRIAL AREA, NAGPUR</p>
    </div>
  );
}

function JobRatingForm({ job, onUpdate, currentRole = 'Admin_Tested' }: { job: Job, onUpdate: (data: Record<string, string>) => void, currentRole?: UserRole }) {
  const baseData = job.ratingData || {};
  const matches = job.name.match(/\d+/g);
  const jobNumber = matches && matches.length > 0 ? matches[matches.length - 1] : '';
  const defaultSrNo = jobNumber ? `V/M/${jobNumber}` : '';
  const ratingDefaults = getJobRatingDefaults(job.type, job.capacity);
  const shouldMigrateAuto165Rating =
    job.type === 'Auto' &&
    job.capacity === '16.5MVA' &&
    baseData[RATING_NAMEPLATE_VERSION_KEY] !== AUTO_16_5MVA_RATING_VERSION;
  const migratedBaseData = shouldMigrateAuto165Rating
    ? {
        ...baseData,
        ...AUTO_16_5MVA_RATING_DEFAULTS,
        [RATING_NAMEPLATE_VERSION_KEY]: AUTO_16_5MVA_RATING_VERSION,
      }
    : baseData;
  const isAutoNameplate = job.type === 'Auto' && (job.capacity === '8MVA' || job.capacity === '12.3MVA' || job.capacity === '16.5MVA');
  
  const data = {
    ...ratingDefaults,
    ...migratedBaseData,
    rating_sr_no: migratedBaseData.rating_sr_no || defaultSrNo || ratingDefaults.rating_sr_no || ''
  };

  useEffect(() => {
    if (shouldMigrateAuto165Rating) {
      onUpdate(migratedBaseData);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    onUpdate({ ...data, [key]: value });
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: 'rating' }}>
      <div className="bg-white p-8 rounded-xl border-x border-b border-industrial-border shadow-sm mb-12">
        <CompanyHeader />
        <div className="bg-industrial-bg/50 -mx-8 -mt-8 p-6 mb-8 border-b border-industrial-border flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black tracking-tighter text-industrial-text flex items-center gap-3">
                 <Database className="text-industrial-accent" size={24} /> JOB RATING & NAMEPLATE
              </h2>
              <p className="text-[10px] font-bold text-industrial-text-muted uppercase tracking-[0.3em]">Master Configuration Data</p>
           </div>
           <div className="text-right">
              <span className="text-2xl font-black text-industrial-accent mr-2">{job.capacity}</span>
              <span className="text-xs font-bold text-industrial-text-muted uppercase">{job.type} TYPE</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <Field id="rating_sr_no" pdfValue={ratingDefaults.rating_sr_no || 'V/M/'} label="1. Sr. No" />
          <Field id="rating_comm_year" pdfValue={ratingDefaults.rating_comm_year} label={isAutoNameplate ? '2. Manufacturing Year' : '2. Commissioning year'} placeholder="YYYY" />
          <div className="grid grid-cols-2 gap-4">
             <Field id="rating_hv_v" pdfValue={ratingDefaults.rating_hv_v} label={isAutoNameplate ? '3. Voltage rating (kV) - HV' : '3. HV Voltage (kV)'} />
             <Field id="rating_lv_v" pdfValue={ratingDefaults.rating_lv_v} label={isAutoNameplate ? '3. Voltage rating (kV) - LV' : 'LV Voltage (kV)'} />
          </div>
          <Field id="rating_hv_a" pdfValue={ratingDefaults.rating_hv_a} label="4. HV Current (Amp.)" />
          <Field id="rating_lv_a" pdfValue={ratingDefaults.rating_lv_a} label="5. LV Current (Amp.)" />
          <div className="grid grid-cols-2 gap-4">
             <Field id="rating_oil_ltrs" pdfValue={ratingDefaults.rating_oil_ltrs} label={isAutoNameplate ? '6. Oil Quanity (Ltrs.)' : '6. Oil Qty (Ltrs)'} />
             <Field id="rating_oil_kg" pdfValue={ratingDefaults.rating_oil_kg} label={isAutoNameplate ? '7. Oil Quanity (kG.)' : '7. Oil Qty (kG)'} />
          </div>
          <Field id="rating_core_wdg" pdfValue={ratingDefaults.rating_core_wdg} label="8. Core + Winding (kG)" />
          <Field id="rating_taps" pdfValue={ratingDefaults.rating_taps} label="9. No. of Taps" />
          <Field id="rating_impedance" pdfValue={ratingDefaults.rating_impedance} label="10. % impedance (%)" />
          <Field id="rating_temp_rise" pdfValue={ratingDefaults.rating_temp_rise} label={isAutoNameplate ? '11. Permissible Temp rise over Amb. Oil /Winding' : '11. Permissible Temp rise (°C)'} />
          <Field id="rating_transport_wt" pdfValue={ratingDefaults.rating_transport_wt} label="12. Transport weight" />
          {!isAutoNameplate && (
            <Field id="rating_dimensions" label="13. Length * Width * Height" placeholder="L x W x H" />
          )}
          <Field id="rating_radiators" pdfValue={ratingDefaults.rating_radiators} label={isAutoNameplate ? '13. No. Of radiator' : '14. No. of Radiators'} />
        </div>
      </div>
    </FormContext.Provider>
  );
}

function CTTestForm({ test, job, onUpdate }: { test: TransformerTest, job?: Job, onUpdate: (data: Record<string, string>) => void }) {
  const baseData = test.observationData || {};
  const ctConfig = getCTConfig(job?.type, job?.capacity);
  const data = seedCTNameplateDefaults(baseData, job?.type, job?.capacity);
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(baseData)) {
      onUpdate(data);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };
    const nowString = new Date().toLocaleString();

    if (key === 'tested_by') {
      updated['tested_at'] = value ? nowString : '';
    }
    if (key === 'reviewed_by') {
      updated['reviewed_at'] = value ? nowString : '';
    }
    if (key === 'authorized_by') {
      updated['authorized_at'] = value ? nowString : '';
    }

    onUpdate(updated);
  };

  return (
    <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
      <CompanyHeader />
      {/* Name Plate Details */}
      <section>
        <h4 className="text-sm font-bold uppercase tracking-widest text-industrial-accent mb-4 flex items-center gap-2">
          <Database size={16} /> Name Plate Details
        </h4>
        <div className="overflow-x-auto border border-industrial-border rounded-lg">
          <table className="w-full text-xs font-mono">
            <thead className="bg-industrial-bg">
              <tr>
                <th className="p-3 border-r border-b border-industrial-border text-left w-12 text-industrial-text-muted">Sr. No</th>
                <th className="p-3 border-r border-b border-industrial-border text-left text-industrial-text-muted">Description</th>
                {ctConfig.sections.map(s => (
                  <th key={s} className="p-3 border-r border-b border-industrial-border text-center text-industrial-accent font-bold">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ctConfig.nameplateRows.map((row) => (
                <tr key={row.key} className="hover:bg-industrial-bg/10">
                  <td className="p-2 border-r border-b border-industrial-border text-center text-industrial-text-muted">{row.id}</td>
                  <td className="p-2 border-r border-b border-industrial-border font-medium">{row.label}</td>
                  {ctConfig.sections.map(s => (
                    <td key={s} className="p-1 border-r border-b border-industrial-border">
                      <Field id={`np_${s}_${row.key}`} pdfValue={row.defaults[s]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RATIO & KNEE POINT TESTS */}
      {ctConfig.sections.map(section => (
        <section key={section} className="pt-8 border-t border-industrial-border relative">
          <div className="absolute -top-3 left-6 px-3 bg-white text-industrial-accent font-bold text-xs border border-industrial-accent rounded-full flex items-center gap-2">
            SECTION {section}
          </div>
          <div className="absolute -top-3 right-6 bg-white px-2 flex items-center gap-2 border border-industrial-border rounded-full py-0.5">
            <span className="text-[10px] uppercase font-bold text-industrial-text-muted">Sr. No.:</span>
            <span className="text-industrial-accent font-bold text-xs px-2 min-w-[5rem] text-center">
              {data[`np_${section}_mfg_sr`] || '-'}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ratio Test */}
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted mb-3">Ratio Test Core -S1-S2</h5>
              <div className="border border-industrial-border rounded-lg overflow-hidden">
                <table className="w-full text-[10px] font-mono">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="p-2 border-r border-b border-industrial-border text-left">Current %</th>
                      <th className="p-2 border-r border-b border-industrial-border text-center">Applied Primary Current (A)</th>
                      <th className="p-2 border-b border-industrial-border text-center bg-amber-50 text-industrial-accent">Measured Secondary (A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RATIO_ROWS.map((row) => (
                      <tr key={row.percent}>
                        <td className="p-2 border-r border-b border-industrial-border font-bold">{row.percent}</td>
                        <td className="p-2 border-r border-b border-industrial-border text-center bg-industrial-bg/30 text-industrial-text-muted">
                          {getRatioAppliedPrimary(section, row.percent, data[`np_${section}_ratio`], job?.type, job?.capacity)}
                        </td>
                        <td className="p-1 border-b border-industrial-border">
                          <Field id={`ratio_${section}_${row.percent}_measured`} placeholder="Enter measured value" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Knee Point Voltage */}
            <div>
              {section !== 'WTI' ? (
                <>
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted mb-3">Knee Point Voltage</h5>
                  <div className="border border-industrial-border rounded-lg overflow-hidden mb-3">
                    <table className="w-full text-[10px] font-mono">
                      <thead className="bg-[#f8fafc]">
                        <tr>
                          <th className="p-2 border-r border-b border-industrial-border text-left">Voltage %</th>
                          <th className="p-2 border-r border-b border-industrial-border text-center">Applied Voltage (V)</th>
                          <th className="p-2 border-b border-industrial-border text-center bg-blue-50 text-industrial-accent">Measured Current (mA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {KNEE_ROWS.map((row) => {
                          const val = (parseFloat(row.percent) / 100 * parseFloat(data[`np_${section}_knee_v`] || ctConfig.getKneeFallback(section)));
                          const calculatedVal = isNaN(val) ? '-' : (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1));
                          return (
                            <tr key={row.percent}>
                              <td className="p-2 border-r border-b border-industrial-border font-bold">{row.percent}</td>
                              <td className="p-2 border-r border-b border-industrial-border text-center bg-industrial-bg/30 text-industrial-text-muted">
                                {calculatedVal}
                              </td>
                              <td className="p-1 border-b border-industrial-border">
                                <Field id={`kv_${section}_${row.percent}_measured`} placeholder="Enter mA" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="mb-6">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted mb-3">Auxiliary Checks</h5>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 border border-industrial-border rounded p-2 bg-industrial-bg/20">
                  <span className="text-[10px] font-bold uppercase text-industrial-text-muted">Continuity:</span>
                  <Field id={`cont_${section}`} placeholder="OK / Not OK" className="flex-1 text-left" />
                </div>
                <div className="flex items-center gap-2 border border-industrial-border rounded p-2 bg-industrial-bg/20">
                  <span className="text-[10px] font-bold uppercase text-industrial-text-muted">Resistance:</span>
                  <div className="flex-1 flex items-center justify-between gap-1">
                    <Field id={`res_${section}`} placeholder="Value" className="flex-1 text-left" />
                    <span className="text-sm font-bold text-industrial-accent mr-1">Ω</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Signature Section Placeholder */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.tested_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.tested_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY (TESTED)</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.reviewed_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.reviewed_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY (REVIEWED)</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.authorized_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.authorized_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY (AUTHORIZED)</p>
        </div>
      </div>
    </div>
  );
}

function BushingTestForm({ test, onUpdate }: { test: TransformerTest, onUpdate: (data: Record<string, string>) => void }) {
  const data = test.observationData || {};
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const handleFieldChange = (key: string, value: string) => {
    onUpdate({ ...data, [key]: value });
  };

  const BUSHING_VOLTAGES = ['05 KV', '10 KV'];
  const BUSHING_SECTIONS = ['1.1', '2'] as const;

  return (
    <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
      <CompanyHeader />
      {/* Header Info */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-industrial-bg/10 p-6 rounded-xl border border-industrial-border">
        <div className="space-y-4">
          <Field id="bushing_make" label="Temp (°C)" className="text-left" />
          <Field id="bushing_sr_no" label="Humidity(%)" className="text-left" />
        </div>
        <div className="space-y-4">
          <Field id="bushing_meter_make" pdfValue="DOBEL" label="Meter Make" className="text-left" />
          <Field id="bushing_meter_sr" pdfValue="DOB-2023-01" label="SL. NO." className="text-left" />
        </div>
      </section>

      {/* Test Tables */}
      {BUSHING_SECTIONS.map((section) => (
        <section key={section} className="border border-industrial-border rounded-xl overflow-hidden">
          <div className="bg-industrial-bg/50 px-4 py-2 border-b border-industrial-border flex justify-between items-center">
            <span className="text-xs font-bold text-industrial-accent uppercase tracking-widest">SECTION {section} - Mode: UST R/B</span>
          </div>
          <div className="p-4 bg-industrial-bg/5 border-b border-industrial-border grid grid-cols-2 gap-4">
            <Field id={section === '1.1' ? "section1_1_sr_no" : "section2_sr_no"} label="Sr. No." className="text-left" />
            <Field id={section === '1.1' ? "section1_1_make" : "section2_make"} label="Make" className="text-left" />
          </div>
          <table className="w-full text-[10px] font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted">
              <tr>
                <th className="p-3 border-r border-b border-industrial-border text-left w-24">VOLTAGE (kV)</th>
                <th className="p-3 border-r border-b border-industrial-border text-center">TAN DELTA (%)</th>
                <th className="p-3 border-r border-b border-industrial-border text-center">CAPACITANCE (pF)</th>
                <th className="p-3 border-r border-b border-industrial-border text-center">EXCITATION CURRENT (mA)</th>
                <th className="p-3 border-b border-industrial-border text-center">DIELECTRIC LOSS (W)</th>
              </tr>
            </thead>
            <tbody>
              {BUSHING_VOLTAGES.map((voltage) => (
                <tr key={voltage}>
                  <td className="p-3 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{voltage}</td>
                  {['tan_delta', 'capacitance', 'excitation', 'dielectric'].map((col) => (
                    <td key={col} className="p-1 border-r border-b border-industrial-border last:border-r-0">
                      <Field id={`bushing_${section}_${voltage}_${col}`} placeholder="-" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.tested_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.tested_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY (TESTED)</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.reviewed_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.reviewed_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY (REVIEWED)</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.authorized_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.authorized_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY (AUTHORIZED)</p>
        </div>
      </div>
    </div>
  );
}

function PostConnectionTestForm({ test, job, onUpdate }: { test: TransformerTest, job?: Job, onUpdate: (data: Record<string, string>) => void }) {
  const rawData = seedPostConnWindingResGuaranteed(test.observationData || {}, job?.type, job?.capacity);
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const RATIO_TERMINALS = ['(1.1-2.)-(2.1-2)', '(1.1-2)-(2.1-1.1)', '(1.1-2.1)-(2-2.1)'];
  const MAG_TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

  const fixedCalRatios: Record<string, string> = {
    '(1.1-2.)-(2.1-2)': '2',
    '(1.1-2)-(2.1-1.1)': '2',
    '(1.1-2.1)-(2-2.1)': '1'
  };

  const calculateImpedance = (updated: Record<string, string>) => {
    let changed = false;

    const v1 = parseFloat(updated['pct_sc_v1'] || '');
    const ref1 = parseFloat(updated['pct_sc_ref1'] || '');
    const z1 = calculatePostConnScImpedanceZ(v1, ref1, job?.type, job?.capacity);
    if (updated['pct_sc_z'] !== z1) {
      updated['pct_sc_z'] = z1;
      changed = true;
    }

    const v2 = parseFloat(updated['pct_sc_v2'] || '');
    const ref2 = parseFloat(updated['pct_sc_ref2'] || '');
    const z2 = calculatePostConnScImpedanceZ(v2, ref2, job?.type, job?.capacity);
    if (updated['pct_sc_z2'] !== z2) {
      updated['pct_sc_z2'] = z2;
      changed = true;
    }

    return changed;
  };

  const data: Record<string, string> = {
    'pct_mag_meter_make': 'HTC',
    'pct_mag_sr_no': 'HTC2406CG0246',
    ...rawData,
    'pct_ratio_(1.1-2.)-(2.1-2)_cal': '2',
    'pct_ratio_(1.1-2)-(2.1-1.1)_cal': '2',
    'pct_ratio_(1.1-2.1)-(2-2.1)_cal': '1'
  };

  useEffect(() => {
    let changed = false;
    const updated = { ...rawData };

    if (!updated['pct_mag_meter_make']) {
      updated['pct_mag_meter_make'] = 'HTC';
      changed = true;
    }
    if (!updated['pct_mag_sr_no']) {
      updated['pct_mag_sr_no'] = 'HTC2406CG0246';
      changed = true;
    }

    RATIO_TERMINALS.forEach(term => {
      const calKey = `pct_ratio_${term}_cal`;
      if (updated[calKey] !== fixedCalRatios[term]) {
        updated[calKey] = fixedCalRatios[term];
        changed = true;
      }
      
      const measVal = parseFloat(updated[`pct_ratio_${term}_measured`] || '');
      const calVal = parseFloat(fixedCalRatios[term]);
      const devKey = `pct_ratio_${term}_dev`;
      if (!isNaN(measVal)) {
        const expectedDev = (((measVal - calVal) / calVal) * 100).toFixed(2);
        if (updated[devKey] !== expectedDev) {
          updated[devKey] = expectedDev;
          changed = true;
        }
      }
    });

    if (calculateImpedance(updated)) {
      changed = true;
    }

    if (changed) {
      onUpdate(updated);
    } else if (JSON.stringify(rawData) !== JSON.stringify(test.observationData || {})) {
      onUpdate(rawData);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };

    // Auto calculate date and time when roles are selected
    if (key === 'pct_tested_by') {
      if (value) {
        updated['pct_tested_date'] = new Date().toLocaleString();
      } else {
        updated['pct_tested_date'] = '';
      }
    }
    if (key === 'pct_reviewed_by') {
      if (value) {
        updated['pct_reviewed_date'] = new Date().toLocaleString();
      } else {
        updated['pct_reviewed_date'] = '';
      }
    }
    if (key === 'pct_authorized_by') {
      if (value) {
        updated['pct_authorized_date'] = new Date().toLocaleString();
      } else {
        updated['pct_authorized_date'] = '';
      }
    }

    // Auto calculate IR ratio (60s/15s)
    if (key === 'pct_ir_15s' || key === 'pct_ir_10s' || key === 'pct_ir_60s') {
      const v15 = parseFloat(updated['pct_ir_15s'] || updated['pct_ir_10s'] || '');
      const v60 = parseFloat(updated['pct_ir_60s']);
      if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
        updated['pct_ir_ratio'] = (v60 / v15).toFixed(2);
      } else if ((updated['pct_ir_15s'] === '' && updated['pct_ir_10s'] === '') || updated['pct_ir_60s'] === '') {
        updated['pct_ir_ratio'] = '';
      }
    }

    // Auto calculate ratio deviation: ((measured - cal) / cal) * 100
    RATIO_TERMINALS.forEach(term => {
      const calKey = `pct_ratio_${term}_cal`;
      const measuredKey = `pct_ratio_${term}_measured`;
      const devKey = `pct_ratio_${term}_dev`;

      if (key === calKey || key === measuredKey) {
        const calVal = parseFloat(updated[calKey] || fixedCalRatios[term]);
        const measVal = parseFloat(updated[measuredKey]);

        if (!isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
          const dev = ((measVal - calVal) / calVal) * 100;
          updated[devKey] = dev.toFixed(2);
        } else if (updated[calKey] === '' || updated[measuredKey] === '') {
          updated[devKey] = '';
        }
      }
    });

    // Auto calculate Impedance %Z
    if (['pct_sc_v1', 'pct_sc_ref1', 'pct_sc_v2', 'pct_sc_ref2'].includes(key)) {
      calculateImpedance(updated);
    }

    // Auto calculate winding resistance @ 75°C
    if (key === 'pct_res_wdg_temp' || key === 'pct_res_amb_temp' || (key.startsWith('pct_res_') && key.endsWith('_amb'))) {
      let windingT = parseFloat(updated['pct_res_wdg_temp'] || '');
      if (isNaN(windingT)) {
        windingT = parseFloat(updated['pct_res_amb_temp'] || '');
      }
      MAG_TERMINALS.forEach(term => {
        const ambKey = `pct_res_${term}_amb`;
        const r75Key = `pct_res_${term}_75c`;
        const rAmb = parseFloat(updated[ambKey] || '');
        if (!isNaN(windingT) && !isNaN(rAmb)) {
          const r75 = ((235 + 75) / (235 + windingT)) * rAmb;
          updated[r75Key] = r75.toFixed(4);
        } else if (updated[ambKey] === '') {
          updated[r75Key] = '';
        }
      });
    }

    onUpdate(updated);
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: ctx?.styleMode }}>
      <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
        <CompanyHeader />
        {/* 1. IR VALUES */}
        <section className="space-y-6">
          <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MEASUREMENT OF IR VALUES</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="grid grid-cols-2 gap-4 bg-industrial-bg/5 p-4 rounded-lg border border-industrial-border">
              <Field id="pct_date" type="date" label="Date" />
              <Field id="pct_time" type="time" label="Time" />
              <Field id="pct_amb_temp" label="Amb. Temp (⁰C)" />
              <Field id="pct_wdg_temp" label="Wdg. Temp (⁰C)" />
              <Field id="pct_core_temp" label="Core Temp (⁰C)" />
              <Field id="pct_humidity" label="Relative Humidity (%)" />
           </div>
           <div className="bg-industrial-bg/10 p-4 rounded-lg border border-industrial-border">
              <div className="flex items-center gap-2 border-b border-industrial-border pb-2 mb-4">
                <HardDrive size={14} className="text-industrial-accent" />
                <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest">Insulation Tester Details</h6>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <Field id="pct_tester_make" label="Make" />
                 <Field id="pct_tester_sr_no" label="Sr. No" />
                 <Field id="pct_tester_range" label="Range" />
                 <Field id="pct_tester_v_level" label="Voltage Level" />
              </div>
           </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Combination</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">15 Sec (MΩ)</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">60 Sec (MΩ)</th>
                <th className="p-4 border-b border-industrial-border text-center">Ratio (60/15s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10">WINDING-EARTH</td>
                <td className="p-1 border-r border-industrial-border">
                   <Field id="pct_ir_15s" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border">
                   <Field id="pct_ir_60s" placeholder="-" />
                </td>
                <td className="p-1">
                   <Field id="pct_ir_ratio" placeholder="-" readOnly={true} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">RATIO TEST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Ratio Meter Details</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="pct_ratio_meter_make" pdfValue="Eltel" label="Meter Make" />
                <Field id="pct_ratio_meter_sr_no" label="Sr. No." />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Date & Time</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="pct_ratio_test_date" type="date" label="Test Date" />
                <Field id="pct_ratio_test_time" type="time" label="Test Time" />
             </div>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted font-bold">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Terminals</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">CAL. RATIO</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">MEASURED RATIO</th>
                <th className="p-4 border-b border-industrial-border text-center">DEVIATION %</th>
              </tr>
            </thead>
            <tbody>
              {RATIO_TERMINALS.map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pct_ratio_${term}_cal`} placeholder="-" readOnly={true} />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pct_ratio_${term}_measured`} placeholder="-" />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field id={`pct_ratio_${term}_dev`} placeholder="-" readOnly={true} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. VOLTAGE RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">VOLTAGE RATIO TEST</span>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              {/* Process / Voltage Ratio Test Row */}
              <tr className="bg-blue-100/85 text-industrial-text font-bold uppercase tracking-wider text-sm border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-left font-black w-2/5">PROCESS</th>
                <th className="p-3 text-center font-black" colSpan={2}>VOLTAGE RATIO TEST</th>
              </tr>
              {/* Applied Voltage / Measured Voltage Row */}
              <tr className="bg-slate-200 text-industrial-text font-bold uppercase tracking-wider text-xs border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-center">APPLIED VOLTAGE (V)</th>
                <th className="p-3 text-center" colSpan={2}>MEASURED VOLTAGE (V)</th>
              </tr>
            </thead>
            <tbody>
              {/* Scenario 1 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">1.1-2</td>
                <td className="p-2 border-r border-industrial-border">1.1-2.1</td>
                <td className="p-2">2-2.1</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_volt_ratio_sc1_applied" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_volt_ratio_sc1_m1" placeholder="-" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pct_volt_ratio_sc1_m2" placeholder="-" />
                </td>
              </tr>

              {/* Scenario 2 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">1.1-2.1</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2">2-2.1</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_volt_ratio_sc2_applied" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_volt_ratio_sc2_m1" placeholder="-" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pct_volt_ratio_sc2_m2" placeholder="-" />
                </td>
              </tr>

              {/* Scenario 3 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">2.1-2</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2">1.1-2.1</td>
              </tr>
              <tr className="border-b-0">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_volt_ratio_sc3_applied" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_volt_ratio_sc3_m1" placeholder="-" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pct_volt_ratio_sc3_m2" placeholder="-" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. MAGNETIZING CURRENT TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MAGNETIZING CURRENT TEST</span>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4">
          {/* Header 1: APPLIED VOLTAGE (V), DATE, TIME */}
          <div className="border border-industrial-border grid grid-cols-6 items-center text-xs rounded-t-lg overflow-hidden">
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              APPLIED VOLTAGE (V) :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-white">
              <Field id="pct_mag_volt" placeholder="" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              DATE:
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-white">
              <Field id="pct_mag_date" type="date" placeholder="DD/MM/YYYY" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              TIME:
            </div>
            <div className="p-1 col-span-1 bg-white">
              <Field id="pct_mag_time" type="time" placeholder="HH:MM" />
            </div>
          </div>

          {/* Header 2: METER MAKE, SR NO. */}
          <div className="border-x border-b border-industrial-border grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              METER MAKE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-slate-50/50">
              <Field id="pct_mag_meter_make" placeholder="" className="font-bold bg-slate-50/50" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              SR NO. :
            </div>
            <div className="p-1 col-span-1 bg-slate-50/50">
              <Field id="pct_mag_sr_no" placeholder="" className="font-bold bg-slate-50/50" />
            </div>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Terminals</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">Applied Voltage (V)</th>
                <th className="p-4 border-b border-industrial-border text-center">MEASURED CURRENT <span className="normal-case">(mA)</span></th>
              </tr>
            </thead>
            <tbody>
              {MAG_TERMINALS.map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pct_mag_${term}_v`} placeholder="-" />
                  </td>
                  <td className="p-1">
                    <Field id={`pct_mag_${term}_ma`} placeholder="-" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. SHORT CIRCUIT TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">SHORT CIRCUIT TEST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Instruments & Details</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="pct_sc_meter_make" pdfValue="HTC" label="Meter Make" />
                <Field id="pct_sc_sr_no" pdfValue="HTC2406CG0246" label="Sr. No." />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Parameters & Schedule</h6>
             <div className="grid grid-cols-3 gap-4">
                <Field id="pct_sc_applied" label="Applied Voltages" placeholder="1Φ 20 VOLT APPLIED" />
                <Field id="pct_sc_date" type="date" label="Test Date" />
                <Field id="pct_sc_time" type="time" label="Test Time" />
             </div>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-blue-100/85 text-industrial-text font-bold uppercase tracking-wider text-xs border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-center font-black">TEMINALS</th>
                <th className="p-3 border-r border-industrial-border text-center font-black">APPLIED VOLTAGE (V)<br/><span className="text-[10px] font-normal lowercase italic">(1Φ 20 VOLT APPLIED )</span></th>
                <th className="p-2 border-r border-industrial-border text-center font-black">MEASURED CURRENT (A)</th>
                <th className="p-2 text-center font-black">MEASURED CURRENT (A)</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 subheader / configs */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50" rowSpan={2}>-</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2 border-r border-industrial-border">1.1</td>
                <td className="p-2 font-bold bg-[#f1f5f9]/50">2-2.1 (Short)</td>
              </tr>
              {/* Row 1 user inputs */}
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_sc_v1" placeholder="20" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_sc_a1" placeholder="20" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pct_sc_ref1" placeholder="40" />
                </td>
              </tr>

              {/* Row 2 subheader / configs */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50" rowSpan={2}>-</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2 border-r border-industrial-border">2</td>
                <td className="p-2 font-bold bg-[#f1f5f9]/50">1.1-2.1 (Short)</td>
              </tr>
              {/* Row 2 user inputs */}
              <tr className="border-b-0">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_sc_v2" placeholder="20" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pct_sc_a2" placeholder="20" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pct_sc_ref2" placeholder="40" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="text-center font-black text-sm uppercase tracking-wider text-industrial-text-muted">
            % IMPEDANCE
          </div>
          <div className="grid grid-cols-3 bg-[#cbd5e1]/40 border border-industrial-border rounded-xl text-center items-center font-bold text-sm max-w-md w-full overflow-hidden shadow-sm">
            <div className="p-3 border-r border-b border-industrial-border font-extrabold text-slate-800 uppercase text-xs">
              % Z (Row 1) =
            </div>
            <div className="p-1 border-r border-b border-industrial-border bg-white">
              <Field id="pct_sc_z" placeholder="-" className="text-center font-black" readOnly={true} />
            </div>
            <div className="p-3 border-b border-industrial-border font-extrabold text-slate-800">
              %
            </div>
            <div className="p-3 border-r border-industrial-border font-extrabold text-slate-800 uppercase text-xs">
              % Z (Row 2) =
            </div>
            <div className="p-1 border-r border-industrial-border bg-white">
              <Field id="pct_sc_z2" placeholder="-" className="text-center font-black" readOnly={true} />
            </div>
            <div className="p-3 font-extrabold text-slate-800">
              %
            </div>
          </div>
        </div>
      </section>

      {/* 6. WINDING RESISTANCE TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">WINDING RESISTANCE TEST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Resistance Meter Details</h6>
             <div className="grid grid-cols-3 gap-4">
                <Field id="pct_res_meter_make" label="Meter Make" />
                <Field id="pct_res_sr_no" label="Sr. No." />
                <Field id="pct_res_range" label="Range" />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Environment & Details</h6>
             <div className="grid grid-cols-4 gap-2">
                <Field id="pct_res_wdg_temp" label="Wdg Temp (°C)" />
                <Field id="pct_res_core_temp" label="Core Temp (°C)" />
                <Field id="pct_res_amb_temp" label="Ambient (°C)" />
                <Field id="pct_res_humidity" label="Humidity (%)" />
             </div>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">TEMINALS</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">
                  <div>RESISTANCE @ AMB.</div>
                  <div className="text-[10px] font-bold text-industrial-text-muted mt-1">Ω</div>
                </th>
                <th className="p-4 border-r border-b border-industrial-border text-center bg-orange-50 text-orange-800">
                  <div>RESISTANCE @75°C</div>
                  <div className="text-[10px] font-bold text-orange-800 mt-1">Ω</div>
                </th>
                <th className="p-4 border-b border-industrial-border text-center">
                  <div>MAX. GUARANTEED @75°C</div>
                  <div className="text-[10px] font-bold text-industrial-text-muted mt-1">Ω</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { term: '1.1-2' },
                { term: '1.1-2.1' },
                { term: '2.1-2' }
              ].map(row => (
                <tr key={row.term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{row.term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pct_res_${row.term}_amb`} placeholder="-" />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border bg-orange-50/30">
                    <Field id={`pct_res_${row.term}_75c`} className="text-orange-600 font-bold" placeholder="-" readOnly={true} />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field 
                      id={`pct_res_${row.term}_max`} 
                      placeholder="-" 
                      pdfValue={getPostConnWindingResMaxGuaranteed(row.term, job?.type, job?.capacity)} 
                      readOnly={true}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* VERTICAL 2KV TESTING */}
      <section className="border border-industrial-border rounded-xl overflow-hidden">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center gap-3">
          <Cpu size={16} className="text-industrial-accent" />
          <span className="text-sm font-bold uppercase tracking-widest">VERTICAL - 2KV TESTING</span>
        </div>
        <table className="w-full text-[10px] font-mono">
          <thead className="bg-[#f8fafc] text-industrial-text-muted font-bold uppercase tracking-widest">
            <tr>
              <th className="p-4 border-r border-b border-industrial-border text-left w-48">VERTICAL</th>
              <th className="p-4 border-r border-b border-industrial-border text-center normal-case">voltage applied (kV)</th>
              <th className="p-4 border-r border-b border-industrial-border text-center">DURATION (Sec)</th>
              <th className="p-4 border-b border-industrial-border text-center normal-case">leakage current (mA)</th>
            </tr>
          </thead>
          <tbody>
            {(['CORE-FRAME', 'FRAME-FRAME'] as const).map((row) => {
              const rowKey = row.toLowerCase().replace('-', '_');
              return (
                <tr key={row} className="hover:bg-industrial-bg/10 transition-colors">
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{row}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pt_2kv_vertical_${rowKey}_voltage`} pdfValue="2" readOnly className="text-center" />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pt_2kv_vertical_${rowKey}_duration`} pdfValue="60" readOnly className="text-center" />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field id={`pt_2kv_vertical_${rowKey}_leakage`} placeholder="Enter mA" className="text-center" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.pct_tested_by || ''}
              onChange={(e) => handleFieldChange('pct_tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="pct_tested_date" placeholder="Date & Time" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.pct_reviewed_by || ''}
              onChange={(e) => handleFieldChange('pct_reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="pct_reviewed_date" placeholder="Date & Time" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.pct_authorized_by || ''}
              onChange={(e) => handleFieldChange('pct_authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="pct_authorized_date" placeholder="Date & Time" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
        </div>
      </div>
    </div>
    </FormContext.Provider>
  );
}

function PostTankingTestForm({ test, job, onUpdate }: { test: TransformerTest, job?: Job, onUpdate: (data: Record<string, string>) => void }) {
  const rawData = seedPostTankingWindingResGuaranteed(test.observationData || {}, job?.type, job?.capacity);
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

  const fixedCalRatios: Record<string, string> = {
    '1.1-2': '2',
    '1.1-2.1': '2',
    '2.1-2': '1'
  };

  const calculatePTImpedance = (updated: Record<string, string>) => {
    let changed = false;

    const v1 = parseFloat(updated['pt_sc_v1'] || '');
    const ref1 = parseFloat(updated['pt_sc_ref1'] || '');
    const z1 = calculatePostTankingScImpedanceZ(v1, ref1, job?.type, job?.capacity);
    if (updated['pt_sc_z'] !== z1) {
      updated['pt_sc_z'] = z1;
      changed = true;
    }

    const v2 = parseFloat(updated['pt_sc_v2'] || '');
    const ref2 = parseFloat(updated['pt_sc_ref2'] || '');
    const z2 = calculatePostTankingScImpedanceZ(v2, ref2, job?.type, job?.capacity);
    if (updated['pt_sc_z2'] !== z2) {
      updated['pt_sc_z2'] = z2;
      changed = true;
    }

    return changed;
  };

  const calculatePTWindingResistance = (updated: Record<string, string>) => {
    let changed = false;
    const windingT = parseFloat(updated['pt_wdg_temp_res'] || '');
    if (!isNaN(windingT)) {
      TERMINALS.forEach(term => {
        const rAmb = parseFloat(updated[`pt_res_${term}_amb`] || '');
        const r75Key = `pt_res_${term}_75c`;
        if (!isNaN(rAmb)) {
          const r75 = ((235 + 75) / (235 + windingT)) * rAmb;
          const r75Str = r75.toFixed(4);
          if (updated[r75Key] !== r75Str) {
            updated[r75Key] = r75Str;
            changed = true;
          }
        } else {
          if (updated[r75Key]) {
            updated[r75Key] = '';
            changed = true;
          }
        }
      });
    } else {
      TERMINALS.forEach(term => {
        const r75Key = `pt_res_${term}_75c`;
        if (updated[r75Key]) {
          updated[r75Key] = '';
          changed = true;
        }
      });
    }
    return changed;
  };

  const data: Record<string, string> = {
    ...rawData,
    'pt_ratio_1.1-2_cal': '2',
    'pt_ratio_1.1-2.1_cal': '2',
    'pt_ratio_2.1-2_cal': '1'
  };

  useEffect(() => {
    let changed = false;
    const updated = { ...rawData };
    TERMINALS.forEach(term => {
      const calKey = `pt_ratio_${term}_cal`;
      if (updated[calKey] !== fixedCalRatios[term]) {
        updated[calKey] = fixedCalRatios[term];
        changed = true;
      }
      
      const measVal = parseFloat(updated[`pt_ratio_${term}_measured`] || '');
      const calVal = parseFloat(fixedCalRatios[term]);
      const devKey = `pt_ratio_${term}_dev`;
      if (!isNaN(measVal)) {
        const expectedDev = (((measVal - calVal) / calVal) * 100).toFixed(2);
        if (updated[devKey] !== expectedDev) {
          updated[devKey] = expectedDev;
          changed = true;
        }
      }
    });

    const fixedMaxGuaranteed: Record<string, string> = {
      '1.1-2': getPostTankingWindingResMaxGuaranteed('1.1-2', job?.type, job?.capacity),
      '1.1-2.1': getPostTankingWindingResMaxGuaranteed('1.1-2.1', job?.type, job?.capacity),
      '2.1-2': getPostTankingWindingResMaxGuaranteed('2.1-2', job?.type, job?.capacity),
    };
    const forceMaxOverwrite = job?.type === 'Auto' && job?.capacity === '12.3MVA';
    TERMINALS.forEach(term => {
      const maxKey = `pt_res_${term}_max`;
      if (forceMaxOverwrite || updated[maxKey] === undefined || updated[maxKey] === '') {
        if (updated[maxKey] !== fixedMaxGuaranteed[term]) {
          updated[maxKey] = fixedMaxGuaranteed[term];
          changed = true;
        }
      }
    });

    const impedanceChanged = calculatePTImpedance(updated);
    if (impedanceChanged) {
      changed = true;
    }

    const windingResChanged = calculatePTWindingResistance(updated);
    if (windingResChanged) {
      changed = true;
    }

    if (changed) {
      onUpdate(updated);
    } else if (JSON.stringify(rawData) !== JSON.stringify(test.observationData || {})) {
      onUpdate(rawData);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };

    if (key === 'pt_tested_by') {
      updated['pt_tested_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'pt_reviewed_by') {
      updated['pt_reviewed_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'pt_authorized_by') {
      updated['pt_authorized_date'] = value ? new Date().toLocaleString() : '';
    }

    // Auto calculate IR ratio (60s/15s)
    if (key === 'pt_ir_15s' || key === 'pt_ir_60s') {
      const v15 = parseFloat(updated['pt_ir_15s']);
      const v60 = parseFloat(updated['pt_ir_60s']);
      if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
        updated['pt_ir_ratio'] = (v60 / v15).toFixed(2);
      } else if (updated['pt_ir_15s'] === '' || updated['pt_ir_60s'] === '') {
        updated['pt_ir_ratio'] = '';
      }
    }

    // Auto calculate ratio deviation: ((measured - cal) / cal) * 100
    TERMINALS.forEach(term => {
      const calKey = `pt_ratio_${term}_cal`;
      const measuredKey = `pt_ratio_${term}_measured`;
      const devKey = `pt_ratio_${term}_dev`;

      if (key === calKey || key === measuredKey) {
        const calVal = parseFloat(updated[calKey]);
        const measVal = parseFloat(updated[measuredKey]);

        if (!isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
          const dev = ((measVal - calVal) / calVal) * 100;
          updated[devKey] = dev.toFixed(2);
        } else if (updated[calKey] === '' || updated[measuredKey] === '') {
          updated[devKey] = '';
        }
      }
    });

    // Auto calculate %Z
    calculatePTImpedance(updated);

    // Auto calculate Winding Resistance
    calculatePTWindingResistance(updated);

    onUpdate(updated);
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: ctx?.styleMode }}>
      <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
        <CompanyHeader />
      {/* 1. IR VALUES */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MEASUREMENT OF IR VALUES</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="grid grid-cols-2 gap-4 bg-industrial-bg/5 p-4 rounded-lg border border-industrial-border">
              <Field id="pt_date" type="date" label="Date" />
              <Field id="pt_time" type="time" label="Time" />
              <Field id="pt_amb_temp" label="Amb. Temp (⁰C)" />
              <Field id="pt_wdg_temp" label="Wdg. Temp (⁰C)" />
              <Field id="pt_core_temp" label="Core Temp (⁰C)" />
              <Field id="pt_humidity" label="Relative Humidity (%)" />
           </div>
           <div className="bg-industrial-bg/10 p-4 rounded-lg border border-industrial-border">
              <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b border-industrial-border pb-2 mb-4">Insulation Tester Details</h6>
              <div className="grid grid-cols-2 gap-4">
                 <Field id="pt_tester_make" placeholder="MEGGER" label="Make" />
                 <Field id="pt_tester_sr_no" placeholder="101979324" label="Sr. No" />
                 <Field id="pt_tester_range" placeholder="1-TO-5 kV" label="Range" />
                 <Field id="pt_tester_v_level" label="Voltage Level" />
              </div>
           </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Combination</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">15 Sec (MΩ)</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">60 Sec (MΩ)</th>
                <th className="p-4 border-b border-industrial-border text-center">Ratio of 60 Sec/ 15 Sec</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10">WINDING-EARTH</td>
                <td className="p-1 border-r border-industrial-border">
                   <Field id="pt_ir_15s" placeholder="" />
                </td>
                <td className="p-1 border-r border-industrial-border">
                   <Field id="pt_ir_60s" placeholder="" />
                </td>
                <td className="p-1">
                   <Field id="pt_ir_ratio" placeholder="" readOnly={true} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm max-w-2xl">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {([
                { key: 'core_to_frame', label: 'core to frame :' },
                { key: 'core_to_tank', label: 'core to tank :' },
                { key: 'frame_to_tank', label: 'frame to tank :' },
              ] as const).map((row) => (
                <tr key={row.key} className="border-b border-industrial-border last:border-0">
                  <td className="p-3 border-r border-industrial-border font-medium text-left w-40">{row.label}</td>
                  <td className="p-1 border-r border-industrial-border">
                    <Field id={`pt_ir_${row.key}`} placeholder="" className="text-center" />
                  </td>
                  <td className="p-3 text-center text-industrial-text-muted w-16">(MΩ)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">RATIO TEST</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Ratio Meter Details</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="pt_ratio_meter_make" placeholder="Eltel" label="Meter Make" />
                <Field id="pt_ratio_meter_sr_no" placeholder="20231604" label="Sr. No." />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Date & Time</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="pt_ratio_test_date" placeholder="DD-MM-YYYY" label="Test Date" />
                <Field id="pt_ratio_test_time" placeholder="HH:MM" label="Test Time" />
             </div>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted font-bold">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Terminals</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">CAL. RATIO</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">MEASURED RATIO</th>
                <th className="p-4 border-b border-industrial-border text-center">DEVIATION %</th>
              </tr>
            </thead>
            <tbody>
              {[
                { term: '1.1-2' },
                { term: '1.1-2.1' },
                { term: '2.1-2' }
              ].map(row => (
                <tr key={row.term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{row.term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pt_ratio_${row.term}_cal`} placeholder="-" readOnly={true} />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pt_ratio_${row.term}_measured`} placeholder="-" />
                  </td>
                  <td className={`p-1 border-b border-industrial-border`}>
                    <Field id={`pt_ratio_${row.term}_dev`} placeholder="-" readOnly={true} className="text-red-600 font-bold" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 border-t border-industrial-border text-[11px] font-semibold text-industrial-text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Allowable deviation is ±0.5% as per IS 2026 / IEC 60076</span>
            <span className="italic text-industrial-accent">Formula: % Deviation = ((Measured Ratio - Cal. Ratio) / Cal. Ratio) * 100</span>
          </div>
        </div>
      </section>

      {/* 3. VOLTAGE RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">VOLTAGE RATIO TEST</span>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              {/* Process / Voltage Ratio Test Row */}
              <tr className="bg-blue-100/85 text-industrial-text font-bold uppercase tracking-wider text-sm border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-left font-black w-2/5">PROCESS</th>
                <th className="p-3 text-center font-black" colSpan={2}>VOLTAGE RATIO TEST</th>
              </tr>
              {/* Applied Voltage / Measured Voltage Row */}
              <tr className="bg-slate-200 text-industrial-text font-bold uppercase tracking-wider text-xs border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-center">APPLIED VOLTAGE (V)</th>
                <th className="p-3 text-center" colSpan={2}>MEASURED VOLTAGE (V)</th>
              </tr>
            </thead>
            <tbody>
              {/* Scenario 1 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">1.1-2</td>
                <td className="p-2 border-r border-industrial-border">1.1-2.1</td>
                <td className="p-2">2-2.1</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_volt_ratio_sc1_applied" placeholder="" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_volt_ratio_sc1_m1" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pt_volt_ratio_sc1_m2" placeholder="" />
                </td>
              </tr>

              {/* Scenario 2 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">1.1-2.1</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2">2-2.1</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_volt_ratio_sc2_applied" placeholder="" />
                </td>
                <td className="p-1 border-r border-b border-industrial-border bg-white">
                  <Field id="pt_volt_ratio_sc2_m1" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pt_volt_ratio_sc2_m2" placeholder="" />
                </td>
              </tr>

              {/* Scenario 3 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">2.1-2</td>
                <td className="p-2 border-r border-[#cbd5e1] border-industrial-border">1.1-2</td>
                <td className="p-2">1.1-2.1</td>
              </tr>
              <tr className="border-b-0">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_volt_ratio_sc3_applied" placeholder="" />
                </td>
                <td className="p-1 border-r border-b border-industrial-border bg-white">
                  <Field id="pt_volt_ratio_sc3_m1" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pt_volt_ratio_sc3_m2" placeholder="" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. MAGNETIZING CURRENT TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MAGNETIZING CURRENT TEST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Instruments & Details</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="pt_mag_meter_make" placeholder="HTC" label="Meter Make" />
                <Field id="pt_mag_sr_no" placeholder="HTC2406CG0244" label="Sr. No." />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Parameters & Schedule</h6>
             <div className="grid grid-cols-3 gap-4">
                <Field id="pt_mag_volt" label="Applied Voltage" />
                <Field id="pt_mag_date" type="date" label="Date" />
                <Field id="pt_mag_time" type="time" label="Time" />
             </div>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Terminals</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">Applied Voltage (V)</th>
                <th className="p-4 border-b border-industrial-border text-center">MEASURED CURRENT <span className="normal-case">(mA)</span></th>
              </tr>
            </thead>
            <tbody>
              {TERMINALS.map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pt_mag_${term}_v`} />
                  </td>
                  <td className="p-1">
                    <Field id={`pt_mag_${term}_ma`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. SHORT CIRCUIT TEST */}
      <section className="space-y-6">
        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4">
          {/* Header 1: Process | Short Circuit Test */}
          <div className="border border-industrial-border grid grid-cols-5 text-center font-bold text-xs uppercase bg-[#dbeafe] rounded-t-lg overflow-hidden">
            <div className="p-3 border-r border-industrial-border bg-[#dbeafe] font-bold text-industrial-text col-span-1">
              PROCESS
            </div>
            <div className="p-3 bg-[#e0f2fe] text-blue-900 font-extrabold col-span-4 tracking-wider">
              SHORT CIRCUIT TEST
            </div>
          </div>

          {/* Header 2: Applied Voltage, Date, Time */}
          <div className="border-x border-b border-industrial-border grid grid-cols-6 items-center text-xs">
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              APPLIED VOLTAGE (V) :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1">
              <Field id="pt_sc_applied" placeholder="1Φ 20 VOLT APPLIED" />
            </div>
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              DATE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1">
              <Field id="pt_sc_date" type="date" placeholder="DD/MM/YYYY" />
            </div>
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              TIME :
            </div>
            <div className="p-1 col-span-1">
              <Field id="pt_sc_time" type="time" placeholder="HH:MM" />
            </div>
          </div>

          {/* Header 3: Meter Make, Sr.No */}
          <div className="border-x border-b border-industrial-border grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              METER MAKE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1">
              <Field id="pt_sc_meter_make" placeholder="HTC" />
            </div>
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              SR.NO.:
            </div>
            <div className="p-1 col-span-1">
              <Field id="pt_sc_sr_no" placeholder="HTC2406CG0246" />
            </div>
          </div>
        </div>

        {/* Short Circuit Measurements Grid (Matches excel columns exactly) */}
        <div className="border border-industrial-border rounded-xl overflow-hidden mb-6 shadow-sm">
          <table className="w-full text-xs font-mono text-center border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-industrial-border font-bold">
                <th className="p-3 border-r border-industrial-border w-[10%] bg-slate-50"></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[30%]">APPLIED VOLTAGE (V)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[30%]">MEASURED CURRENT (A)</th>
                <th className="p-3 text-center text-slate-700 uppercase tracking-wider w-[30%] border-b-none">MEASURED CURRENT (A)</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 static text */}
              <tr className="bg-slate-50 border-b border-industrial-border text-center font-bold">
                <td className="p-3 border-r border-industrial-border bg-slate-50/70" rowSpan={2}>-</td>
                <td className="p-3 border-r border-industrial-border">1.1-2</td>
                <td className="p-3 border-r border-industrial-border">1.1</td>
                <td className="p-3 bg-slate-50/20 font-bold text-center">2-2.1 (Short)</td>
              </tr>
              {/* Row 1 subheader / user inputs */}
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_sc_v1" placeholder="" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_sc_a1" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pt_sc_ref1" placeholder="" />
                </td>
              </tr>

              {/* Row 2 static text */}
              <tr className="bg-slate-50 border-b border-industrial-border text-center font-bold">
                <td className="p-3 border-r border-industrial-border bg-slate-50/70" rowSpan={2}>-</td>
                <td className="p-3 border-r border-industrial-border">1.1-2</td>
                <td className="p-3 border-r border-industrial-border">2</td>
                <td className="p-3 bg-slate-50/20 font-bold text-center">1.1-2.1 (Short)</td>
              </tr>
              {/* Row 2 subheader / user inputs */}
              <tr className="border-b-0">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_sc_v2" placeholder="" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="pt_sc_a2" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="pt_sc_ref2" placeholder="" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Impedance block exactly like Excel screenshot */}
        <div className="flex flex-col items-center mt-6">
          <div className="w-full md:w-1/2">
            <div className="bg-[#cbd5e1]/40 border border-industrial-border rounded-t-lg p-2 text-center text-xs font-black uppercase text-slate-800 tracking-wider">
              % IMPEDANCE
            </div>
            <div className="grid grid-cols-3 bg-[#94a3b8]/30 border-x border-b border-industrial-border rounded-b-lg text-center items-center font-bold text-sm">
              <div className="p-3 border-r border-b border-industrial-border font-extrabold text-slate-800">
                % Z =
              </div>
              <div className="p-1 border-r border-b border-industrial-border bg-white">
                <Field id="pt_sc_z" placeholder="" className="text-center font-black" readOnly={true} />
              </div>
              <div className="p-3 border-b border-industrial-border font-extrabold text-slate-800">
                %
              </div>
              <div className="p-3 border-r border-industrial-border font-extrabold text-slate-800">
                % Z =
              </div>
              <div className="p-1 border-r border-industrial-border bg-white">
                <Field id="pt_sc_z2" placeholder="" className="text-center font-black" readOnly={true} />
              </div>
              <div className="p-3 font-extrabold text-slate-800">
                %
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WINDING RESISTANCE TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">WINDING RESISTANCE TEST</span>
          </div>
        </div>

        <div className="bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm mb-4">
          <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1 mb-4">Test Instruments & Details</h6>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
             <Field id="pt_res_meter_make" placeholder="PRESTIGE ELECTRONICS" label="Meter Make" />
             <Field id="pt_res_meter_sr_no" placeholder="PE/12-JAN/09" label="Sr. No." />
             <Field id="pt_res_range" placeholder="1999.9 μΩ-19.999Ω" label="Measurement Range" />
             <Field id="pt_res_date" type="date" label="Date" />
             <Field id="pt_res_time" type="time" label="Time" />
          </div>
        </div>

        {/* Winding Resistance Test Conditions styled exactly like the screenshot */}
        <div className="bg-[#f8fafc] border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <Field 
              id="pt_wdg_temp_res" 
              placeholder="" 
              label="WDG TEMP (°C)" 
              className="[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>input]:bg-white [&>input]:border [&>input]:border-slate-200 [&>input]:rounded-lg [&>input]:p-3 [&>input]:shadow-sm"
            />
            <Field 
              id="pt_core_temp_res" 
              placeholder="" 
              label="CORE TEMP (°C)" 
              className="[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>input]:bg-white [&>input]:border [&>input]:border-slate-200 [&>input]:rounded-lg [&>input]:p-3 [&>input]:shadow-sm"
            />
            <Field 
              id="pt_amb_temp_res" 
              placeholder="" 
              label="AMBIENT TEMP (°C)" 
              className="[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>input]:bg-white [&>input]:border [&>input]:border-slate-200 [&>input]:rounded-lg [&>input]:p-3 [&>input]:shadow-sm"
            />
            <Field 
              id="pt_humidity_res" 
              placeholder="" 
              label="HUMIDITY (%)" 
              className="[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>input]:bg-white [&>input]:border [&>input]:border-slate-200 [&>input]:rounded-lg [&>input]:p-3 [&>input]:shadow-sm"
            />
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3 border-r border-b border-industrial-border text-left font-black">TEMINALS</th>
                <th className="p-3 border-r border-b border-industrial-border text-center font-black">
                  <div>RESISTANCE @ AMB.</div>
                  <div className="text-[10px] font-normal text-slate-400">Ω</div>
                </th>
                <th className="p-3 border-r border-b border-industrial-border text-center bg-orange-50/60 text-orange-800 font-black">
                  <div>RESISTANCE @75°C</div>
                  <div className="text-[10px] font-normal text-orange-500">Ω</div>
                </th>
                <th className="p-3 border-b border-industrial-border text-center font-black">
                  <div>MAX. GUARANTEED @75°C</div>
                  <div className="text-[10px] font-normal text-slate-400">Ω</div>
                </th>
              </tr>
            </thead>
             <tbody>
              {[
                { term: '1.1-2' },
                { term: '1.1-2.1' },
                { term: '2.1-2' }
              ].map(row => (
                <tr key={row.term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{row.term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`pt_res_${row.term}_amb`} placeholder="-" className="text-center font-bold" />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border bg-orange-50/30">
                    <Field id={`pt_res_${row.term}_75c`} placeholder="-" className="text-center text-orange-600 font-black" readOnly={true} />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field
                      id={`pt_res_${row.term}_max`}
                      placeholder="-"
                      pdfValue={getPostTankingWindingResMaxGuaranteed(row.term, job?.type, job?.capacity)}
                      className="text-center font-bold text-slate-700"
                      readOnly={true}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Turret CT IR & Continuity */}
      <section className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-industrial-text">Turret CT IR & Continuity</span>
        </div>
        <table className="w-full text-xs font-mono border-collapse">
          <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold">
            <tr>
              <th className="p-3 border-r border-b border-industrial-border text-center">Connection</th>
              <th className="p-3 border-r border-b border-industrial-border text-center normal-case">Applied Voltage</th>
              <th className="p-3 border-r border-b border-industrial-border text-center">Duration</th>
              <th className="p-3 border-r border-b border-industrial-border text-center bg-white">MΩ</th>
              <th className="p-3 border-b border-industrial-border text-center bg-white">Continuity</th>
            </tr>
          </thead>
          <tbody>
            {([
              { key: '1_1', label: '1.1' },
              { key: '2', label: '2' },
              { key: '2_1', label: '2.1' },
              { key: 'wti', label: 'WTI' },
            ] as const).map((row) => (
              <tr key={row.key} className="border-b border-industrial-border last:border-0">
                <td className="p-3 border-r border-industrial-border font-bold bg-industrial-bg/20 text-center">{row.label}</td>
                <td className="p-2 border-r border-industrial-border bg-industrial-bg/10 text-center">
                  <Field id={`pt_turret_${row.key}_voltage`} pdfValue="1kV" readOnly className="text-center" />
                </td>
                <td className="p-2 border-r border-industrial-border bg-industrial-bg/10 text-center">
                  <Field id={`pt_turret_${row.key}_duration`} pdfValue="60 sec" readOnly className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id={`pt_turret_${row.key}_mohm`} placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-white">
                  <Field id={`pt_turret_${row.key}_continuity`} placeholder="" className="text-center" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.pt_tested_by || ''}
              onChange={(e) => handleFieldChange('pt_tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="pt_tested_date" placeholder="Date" className="text-[10px] mt-1" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.pt_reviewed_by || ''}
              onChange={(e) => handleFieldChange('pt_reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="pt_reviewed_date" placeholder="Date" className="text-[10px] mt-1" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.pt_authorized_by || ''}
              onChange={(e) => handleFieldChange('pt_authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="pt_authorized_date" placeholder="Date" className="text-[10px] mt-1" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
        </div>
      </div>
    </div>
    </FormContext.Provider>
  );
}

function HVTestListForm({ test, job, onUpdate }: { test: TransformerTest, job?: Job, onUpdate: (data: Record<string, string>) => void }) {
  const rawData = seedHVTestListDefaults(test.observationData || {}, job?.type, job?.capacity);
  const data = rawData;
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';
  const hvLlConfig = getHVLLConfig(job?.type, job?.capacity);

  const HV_NLL_APPLIED_V_FACTOR = (33000 / 110) * 1.732;
  const HV_NLL_DERIVED_FIELDS = ['rms_m', 'rms_a', 'mean_m', 'mean_a', 'curr_m', 'curr_a', 'pow_m', 'pow_kw'] as const;
  const HV_LL_DERIVED_FIELDS = ['meter_v', 'measured_v', 'meter_i', 'applied_a', 'meter_w', 'loss_corrected', 'z_percent'] as const;
  const HV_LL_PT_FACTOR = hvLlConfig.ptFactor;

  const calculateHVLLReadings = (updated: Record<string, string>) => {
    applyHVLLCalculations(updated, job?.type, job?.capacity);
  };

  const calculateHVNLLMeterReadings = (updated: Record<string, string>) => {
    ['90', '100', '110'].forEach(rowKey => {
      const u1 = parseFloat(updated[`hv_nll_${rowKey}_u1`] || '');
      const u3 = parseFloat(updated[`hv_nll_${rowKey}_u3`] || '');
      const f1 = parseFloat(updated[`hv_nll_${rowKey}_f1`] || '');
      const f3 = parseFloat(updated[`hv_nll_${rowKey}_f3`] || '');
      const i1 = parseFloat(updated[`hv_nll_${rowKey}_i1`] || '');
      const i3 = parseFloat(updated[`hv_nll_${rowKey}_i3`] || '');
      const p = parseFloat(updated[`hv_nll_${rowKey}_p`] || '');

      // RMS VOLTAGE - Meter Reading Voltage = (U1 + U3) / 2
      if (!isNaN(u1) && !isNaN(u3)) {
        const rmsM = (u1 + u3) / 2;
        updated[`hv_nll_${rowKey}_rms_m`] = rmsM.toFixed(4);
        // Applied RMS Voltage = Meter Reading Voltage * (33000/110) * 1.732
        updated[`hv_nll_${rowKey}_rms_a`] = (rmsM * HV_NLL_APPLIED_V_FACTOR).toFixed(2);
      } else {
        updated[`hv_nll_${rowKey}_rms_m`] = '';
        updated[`hv_nll_${rowKey}_rms_a`] = '';
      }

      // MEAN VOLTAGE - Meter Reading Voltage = (F1 + F3) / 2
      if (!isNaN(f1) && !isNaN(f3)) {
        const meanM = (f1 + f3) / 2;
        updated[`hv_nll_${rowKey}_mean_m`] = meanM.toFixed(4);
        // Applied Mean Voltage = Meter Reading Voltage * (33000/110) * 1.732
        updated[`hv_nll_${rowKey}_mean_a`] = (meanM * HV_NLL_APPLIED_V_FACTOR).toFixed(2);
      } else {
        updated[`hv_nll_${rowKey}_mean_m`] = '';
        updated[`hv_nll_${rowKey}_mean_a`] = '';
      }

      // RMS CURRENT - Meter Reading Current = ((I1 + I3) / 1000) / 2
      if (!isNaN(i1) && !isNaN(i3)) {
        const currM = ((i1 + i3) / 1000) / 2;
        updated[`hv_nll_${rowKey}_curr_m`] = currM.toFixed(4);
        // Current Measured = Meter Reading Current * 10
        updated[`hv_nll_${rowKey}_curr_a`] = (currM * 10).toFixed(3);
      } else {
        updated[`hv_nll_${rowKey}_curr_m`] = '';
        updated[`hv_nll_${rowKey}_curr_a`] = '';
      }

      // RMS POWER - Meter Reading Power = P
      if (!isNaN(p)) {
        updated[`hv_nll_${rowKey}_pow_m`] = p.toFixed(4);
        // Measured Power in KW = Meter Reading Power * 3
        updated[`hv_nll_${rowKey}_pow_kw`] = (p * 3).toFixed(3);
      } else {
        updated[`hv_nll_${rowKey}_pow_m`] = '';
        updated[`hv_nll_${rowKey}_pow_kw`] = '';
      }
    });
  };

  const calcHVCorrectedPo = (updated: Record<string, string>) => {
    const vRms = parseFloat(updated['hv_nll_100_rms_a'] || '') || 0;
    const vMean = parseFloat(updated['hv_nll_100_mean_a'] || '') || 0;
    const pMeter = parseFloat(updated['hv_nll_100_pow_m'] || '') || 0;
    const mf = parseFloat(updated['hv_nll_mf'] || '3000') || 3000;
    const autoPm = pMeter > 0 ? (pMeter * mf) / 1000 : 0;
    const pVal = parseFloat(updated['hv_nll_100_pow_kw'] || '') || autoPm;

    if (vMean !== 0) {
      return (pVal * (1 + (vMean - vRms) / vMean)).toFixed(3);
    }
    return '';
  };

  const calculateHVSummary = (updated: Record<string, string>) => {
    const po = calcHVCorrectedPo(updated);
    updated['hv_sum_No_Load_loss_measurement_res'] = po ? `${po} KW` : '';

    const loadLoss = updated['hv_ll_loss_corrected'] || '';
    updated['hv_sum_Load_Loss_measurement_res'] = loadLoss ? `${loadLoss} kW` : '';

    if (!updated['hv_sum_Separate_source_voltage_withstand_test_res']) {
      updated['hv_sum_Separate_source_voltage_withstand_test_res'] = updated['hv_ss_remark'] || 'WITHSTAND';
    }
    if (!updated['hv_sum_Induced_over_voltage_test_res']) {
      updated['hv_sum_Induced_over_voltage_test_res'] = updated['hv_iv_remark'] || 'NOT WITHSTAND';
    }
  };

  const HV_MAJOR_TESTS = [
    { name: 'O.C TEST', type: 'done' as const },
    { name: 'No Load loss measurement', type: 'calc' as const },
    { name: 'Load Loss measurement', type: 'calc' as const },
    { name: 'Separate source voltage withstand test', type: 'withstand' as const },
    { name: 'Induced over voltage test', type: 'withstand' as const },
    { name: 'Heat Run Test only if Applicable', type: 'yes_no' as const },
  ];

  useEffect(() => {
    const updated = { ...data };
    calculateHVNLLMeterReadings(updated);
    calculateHVLLReadings(updated);
    calculateHVSummary(updated);
    const nllChanged = ['90', '100', '110'].some(rowKey =>
      HV_NLL_DERIVED_FIELDS.some(field =>
        updated[`hv_nll_${rowKey}_${field}`] !== data[`hv_nll_${rowKey}_${field}`]
      )
    );
    const llChanged = HV_LL_DERIVED_FIELDS.some(field =>
      updated[`hv_ll_${field}`] !== data[`hv_ll_${field}`]
    );
    const summaryChanged =
      updated['hv_sum_No_Load_loss_measurement_res'] !== data['hv_sum_No_Load_loss_measurement_res'] ||
      updated['hv_sum_Load_Loss_measurement_res'] !== data['hv_sum_Load_Loss_measurement_res'];
    if (nllChanged || llChanged || summaryChanged) {
      onUpdate(updated);
    } else if (JSON.stringify(rawData) !== JSON.stringify(test.observationData || {})) {
      onUpdate(rawData);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };
    if (
      key.startsWith('hv_nll_') &&
      (key.endsWith('_u1') || key.endsWith('_u3') || key.endsWith('_f1') || key.endsWith('_f3') || key.endsWith('_i1') || key.endsWith('_i3') || key.endsWith('_p') || key === 'hv_nll_mf')
    ) {
      calculateHVNLLMeterReadings(updated);
    }
    if (
      key === 'hv_ll_u1' || key === 'hv_ll_u3' || key === 'hv_ll_i1' || key === 'hv_ll_i3' ||
      key === 'hv_ll_p' || key === 'hv_ll_rated_v' || key === 'hv_ll_rated_a'
    ) {
      calculateHVLLReadings(updated);
    }
    if (key === 'hv_ss_remark') {
      updated['hv_sum_Separate_source_voltage_withstand_test_res'] = value;
    }
    if (key === 'hv_iv_remark') {
      updated['hv_sum_Induced_over_voltage_test_res'] = value;
    }
    calculateHVSummary(updated);
    onUpdate(updated);
  };

  const renderMajorTestRes = (test: typeof HV_MAJOR_TESTS[number]) => {
    const fieldKey = `hv_sum_${test.name.replace(/ /g, '_')}_res`;
    const selectClass = "w-full text-center bg-transparent font-bold uppercase outline-none text-xs p-2";

    if (test.type === 'calc') {
      return (
        <div className="p-2 text-center font-bold text-industrial-accent bg-slate-50">
          {data[fieldKey] || '-'}
        </div>
      );
    }

    if (test.type === 'done') {
      return (
        <select
          className={selectClass}
          value={data[fieldKey] || ''}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
        >
          <option value="">Select</option>
          <option value="DONE">DONE</option>
          <option value="NOT DONE">NOT DONE</option>
        </select>
      );
    }

    if (test.type === 'withstand') {
      return (
        <select
          className={selectClass}
          value={data[fieldKey] || ''}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
        >
          <option value="">Select</option>
          <option value="WITHSTAND">WITHSTAND</option>
          <option value="NOT WITHSTAND">NOT WITHSTAND</option>
        </select>
      );
    }

    return (
      <select
        className={selectClass}
        value={data[fieldKey] || ''}
        onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
      >
        <option value="">Select</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
    );
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: ctx?.styleMode }}>
    <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
      <CompanyHeader />
      {/* 1. NO LOAD LOSSES & NO LOAD CURRENT */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">NO LOAD LOSSES & NO LOAD CURRENT</span>
          </div>
        </div>
        
        <div className="space-y-4 bg-white p-4 rounded-xl border border-industrial-border shadow-sm text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-industrial-border border-collapse font-mono min-w-[800px]">
              <tbody>
                <tr>
                  <td className="p-3 border-r border-b border-industrial-border font-bold bg-industrial-bg/10 uppercase text-center w-1/3" colSpan={2}>
                    TEST EQUIPMENT DETAILS
                  </td>
                  <td className="p-3 border-b border-industrial-border font-bold bg-industrial-bg/10 uppercase text-center w-2/3" colSpan={4}>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] text-industrial-text-muted">POWER ANALYZER:</span>
                      <Field id="hv_nll_meter" placeholder="YOKOGAWA MAKE WT3000, SR NO: 91KA21004" className="text-center font-bold bg-transparent border-b border-dashed border-industrial-border focus:border-industrial-accent" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border-r border-b border-industrial-border font-bold bg-industrial-bg/5 text-center w-[15%]">CT RATIO</td>
                  <td className="p-1 border-r border-b border-industrial-border text-center w-[18%]">
                    <Field id="hv_nll_ct_ratio" placeholder="10/1 A" className="text-center font-bold" />
                  </td>
                  <td className="p-2.5 border-r border-b border-industrial-border font-bold bg-industrial-bg/5 text-center w-[15%]">PT RATIO</td>
                  <td className="p-1 border-r border-b border-industrial-border text-center w-[22%]">
                    <Field id="hv_nll_pt_ratio" placeholder="33000/√3/110/√3 V" className="text-center font-bold" />
                  </td>
                  <td className="p-2.5 border-r border-b border-industrial-border font-bold bg-industrial-bg/5 text-center w-[10%]">MF</td>
                  <td className="p-1 border-b border-industrial-border text-center w-[20%]">
                    <Field id="hv_nll_mf" placeholder="3000" className="text-center font-bold" />
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border-r border-b border-industrial-border text-center align-middle bg-industrial-bg/5" rowSpan={3}>
                    <div className="font-bold text-xs uppercase">CT SR. NOS</div>
                    <div className="text-[9px] text-industrial-text-muted mt-1 font-sans leading-tight">MAKE-MOON LIGHT<br/>ELECTICAL</div>
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border text-center">
                    <Field id="hv_nll_ct_sr_1" placeholder="06/12/413" className="text-center" />
                  </td>
                  <td className="p-2.5 border-r border-b border-industrial-border text-center align-middle bg-industrial-bg/5" rowSpan={3} colSpan={2}>
                    <div className="font-bold text-xs uppercase">PT SR. NOS</div>
                    <div className="text-[9px] text-industrial-text-muted mt-1 font-sans leading-tight">MAKE-MOON LIGHT ELECTICAL</div>
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border text-center" colSpan={2}>
                    <Field id="hv_nll_pt_sr_1" placeholder="06/12/417" className="text-center" />
                  </td>
                </tr>
                <tr>
                  <td className="p-1 border-r border-b border-industrial-border text-center">
                    <Field id="hv_nll_ct_sr_2" placeholder="06/12/414" className="text-center" />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border text-center" colSpan={2}>
                    <Field id="hv_nll_pt_sr_2" placeholder="06/12/418" className="text-center" />
                  </td>
                </tr>
                <tr>
                  <td className="p-1 border-r border-industrial-border text-center">
                    <Field id="hv_nll_ct_sr_3" placeholder="06/12/416" className="text-center" />
                  </td>
                  <td className="p-1 border-industrial-border text-center" colSpan={2}>
                    <Field id="hv_nll_pt_sr_3" placeholder="06/12/420" className="text-center" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-xs border border-industrial-border border-collapse font-mono min-w-[800px]">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold border-b border-industrial-border text-center">
              <tr>
                <th className="p-2 border-r border-b border-industrial-border" style={{ width: '10%' }}></th>
                <th className="p-2 border-r border-b border-industrial-border">U1</th>
                <th className="p-2 border-r border-b border-industrial-border">U3</th>
                <th className="p-2 border-r border-b border-industrial-border">F1</th>
                <th className="p-2 border-r border-b border-industrial-border">F3</th>
                <th className="p-2 border-r border-b border-industrial-border">I1</th>
                <th className="p-2 border-r border-b border-industrial-border">I3</th>
                <th className="p-2 border-b border-industrial-border">P</th>
              </tr>
            </thead>
            <tbody>
              {['90%', '100%', '110%'].map((v) => {
                const rowKey = v.replace('%', '');
                const columns = ['u1', 'u3', 'f1', 'f3', 'i1', 'i3', 'p'] as const;
                return (
                  <tr key={`nll-raw-${v}`} className="border-b border-industrial-border last:border-0 hover:bg-industrial-bg/5 transition-colors">
                    <td className="p-3 border-r border-industrial-border font-bold bg-industrial-bg/10 text-center">{v}</td>
                    {columns.map((col) => (
                      <td key={col} className={`p-1 ${col !== 'p' ? 'border-r border-industrial-border' : ''}`}>
                        <Field id={`hv_nll_${rowKey}_${col}`} placeholder="" className="text-center font-mono" />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-xs border border-industrial-border border-collapse font-mono min-w-[1000px]">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold border-b border-industrial-border text-center">
              <tr>
                <th className="p-2 border-r border-b border-industrial-border" rowSpan={2} style={{ width: '8%' }}>VOLTAGE IN %</th>
                <th className="p-2 border-r border-b border-industrial-border" colSpan={2} style={{ width: '18%' }}>RMS VOLTAGE</th>
                <th className="p-2 border-r border-b border-industrial-border" colSpan={2} style={{ width: '18%' }}>MEAN VOLTAGE</th>
                <th className="p-2 border-r border-b border-industrial-border" colSpan={2} style={{ width: '18%' }}>RMS CURRENT</th>
                <th className="p-2 border-r border-b border-industrial-border font-sans normal-case text-[10px] leading-tight" rowSpan={2} style={{ width: '10%' }}>
                  <div className="font-bold uppercase text-xs">GUARANTEED</div>
                  MAXIMUM GUARANTEED VALUE OF NO LOAD CURRENT IN A
                </th>
                <th className="p-2 border-r border-b border-industrial-border" colSpan={2} style={{ width: '18%' }}>RMS POWER</th>
                <th className="p-2 border-b border-industrial-border font-sans normal-case text-[10px] leading-tight" rowSpan={2} style={{ width: '10%' }}>
                  <div className="font-bold uppercase text-xs">GUARANTEED</div>
                  MAXIMUM GUARANTEED VALUE OF NO LOAD LOSS IN KW
                </th>
              </tr>
              <tr className="bg-industrial-bg/5 text-[9px] leading-tight">
                <th className="p-2 border-r border-b border-industrial-border">METER READING VOLTAGE V</th>
                <th className="p-2 border-r border-b border-industrial-border">APPLIED RMS VOLTAGE V</th>
                <th className="p-2 border-r border-b border-industrial-border">METER READING VOLTAGE V</th>
                <th className="p-2 border-r border-b border-industrial-border">APPLIED MEAN VOLTAGE V</th>
                <th className="p-2 border-r border-b border-industrial-border">METER READING CURRENT A</th>
                <th className="p-2 border-r border-b border-industrial-border">CURRENT MEASURED A</th>
                <th className="p-2 border-r border-b border-industrial-border">METER READING POWER W</th>
                <th className="p-2 border-b border-industrial-border">MEASURED POWER IN KW</th>
              </tr>
            </thead>
            <tbody>
              {['90%', '100%', '110%'].map((v) => {
                const rowKey = v.replace('%', '');
                const defaultCurrG = getHVNllGuaranteedCurrent(rowKey, job?.type, job?.capacity);
                const defaultPowG = getHVNllGuaranteedPower(rowKey, job?.type, job?.capacity);
                return (
                  <tr key={v} className="border-b border-industrial-border last:border-0 hover:bg-industrial-bg/5 transition-colors">
                    <td className="p-3 border-r border-industrial-border font-bold bg-industrial-bg/10 text-center">{v}</td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_rms_m`} placeholder="0.0000" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_rms_a`} placeholder="0.00" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_mean_m`} placeholder="0.0000" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_mean_a`} placeholder="0.00" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_curr_m`} placeholder="0.0000" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_curr_a`} placeholder="0.000" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_curr_g`} pdfValue={defaultCurrG} placeholder={defaultCurrG} className="text-center font-mono font-medium" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_pow_m`} placeholder="0.0000" readOnly={true} className="text-center font-mono bg-slate-50 font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border">
                      <Field id={`hv_nll_${rowKey}_pow_kw`} placeholder="0.000" readOnly={true} className="text-center font-mono font-semibold bg-slate-50" />
                    </td>
                    <td className="p-1">
                      <Field id={`hv_nll_${rowKey}_pow_g`} pdfValue={defaultPowG} placeholder={defaultPowG} className="text-center font-mono font-medium" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic calculation display */}
        {(() => {
          const poStr = calcHVCorrectedPo(data) || '0.000';
          const vRms = parseFloat(data['hv_nll_100_rms_a']) || 0;
          const vMean = parseFloat(data['hv_nll_100_mean_a']) || 0;
          const pMeter = parseFloat(data['hv_nll_100_pow_m']) || 0;
          const mf = parseFloat(data['hv_nll_mf']) || 3000;
          const autoPm = pMeter > 0 ? (pMeter * mf) / 1000 : 0;
          const pVal = parseFloat(data['hv_nll_100_pow_kw']) || autoPm;

          return (
            <div className="bg-industrial-bg/5 p-4 rounded-xl border border-industrial-border space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-industrial-border pb-2">
                <span className="font-bold uppercase text-industrial-text-muted">Formula details</span>
                <span className="text-industrial-accent font-bold">Po = Pm * (1 + d) &nbsp;|&nbsp; d = (Vmean - Vrms) / Vmean</span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-white rounded border border-industrial-border">
                <span className="text-industrial-text-muted">Corrected No Load Loss (Po):</span>
                <span className="font-bold text-industrial-accent">{poStr} KW</span>
              </div>

              <div className="border border-dashed border-industrial-border p-3 rounded bg-white text-center flex flex-col md:flex-row items-center justify-center gap-2 text-xs">
                <span className="font-bold text-industrial-text">For 100% Rated Voltage:</span>
                <span className="font-bold text-industrial-accent">Po</span>
                <span>=</span>
                <span className="px-2 py-1 bg-industrial-bg/5 rounded font-bold">{pVal.toFixed(3)}</span>
                <span>* ( 1 + (</span>
                <span className="px-2 py-1 bg-industrial-bg/5 rounded font-bold">{vMean.toFixed(2)}</span>
                <span>-</span>
                <span className="px-2 py-1 bg-industrial-bg/5 rounded font-bold">{vRms.toFixed(2)}</span>
                <span>) /</span>
                <span className="px-2 py-1 bg-industrial-bg/5 rounded font-bold">{vMean !== 0 ? vMean.toFixed(2) : '0.00'}</span>
                <span>)</span>
                <span>=</span>
                <span className="px-3 py-1 bg-industrial-accent/10 text-industrial-accent rounded font-extrabold text-sm">{poStr} KW</span>
              </div>
            </div>
          );
        })()}
      </section>

      {/* 2. MEASUREMENT OF % IMPEDANCE AND LOAD LOSS */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MEASUREMENT OF % IMPEDANCE AND LOAD LOSS</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-industrial-border border-collapse font-mono" style={{ tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td className="p-3 border-r border-b border-industrial-border font-bold bg-[#f8fafc] uppercase text-center" style={{ width: '35%' }} colSpan={2}>
                    TEST EQUIPMENT DETAILS
                  </td>
                  <td className="p-3 border-b border-industrial-border font-bold bg-[#f8fafc] uppercase text-center" style={{ width: '65%' }} colSpan={4}>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] text-slate-500">POWER ANALYZER:</span>
                      <Field id="hv_ll_meter" pdfValue="POWER ANALYZER YOKOGAWA MAKE WT3000, SR NO: 91KA21004" className="inline-block max-w-sm text-center" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-b border-industrial-border font-bold bg-slate-50 text-center" style={{ width: '15%' }}>CT RATIO</td>
                  <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800" style={{ width: '18%' }}>
                    <Field id="hv_ll_ct" pdfValue={hvLlConfig.ctRatio} className="text-center font-bold" />
                  </td>
                  <td className="p-2 border-r border-b border-industrial-border font-bold bg-slate-50 text-center" style={{ width: '15%' }}>PT RATIO</td>
                  <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800" style={{ width: '22%' }}>
                    <Field id="hv_ll_pt" pdfValue="1100/√3/110/V3" className="text-center font-bold" />
                  </td>
                  <td className="p-2 border-r border-b border-industrial-border font-bold bg-slate-50 text-center" style={{ width: '10%' }}>MF</td>
                  <td className="p-2 border-b border-industrial-border text-center font-bold text-slate-800" style={{ width: '20%' }}>
                    <Field id="hv_ll_mf" pdfValue={String(hvLlConfig.mf)} className="text-center font-bold" />
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-b border-industrial-border text-center align-middle bg-slate-50" rowSpan={3}>
                    <div className="font-bold text-xs uppercase text-slate-700">CT SR. NOS</div>
                    <div className="text-[9px] text-slate-500 mt-1 leading-tight font-sans">MAKE-MOON LIGHT<br/>ELECTICAL</div>
                  </td>
                  <td className="p-2 border-r border-b border-industrial-border text-center text-slate-800">
                    <Field id="hv_ll_ct_sr_1" pdfValue="06/12/413" className="text-center font-mono" />
                  </td>
                  <td className="p-2 border-r border-b border-industrial-border text-center align-middle bg-slate-50" rowSpan={3} colSpan={2}>
                    <div className="font-bold text-xs uppercase text-slate-700">PT SR. NOS</div>
                    <div className="text-[9px] text-slate-500 mt-1 leading-tight font-sans">MAKE-MOON LIGHT ELECTICAL</div>
                  </td>
                  <td className="p-2 border-r border-b border-industrial-border text-center text-slate-800" colSpan={2}>
                    <Field id="hv_ll_pt_sr_1" pdfValue="06/12/424" className="text-center font-mono" />
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-b border-industrial-border text-center text-slate-800">
                    <Field id="hv_ll_ct_sr_2" pdfValue="06/12/414" className="text-center font-mono" />
                  </td>
                  <td className="p-2 border-r border-b border-industrial-border text-center text-slate-800" colSpan={2}>
                    <Field id="hv_ll_pt_sr_2" pdfValue="06/12/425" className="text-center font-mono" />
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-industrial-border text-center text-slate-800">
                    <Field id="hv_ll_ct_sr_3" pdfValue="06/12/416" className="text-center font-mono" />
                  </td>
                  <td className="p-2 border-industrial-border text-center text-slate-800" colSpan={2}>
                    <Field id="hv_ll_pt_sr_3" pdfValue="06/12/426" className="text-center font-mono" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs border border-industrial-border border-collapse font-mono" style={{ tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td className="p-2 border-r border-industrial-border font-bold bg-slate-50 text-left whitespace-nowrap">OTI (°C) :</td>
                  <td className="p-1 border-r border-industrial-border text-center font-medium text-slate-800">
                    <Field id="hv_ll_oti" pdfValue="0" className="text-center font-mono font-bold" />
                  </td>
                  <td className="p-2 border-r border-industrial-border font-bold bg-slate-50 text-left whitespace-nowrap">WTI (°C):</td>
                  <td className="p-1 border-r border-industrial-border text-center font-medium text-slate-800">
                    <Field id="hv_ll_wti" pdfValue="0" className="text-center font-mono font-bold" />
                  </td>
                  <td className="p-2 border-r border-industrial-border font-bold bg-slate-50 text-left whitespace-nowrap">TOP OIL (°C) :</td>
                  <td className="p-1 border-r border-industrial-border text-center font-medium text-slate-800">
                    <Field id="hv_ll_top_oil" pdfValue="25" className="text-center font-mono font-bold" />
                  </td>
                  <td className="p-2 border-r border-industrial-border font-bold bg-slate-50 text-left whitespace-nowrap">BOTTOM OIL (°C) :</td>
                  <td className="p-1 border-r border-industrial-border text-center font-medium text-slate-800">
                    <Field id="hv_ll_bottom_oil" pdfValue="25" className="text-center font-mono font-bold" />
                  </td>
                  <td className="p-2 border-r border-industrial-border font-bold bg-slate-50 text-left whitespace-nowrap">AVG OIL (°C) :</td>
                  <td className="p-1 text-center font-medium text-slate-800">
                    <Field id="hv_ll_avg_oil" pdfValue="25" className="text-center font-mono font-bold text-industrial-accent" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden mt-4 overflow-x-auto shadow-sm">
          <table className="w-full text-xs border border-industrial-border border-collapse font-mono min-w-[800px]">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold text-center border-b border-industrial-border">
              <tr>
                <th className="p-2 border-r border-industrial-border bg-yellow-100/50" style={{ width: '18%' }}></th>
                <th className="p-2 border-r border-industrial-border" style={{ width: '16%' }}>U1</th>
                <th className="p-2 border-r border-industrial-border" style={{ width: '16%' }}>U3</th>
                <th className="p-2 border-r border-industrial-border" style={{ width: '16%' }}>I1</th>
                <th className="p-2 border-r border-industrial-border" style={{ width: '16%' }}>I3</th>
                <th className="p-2" style={{ width: '18%' }}>P</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-100 hover:bg-yellow-100/95 transition-colors">
                <td className="p-3 border-r border-industrial-border font-black text-center text-slate-800 uppercase">LOAD LOSS:</td>
                <td className="p-1 border-r border-industrial-border">
                  <Field id="hv_ll_u1" placeholder="0.0000" className="text-center font-mono font-bold bg-transparent" />
                </td>
                <td className="p-1 border-r border-industrial-border">
                  <Field id="hv_ll_u3" placeholder="0.0000" className="text-center font-mono font-bold bg-transparent" />
                </td>
                <td className="p-1 border-r border-industrial-border">
                  <Field id="hv_ll_i1" placeholder="0.0000" className="text-center font-mono font-bold bg-transparent" />
                </td>
                <td className="p-1 border-r border-industrial-border">
                  <Field id="hv_ll_i3" placeholder="0.0000" className="text-center font-mono font-bold bg-transparent" />
                </td>
                <td className="p-1">
                  <Field id="hv_ll_p" placeholder="0.0000" className="text-center font-mono font-black text-industrial-accent bg-transparent" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {(() => {
          const lossCorrectedStr = data['hv_ll_loss_corrected'] || '';
          const zPercentStr = data['hv_ll_z_percent'] || '';

          return (
            <div className="space-y-6">
              <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-[10px] border border-industrial-border border-collapse font-mono min-w-[1200px]">
                  <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold text-center border-b border-industrial-border leading-tight">
                    <tr>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '7%' }}>RATED VOLTAGE V</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '7%' }}>RATED CURRENT A</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '8%' }}>METER READING VOLTAGE V</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '8%' }}>MEASURED VOLTAGE V</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '8%' }}>METER READING APPLIED CURRENT A</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '8%' }}>APPLIED CURRENT A</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '8%' }}>METER READING LOSSES W</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '9%' }}>LOAD LOSSES CORRECTED TO RATED CURRENT kW</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '6%' }}>% Z</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '9%' }}>MAX. GUARANTEED LOSSES ACCORDING TO RDSO SOGP AT 75°C</th>
                      <th className="p-2 border-r border-industrial-border" style={{ width: '9%' }}>MAX. GUARANTEED IMPEDANCE IN % ACCORDING TO RDSO SOGP AT 75°C</th>
                      <th className="p-2 border-industrial-border" style={{ width: '9%' }}>MAX. GUARANTEED LEAKAGE IMPEDANCE IN OHMS ACCORDING TO RDSO SOGP AT 75°C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_rated_v" pdfValue="55000" placeholder="55000" readOnly={true} className="text-center font-bold bg-slate-50" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_rated_a" pdfValue={hvLlConfig.ratedA} placeholder={hvLlConfig.ratedA} readOnly={true} className="text-center font-bold bg-slate-50" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_meter_v" placeholder="" readOnly={true} className="text-center bg-slate-50 font-bold" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_measured_v" placeholder="" readOnly={true} className="text-center bg-slate-50 font-bold" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_meter_i" placeholder="" readOnly={true} className="text-center bg-slate-50 font-bold" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_applied_a" placeholder="" readOnly={true} className="text-center bg-slate-50 font-bold" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_meter_w" placeholder="" readOnly={true} className="text-center bg-slate-50 font-bold" />
                      </td>
                      <td className="p-1 border-r border-industrial-border bg-slate-50/50">
                        <Field id="hv_ll_loss_corrected" placeholder="" readOnly={true} className="text-center font-semibold text-slate-800 bg-slate-50" />
                      </td>
                      <td className="p-1 border-r border-industrial-border bg-slate-50/50">
                        <Field id="hv_ll_z_percent" placeholder="" readOnly={true} className="text-center font-bold text-industrial-accent bg-slate-50" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_guar_loss" pdfValue={hvLlConfig.guarLoss} readOnly={true} className="text-center font-medium bg-slate-50" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                        <Field id="hv_ll_guar_z_percent" pdfValue={hvLlConfig.guarZPercent} readOnly={true} className="text-center font-medium bg-slate-50" />
                      </td>
                      <td className="p-1">
                        <Field id="hv_ll_guar_z_ohms" pdfValue="0.45" readOnly={true} className="text-center font-medium bg-slate-50" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-industrial-bg/5 p-4 rounded-xl border border-industrial-border space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-industrial-border pb-2">
                  <span className="font-bold uppercase text-industrial-text-muted">Calculations Summary & Formulas</span>
                  <span className="text-industrial-accent font-bold">Impedance & Load Loss formulas</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-2 bg-white rounded border border-industrial-border flex flex-col justify-between">
                    <span className="text-industrial-text-muted">Load Loss Corrected:</span>
                    <span className="font-bold text-industrial-text mt-1">{lossCorrectedStr || '-'} kW</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-industrial-border flex flex-col justify-between">
                    <span className="text-industrial-text-muted">% Impedance (%Z):</span>
                    <span className="font-bold text-industrial-accent mt-1">{zPercentStr || '-'}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 space-y-1 bg-white p-3 rounded border border-industrial-border leading-relaxed">
                  <div><span className="font-bold">Meter Reading Voltage:</span> U1 + U3</div>
                  <div><span className="font-bold">Measured Voltage:</span> Meter Reading Voltage × 10</div>
                  <div><span className="font-bold">Meter Reading Current:</span> (I1 + I3) / 2</div>
                  <div><span className="font-bold">Applied Current:</span> Meter Reading Current × {hvLlConfig.ctFactor}</div>
                  <div><span className="font-bold">Loss Corrected Formula:</span> Pc = (Meter_W × {hvLlConfig.mf} / 1000) × ({hvLlConfig.ratedA} / Applied_I)²</div>
                  <div><span className="font-bold">Percentage Impedance Formula:</span> %Z = (Measured_V / 55000) × ({hvLlConfig.ratedA} / Applied_I) × 100</div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* 3. WITHSTAND TESTS */}
      <section className="space-y-8">
        <div className="space-y-6">
           <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center gap-3">
             <ShieldCheck size={16} className="text-industrial-accent" />
             <span className="text-sm font-bold uppercase tracking-widest">SEPARATE-SOURCE VOLTAGE TEST</span>
           </div>
           <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
             <table className="w-full text-xs border border-industrial-border border-collapse font-mono" style={{ tableLayout: 'fixed' }}>
               <tbody>
                 <tr>
                   <td className="p-2 border-r border-b border-industrial-border font-bold bg-[#f8fafc] uppercase text-center" style={{ width: '35%' }}>
                     TEST EQUIPMENT DETAILS
                   </td>
                   <td className="p-2 border-b border-industrial-border text-center font-bold text-slate-800 bg-slate-50" colSpan={3}>
                     RECTIFIERS &amp; ELECTRONICS PVT. LTD. MAKE DIVIDER &amp; kV METER BEARING SR. NO (7749/110(P)/07-08)
                   </td>
                 </tr>
                 <tr className="bg-[#f8fafc] uppercase font-bold text-center border-b border-industrial-border">
                   <th className="p-2 border-r border-industrial-border">APPLIED TERMINAL</th>
                   <th className="p-2 border-r border-industrial-border">APPLIED VOLTAGE kV</th>
                   <th className="p-2 border-r border-industrial-border">TIME IN SECOND</th>
                   <th className="p-2">REMARKS</th>
                 </tr>
                 <tr>
                   <td className="p-2 border-r border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_ss_term" pdfValue="( 1.1 - 2 - 2.1 ) ALL TERMINAL SHORTED" className="text-center" />
                   </td>
                   <td className="p-2 border-r border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_ss_kv" pdfValue="70" className="text-center" />
                   </td>
                   <td className="p-2 border-r border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_ss_sec" pdfValue="60" className="text-center" />
                   </td>
                   <td className="p-1 text-center bg-yellow-100">
                     <select
                       className="w-full text-center bg-yellow-100 font-bold uppercase outline-none text-xs p-2"
                       value={data['hv_ss_remark'] || 'WITHSTAND'}
                       onChange={(e) => handleFieldChange('hv_ss_remark', e.target.value)}
                     >
                       <option value="WITHSTAND">WITHSTAND</option>
                       <option value="NOT WITHSTAND">NOT WITHSTAND</option>
                     </select>
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center gap-3">
             <Shield size={16} className="text-industrial-accent" />
             <span className="text-sm font-bold uppercase tracking-widest">INDUCED VOLTAGE TEST</span>
           </div>
           <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
             <table className="w-full text-[10px] border border-industrial-border border-collapse font-mono min-w-[900px]" style={{ tableLayout: 'fixed' }}>
               <tbody>
                 <tr>
                   <td className="p-2 border-r border-b border-industrial-border font-bold bg-[#f8fafc] uppercase text-center align-middle" style={{ width: '18%' }} rowSpan={2}>
                     TEST EQUIPMENT DETAILS
                   </td>
                   <td className="p-2 border-b border-industrial-border text-center font-bold text-slate-800 bg-slate-50" colSpan={5}>
                     DIGITAL FREQUENCY METER OF MAKE MECO BEARING SERIAL NO 2303075
                   </td>
                 </tr>
                 <tr>
                   <td className="p-2 border-b border-industrial-border text-center font-bold text-slate-800 bg-slate-50" colSpan={5}>
                     DIGITAL VOLT METER OF DELTRONICS MAKE BEARING SERIAL NO 24125128
                   </td>
                 </tr>
                 <tr className="bg-[#f8fafc] uppercase font-bold text-center border-b border-industrial-border leading-tight">
                   <th className="p-2 border-r border-industrial-border">VOLTAGE APPLIED TERMINAL</th>
                   <th className="p-2 border-r border-industrial-border">OPEN WINDING IN WHICH VOLTAGE</th>
                   <th className="p-2 border-r border-industrial-border">SUPPLIED VOLTAGE ON LV 1.1-2.1</th>
                   <th className="p-2 border-r border-industrial-border">INDUCED VOLTAGE IN HV 1.1-2</th>
                   <th className="p-2 border-r border-industrial-border">TEST FREQUENCY (Hz)</th>
                   <th className="p-2">TEST DURATION (Sec)</th>
                 </tr>
                 <tr className="bg-[#f8fafc] uppercase font-bold text-center border-b border-industrial-border">
                   <th className="p-1 border-r border-industrial-border"></th>
                   <th className="p-1 border-r border-industrial-border"></th>
                   <th className="p-1 border-r border-industrial-border">kVrms</th>
                   <th className="p-1 border-r border-industrial-border">kVrms</th>
                   <th className="p-1 border-r border-industrial-border"></th>
                   <th className="p-1"></th>
                 </tr>
                 <tr>
                   <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_iv_applied_term" pdfValue="1.1-2.1" className="text-center" />
                   </td>
                   <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_iv_open_winding" pdfValue="2" className="text-center" />
                   </td>
                   <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_iv_lv_kv" pdfValue="55" className="text-center" />
                   </td>
                   <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_iv_hv_kv" pdfValue="110" className="text-center" />
                   </td>
                   <td className="p-2 border-r border-b border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_iv_hz" pdfValue="200" className="text-center" />
                   </td>
                   <td className="p-2 border-b border-industrial-border text-center font-bold text-slate-800">
                     <Field id="hv_iv_sec" pdfValue="30" className="text-center" />
                   </td>
                 </tr>
                 <tr>
                   <td className="p-2 border-r border-industrial-border font-bold text-center bg-[#f8fafc]" colSpan={3}>
                     Remark
                   </td>
                   <td className="p-1 text-center bg-yellow-100" colSpan={3}>
                     <select
                       className="w-full text-center bg-yellow-100 font-bold uppercase outline-none text-xs p-2"
                       value={data['hv_iv_remark'] || 'NOT WITHSTAND'}
                       onChange={(e) => handleFieldChange('hv_iv_remark', e.target.value)}
                     >
                       <option value="WITHSTAND">WITHSTAND</option>
                       <option value="NOT WITHSTAND">NOT WITHSTAND</option>
                     </select>
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>
      </section>

      {/* 4. MAJOR TEST SUMMARY */}
      <section className="space-y-6">
        <div className="bg-industrial-accent/5 px-6 py-3 border-b border-industrial-accent/20 flex items-center gap-3">
          <LayoutList size={16} className="text-industrial-accent" />
          <span className="text-sm font-bold uppercase tracking-widest text-industrial-accent">Major Test Summary</span>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Major Test</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">Measured Losses / Withstand</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">Date</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">Time</th>
                <th className="p-4 border-b border-industrial-border text-center">Duration (min)</th>
              </tr>
            </thead>
            <tbody>
              {HV_MAJOR_TESTS.map(test => (
                <tr key={test.name} className="hover:bg-industrial-bg/5 transition-colors">
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{test.name}</td>
                  <td className="p-1 border-r border-b border-industrial-border">{renderMajorTestRes(test)}</td>
                  <td className="p-1 border-r border-b border-industrial-border"><Field id={`hv_sum_${test.name.replace(/ /g, '_')}_date`} type="date" className="text-center" /></td>
                  <td className="p-1 border-r border-b border-industrial-border"><Field id={`hv_sum_${test.name.replace(/ /g, '_')}_time`} type="time" className="text-center" /></td>
                  <td className="p-1 border-b border-industrial-border"><Field id={`hv_sum_${test.name.replace(/ /g, '_')}_dur`} className="text-center" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
        </div>
      </div>
    </div>
    </FormContext.Provider>
  );
}

function ChecklistForTFRBeforeHV({ test, onUpdate }: { test: TransformerTest, onUpdate: (data: Record<string, string>) => void }) {
  const data = test.observationData || {};
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };
    if (key === 'tested_by') {
      updated['tested_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'reviewed_by') {
      updated['reviewed_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'authorized_by') {
      updated['authorized_date'] = value ? new Date().toLocaleString() : '';
    }
    onUpdate(updated);
  };

  const getStatusValue = (idx: number) => {
    const key = `chk_status_${idx + 1}`;
    if (data[key] !== undefined) {
      return data[key];
    }
    // Default values matching the image: Row 5 and Row 20 are pending/unchecked initially, others checked
    if (idx === 4 || idx === 19) return 'PENDING';
    return 'DONE';
  };

  const getConfValue = (idx: number) => {
    const key = `chk_conf_${idx + 1}`;
    if (data[key] !== undefined) {
      return data[key];
    }
    // Default values matching the image: all confirmed are checked
    return 'DONE';
  };

  const CHECKLIST_ITEMS = [
    "BDV of oil main tank and moisture content of oil for sample taken from main tank bottom.",
    "IR VALUES of windings at 60 sec. (MΩ)",
    "IR VALUES of Bushing WRT Test tap at 60 sec",
    "Air venting from main tank and all other parts such as turrets, bushings, radaitors.",
    "Radiators IF fitted for heat run test",
    "Valves to be openbetween tank & radiators",
    "Air venting in tap changer",
    "Bushing oil level",
    "Shorting of all LINE CT, WTI CT Secondary and CFT",
    "EARTHLING OF Main Tank Though copper flexible",
    "Earth Resistance at Transformer end",
    "Check for Buchholz pipeline valve to be kept open. And breather to be fitted to conservator",
    "Clearance in Test area w.r.t other equipment / material so as to avoid any lesser clearance WRT earth",
    "Clearance- Phase - Earth, Phase - Phase",
    "Check for oil level in all Test Equipment No load loss measurement transformer",
    "Load Loss Measurement Traansformer",
    "Earthing of test equipment",
    "Removal of all eexternal material fromm transformer tank under test.",
    "Barricades put up for avoiding accidental entry of workmen to test area.",
    "Final clearance for HV Testing"
  ];

  return (
    <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
      <CompanyHeader />
      <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={16} className="text-industrial-accent" />
          <span className="text-sm font-bold uppercase tracking-widest">Checklist for transformer before applying high voltage</span>
        </div>
      </div>

      <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs font-mono">
          <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold border-b border-industrial-border">
            <tr>
              <th className="p-4 border-r border-industrial-border text-center w-16">SR. NO</th>
              <th className="p-4 border-r border-industrial-border text-left">PROCESS COMPLIANCE</th>
              <th className="p-4 border-r border-industrial-border text-center w-80">CONFIRMATION VALUES</th>
              <th className="p-4 text-center w-28">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map((item, idx) => {
              const statusVal = getStatusValue(idx);
              const isChecked = statusVal === 'DONE';

              const hasConfCheckbox = idx === 3 || (idx >= 7 && idx <= 19);
              const isConfChecked = getConfValue(idx) === 'DONE';

              return (
                <tr key={idx} className="border-b border-industrial-border last:border-0 hover:bg-industrial-bg/5 transition-colors">
                  <td className="p-4 border-r border-industrial-border text-center font-bold bg-industrial-bg/10 w-16">{idx + 1}</td>
                  <td className="p-4 border-r border-industrial-border font-medium text-industrial-text leading-relaxed text-left">{item}</td>
                  <td className="p-2 border-r border-industrial-border bg-slate-50/50" style={{ width: '30%' }}>
                    {idx === 0 ? (
                      <div className="flex flex-col gap-2 p-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 w-20 text-right">BDV (kV):</span>
                          <Field id="chk_val_1_bdv" placeholder="e.g. 60" className="text-center font-mono py-1 px-2 border border-slate-200 rounded w-28 bg-white focus:border-blue-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 w-20 text-right">PPM :</span>
                          <Field id="chk_val_1_ppm" placeholder="e.g. 15" className="text-center font-mono py-1 px-2 border border-slate-200 rounded w-28 bg-white focus:border-blue-500" />
                        </div>
                      </div>
                    ) : idx === 1 ? (
                      <div className="w-full min-h-[32px] flex items-center justify-center rounded">
                        <Field id={`chk_val_${idx+1}`} placeholder="NA" className="text-center font-mono py-1 px-2 border border-slate-200 rounded bg-white w-full max-w-[200px]" />
                      </div>
                    ) : idx === 2 ? (
                      <div className="flex flex-col gap-2 p-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 w-20 text-right">1.1 (MΩ) :</span>
                          <Field id="chk_val_3_1_1" placeholder="NA" className="text-center font-mono py-1 px-2 border border-slate-200 rounded w-28 bg-white focus:border-blue-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 w-20 text-right">2 (MΩ) :</span>
                          <Field id="chk_val_3_2" placeholder="NA" className="text-center font-mono py-1 px-2 border border-slate-200 rounded w-28 bg-white focus:border-blue-500" />
                        </div>
                      </div>
                    ) : idx >= 4 && idx <= 6 ? (
                      <div className="w-full min-h-[32px] flex items-center justify-center rounded">
                        <Field id={`chk_val_${idx + 1}`} placeholder="NA" className="text-center font-mono py-1 px-2 border border-slate-200 rounded bg-white w-full max-w-[200px]" />
                      </div>
                    ) : hasConfCheckbox ? (
                      <div className="w-full min-h-[32px] flex items-center justify-center rounded">
                        <button
                          onClick={() => handleFieldChange(`chk_conf_${idx+1}`, isConfChecked ? 'PENDING' : 'DONE')}
                          className={`flex items-center justify-center w-6 h-6 border-2 rounded transition-all ${
                            isConfChecked
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700'
                              : 'border-slate-300 text-transparent hover:border-slate-400 bg-white'
                          }`}
                        >
                          <Check size={14} className="stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs italic text-center">-</div>
                    )}
                  </td>
                  <td className="p-2 text-center w-40">
                    <div className="p-1">
                      <Field id={`chk_remark_${idx+1}`} placeholder="Remark" className="text-center font-mono py-1 px-2 border border-slate-200 rounded bg-white w-full" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="tested_date" placeholder="Date" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="reviewed_date" placeholder="Date" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="authorized_date" placeholder="Date" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
        </div>
      </div>
    </div>
  );
}

function PreConnectionTestForm({ test, job, onUpdate }: { test: TransformerTest, job?: Job, onUpdate: (data: Record<string, string>) => void }) {
  const rawData = seedPreConnWindingResGuaranteed(test.observationData || {}, job?.type, job?.capacity);
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const RATIO_TERMINALS = ['(1.1-2.)-(2.1-2)', '(1.1-2)-(2.1-1.1)', '(1.1-2.1)-(2-2.1)'];
  const MAG_TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

  const fixedCalRatios: Record<string, string> = {
    '(1.1-2.)-(2.1-2)': '2',
    '(1.1-2)-(2.1-1.1)': '2',
    '(1.1-2.1)-(2-2.1)': '1'
  };

  const data: Record<string, string> = {
    'mag_meter_make': 'HTC',
    'mag_meter_sr_no': 'HTC2406CG0246',
    ...rawData,
    'ratio_(1.1-2.)-(2.1-2)_cal': '2',
    'ratio_(1.1-2)-(2.1-1.1)_cal': '2',
    'ratio_(1.1-2.1)-(2-2.1)_cal': '1'
  };

  useEffect(() => {
    let changed = false;
    const updated = { ...rawData };
    RATIO_TERMINALS.forEach(term => {
      const calKey = `ratio_${term}_cal`;
      if (updated[calKey] !== fixedCalRatios[term]) {
        updated[calKey] = fixedCalRatios[term];
        changed = true;
      }
      
      const measVal = parseFloat(updated[`ratio_${term}_measured`] || '');
      const calVal = parseFloat(fixedCalRatios[term]);
      const devKey = `ratio_${term}_deviation`;
      if (!isNaN(measVal)) {
        const expectedDev = (((measVal - calVal) / calVal) * 100).toFixed(2);
        if (updated[devKey] !== expectedDev) {
          updated[devKey] = expectedDev;
          changed = true;
        }
      }
    });

    if (!updated['mag_meter_make']) {
      updated['mag_meter_make'] = 'HTC';
      changed = true;
    }
    if (!updated['mag_meter_sr_no']) {
      updated['mag_meter_sr_no'] = 'HTC2406CG0246';
      changed = true;
    }

    if (changed) {
      onUpdate(updated);
    } else if (JSON.stringify(rawData) !== JSON.stringify(test.observationData || {})) {
      onUpdate(rawData);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };
    
    // Auto calculate IR ratio (60s/15s)
    if (key === 'ir_winding_earth_15s' || key === 'ir_winding_earth_10s' || key === 'ir_winding_earth_60s') {
      const v15 = parseFloat(updated['ir_winding_earth_15s'] || updated['ir_winding_earth_10s'] || '');
      const v60 = parseFloat(updated['ir_winding_earth_60s']);
      if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
        updated['ir_winding_earth_ratio'] = (v60 / v15).toFixed(2);
      } else if ((updated['ir_winding_earth_15s'] === '' && updated['ir_winding_earth_10s'] === '') || updated['ir_winding_earth_60s'] === '') {
        updated['ir_winding_earth_ratio'] = '';
      }
    }

    // Auto calculate ratio deviation: ((measured - cal) / cal) * 100
    RATIO_TERMINALS.forEach(term => {
      const calKey = `ratio_${term}_cal`;
      const measuredKey = `ratio_${term}_measured`;
      const devKey = `ratio_${term}_deviation`;
      
      if (key === calKey || key === measuredKey) {
        const calVal = parseFloat(updated[calKey] || fixedCalRatios[term]);
        const measVal = parseFloat(updated[measuredKey]);
        
        if (!isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
          const dev = ((measVal - calVal) / calVal) * 100;
          updated[devKey] = dev.toFixed(2);
        } else if (updated[calKey] === '' || updated[measuredKey] === '') {
          updated[devKey] = '';
        }
      }
    });

    // Auto calculate winding resistance @ 75°C
    if (key === 'res_env_wdg' || key === 'res_env_ambient' || (key.startsWith('res_winding_') && key.endsWith('_amb'))) {
      let windingT = parseFloat(updated['res_env_wdg'] || '');
      if (isNaN(windingT)) {
        windingT = parseFloat(updated['res_env_ambient'] || '26');
      }
      MAG_TERMINALS.forEach(term => {
        const ambKey = `res_winding_${term}_amb`;
        const r75Key = `res_winding_${term}_75c`;
        const rAmb = parseFloat(updated[ambKey] || '');
        if (!isNaN(windingT) && !isNaN(rAmb)) {
          const r75 = ((235 + 75) / (235 + windingT)) * rAmb;
          updated[r75Key] = r75.toFixed(4);
        } else if (updated[ambKey] === '') {
          updated[r75Key] = '';
        }
      });
    }

    onUpdate(updated);
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: ctx?.styleMode }}>
      <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
        <CompanyHeader />
      {/* 1. IR VALUES */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MEASUREMENT OF IR VALUES</span>
          </div>
        </div>
        
        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4 overflow-hidden">
          <table className="w-full text-xs font-mono border border-industrial-border border-collapse mb-0" style={{ tableLayout: 'fixed' }}>
            <tbody>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" style={{ width: '20%' }}>Date:</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center" style={{ width: '20%' }}><Field id="ir_date" type="date" placeholder="DD/MM/YYYY" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" style={{ width: '10%' }}>Time:</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center" style={{ width: '15%' }}><Field id="ir_time" type="time" placeholder="HH:MM" className="text-center" /></td>
                <td className="p-2 bg-slate-100 font-bold text-center" style={{ width: '35%' }}>Details of Insulation Tester</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Ambiant Temp (&deg;C):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="ir_amb_temp" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Make:</td>
                <td className="p-1 bg-white text-center"><Field id="ir_tester_make" placeholder="MEGGER" className="text-center" /></td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Core Temp(&deg;C):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="ir_core_temp" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Sr. No:</td>
                <td className="p-1 bg-white text-center"><Field id="ir_tester_sr_no" placeholder="A01148D22" className="text-center" /></td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Wdg. Temp(&deg;C):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="ir_wdg_temp" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Range:</td>
                <td className="p-1 bg-white text-center"><Field id="ir_tester_range" placeholder="1-TO-5 kV" className="text-center" /></td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Relative Humidity(%):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="ir_humidity" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Voltage Level:</td>
                <td className="p-1 bg-white text-center"><Field id="ir_tester_voltage_level" placeholder="" className="text-center" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">COMBINATION</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">15 Sec (MΩ)</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">60 Sec (MΩ)</th>
                <th className="p-4 border-b border-industrial-border text-center">Ratio (60s/15s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/20">WINDING-EARTH</td>
                <td className="p-1 border-r border-industrial-border">
                  <Field id="ir_winding_earth_15s" pdfValue={data['ir_winding_earth_10s']} placeholder="-" className="w-full" />
                </td>
                <td className="p-1 border-r border-industrial-border">
                  <Field id="ir_winding_earth_60s" placeholder="-" className="w-full" />
                </td>
                <td className="p-1 border-industrial-border">
                  <Field id="ir_winding_earth_ratio" placeholder="-" className="w-full" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">RATIO TEST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Ratio Meter Details</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="ratio_meter_make" pdfValue="Eltel" label="Meter Make" />
                <Field id="ratio_meter_sr_no" label="Sr. No." />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Date & Time</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="ratio_test_date" type="date" label="Test Date" />
                <Field id="ratio_test_time" type="time" label="Test Time" />
             </div>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">TERMINALS</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">CAL. RATIO</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">MEASURED RATIO</th>
                <th className="p-4 border-b border-industrial-border text-center">DEVIATION %</th>
              </tr>
            </thead>
            <tbody>
              {RATIO_TERMINALS.map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`ratio_${term}_cal`} placeholder="-" readOnly={true} />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`ratio_${term}_measured`} placeholder="-" />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field id={`ratio_${term}_deviation`} placeholder="-" readOnly={true} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. VOLTAGE RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">VOLTAGE RATIO TEST</span>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              {/* Process / Voltage Ratio Test Row */}
              <tr className="bg-blue-100/85 text-industrial-text font-bold uppercase tracking-wider text-sm border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-left font-black w-2/5">PROCESS</th>
                <th className="p-3 text-center font-black" colSpan={2}>VOLTAGE RATIO TEST</th>
              </tr>
              {/* Applied Voltage / Measured Voltage Row */}
              <tr className="bg-slate-200 text-industrial-text font-bold uppercase tracking-wider text-xs border-b border-industrial-border">
                <th className="p-3 border-r border-industrial-border text-center">APPLIED VOLTAGE (V)</th>
                <th className="p-3 text-center" colSpan={2}>MEASURED VOLTAGE (V)</th>
              </tr>
            </thead>
            <tbody>
              {/* Scenario 1 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">1.1-2</td>
                <td className="p-2 border-r border-industrial-border">1.1-2.1</td>
                <td className="p-2">2-2.1</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="volt_ratio_sc1_applied" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="volt_ratio_sc1_m1" placeholder="-" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="volt_ratio_sc1_m2" placeholder="-" />
                </td>
              </tr>

              {/* Scenario 2 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">1.1-2.1</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2">2-2.1</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="volt_ratio_sc2_applied" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="volt_ratio_sc2_m1" placeholder="-" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="volt_ratio_sc2_m2" placeholder="-" />
                </td>
              </tr>

              {/* Scenario 3 */}
              <tr className="bg-slate-50 text-industrial-text-muted font-bold tracking-wider text-[11px] text-center border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border font-extrabold text-blue-900 bg-blue-50/50">2.1-2</td>
                <td className="p-2 border-r border-industrial-border">1.1-2</td>
                <td className="p-2">1.1-2.1</td>
              </tr>
              <tr className="border-b-0">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="volt_ratio_sc3_applied" placeholder="-" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="volt_ratio_sc3_m1" placeholder="-" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="volt_ratio_sc3_m2" placeholder="-" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. MAGNETIZING CURRENT TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardDrive size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MAGNETIZING CURRENT TEST</span>
          </div>
        </div>
        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4">
          {/* Header 1: APPLIED VOLTAGE (V), DATE, TIME */}
          <div className="border border-industrial-border grid grid-cols-6 items-center text-xs rounded-t-lg overflow-hidden">
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              APPLIED VOLTAGE (V) :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-white">
              <Field id="mag_applied_volt" placeholder="" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              DATE:
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-white">
              <Field id="mag_date" type="date" placeholder="DD/MM/YYYY" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              TIME:
            </div>
            <div className="p-1 col-span-1 bg-white">
              <Field id="mag_time" type="time" placeholder="HH:MM" />
            </div>
          </div>

          {/* Header 2: METER MAKE, SR NO. */}
          <div className="border-x border-b border-industrial-border grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              METER MAKE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-slate-50/50">
              <Field id="mag_meter_make" placeholder="" className="font-bold bg-slate-50/50" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              SR NO. :
            </div>
            <div className="p-1 col-span-1 bg-slate-50/50">
              <Field id="mag_meter_sr_no" placeholder="" className="font-bold bg-slate-50/50" />
            </div>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">TEMINALS</th>
                <th className="p-4 border-r border-b border-industrial-border text-center uppercase">
                  <div>APPLIED VOLTAGE (V)</div>
                  <div className="text-[10px] font-bold text-industrial-text-muted mt-1 normal-case">(1Φ 200VOLT APPLIED )</div>
                </th>
                <th className="p-4 border-b border-industrial-border text-center">MEASURED CURRENT <span className="normal-case">(mA)</span></th>
              </tr>
            </thead>
            <tbody>
              {MAG_TERMINALS.map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`mag_curr_${term}_v`} placeholder="-" />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field id={`mag_curr_${term}_measured`} placeholder="-" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. WINDING RESISTANCE TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Timer size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">WINDING RESISTANCE TEST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border shadow-sm">
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Resistance Meter Details</h6>
             <div className="grid grid-cols-3 gap-4">
                <Field id="res_meter_make" label="Meter Make" />
                <Field id="res_meter_sr_no" label="Sr. No." />
                <Field id="res_meter_range" placeholder="Range" label="Range" />
             </div>
          </div>
          <div className="space-y-4">
             <h6 className="text-[10px] font-bold text-industrial-accent uppercase tracking-widest border-b pb-1">Test Date & Time</h6>
             <div className="grid grid-cols-2 gap-4">
                <Field id="res_test_date" type="date" label="Test Date" />
                <Field id="res_test_time" type="time" label="Test Time" />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Wdg Temp (°C)</span>
            <input type="text" className="bg-white border border-industrial-border rounded p-2 text-sm font-bold outline-none focus:border-industrial-accent" value={data.res_env_wdg || ''} onChange={(e) => handleFieldChange('res_env_wdg', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Core Temp (°C)</span>
            <input type="text" className="bg-white border border-industrial-border rounded p-2 text-sm font-bold outline-none focus:border-industrial-accent" value={data.res_env_core || ''} onChange={(e) => handleFieldChange('res_env_core', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Ambient Temp (°C)</span>
            <input type="text" className="bg-white border border-industrial-border rounded p-2 text-sm font-bold outline-none focus:border-industrial-accent" value={data.res_env_ambient || ''} onChange={(e) => handleFieldChange('res_env_ambient', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Humidity (%)</span>
            <input type="text" className="bg-white border border-industrial-border rounded p-2 text-sm font-bold outline-none focus:border-industrial-accent" value={data.res_env_humidity || ''} onChange={(e) => handleFieldChange('res_env_humidity', e.target.value)} />
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">TEMINALS</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">
                  <div>Resistance @ Amb.</div>
                  <div className="text-[10px] font-bold text-industrial-text-muted mt-1">Ω</div>
                </th>
                <th className="p-4 border-r border-b border-industrial-border text-center bg-orange-50 text-orange-800">
                  <div>Resistance @75°C</div>
                  <div className="text-[10px] font-bold text-orange-800 mt-1">Ω</div>
                </th>
                <th className="p-4 border-b border-industrial-border text-center">
                  <div>MAX. GUARANTEED @75°C</div>
                  <div className="text-[10px] font-bold text-industrial-text-muted mt-1">Ω</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {MAG_TERMINALS.map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{term}</td>
                  {['amb', '75c', 'guaranteed'].map(col => (
                    <td key={col} className={`p-1 border-r border-b border-industrial-border last:border-r-0 ${col === '75c' ? 'bg-orange-50/30' : ''}`}>
                      <Field 
                        id={`res_winding_${term}_${col}`} 
                        placeholder="-" 
                        pdfValue={col === 'guaranteed' ? getPreConnWindingResMaxGuaranteed(term, job?.type, job?.capacity) : undefined} 
                        readOnly={col === '75c'}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.tested_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.tested_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY (TESTED)</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.reviewed_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.reviewed_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY (REVIEWED)</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.authorized_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.authorized_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY (AUTHORIZED)</p>
        </div>
      </div>
    </div>
    </FormContext.Provider>
  );
}

function FinalLVTestForm({ test, job, onUpdate }: { test: TransformerTest, job?: Job, onUpdate: (data: Record<string, string>) => void }) {
  const rawData = seedFinalLvWindingResGuaranteed(test.observationData || {}, job?.type, job?.capacity);
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

  const fixedCalRatios: Record<string, string> = {
    '1.1-2': '2',
    '1.1-2.1': '2',
    '2.1-2': '1'
  };

  const data: Record<string, string> = {
    'lv_mag_meter_make': 'HTC',
    'lv_mag_meter_sr_no': 'HTC2406CG0244',
    ...rawData,
    'lv_ratio_1.1-2_cal': '2',
    'lv_ratio_1.1-2.1_cal': '2',
    'lv_ratio_2.1-2_cal': '1'
  };

  const calculateLVImpedance = (updated: Record<string, string>) => {
    let changed = false;

    const v1 = parseFloat(updated['lv_sc_v1'] || '');
    const c2 = parseFloat(updated['lv_sc_c2'] || '');
    const z1 = calculateFinalLvScImpedanceZ(v1, c2, job?.type, job?.capacity);
    if (updated['lv_sc_z'] !== z1) {
      updated['lv_sc_z'] = z1;
      changed = true;
    }

    const v2 = parseFloat(updated['lv_sc_v2'] || '');
    const c4 = parseFloat(updated['lv_sc_c4'] || '');
    const z2 = calculateFinalLvScImpedanceZ(v2, c4, job?.type, job?.capacity);
    if (updated['lv_sc_z2'] !== z2) {
      updated['lv_sc_z2'] = z2;
      changed = true;
    }

    return changed;
  };

  const calculateLVWindingResistance = (updated: Record<string, string>) => {
    let changed = false;
    const windingT = parseFloat(updated['lv_wr_avg_oil'] || '');
    if (!isNaN(windingT)) {
      TERMINALS.forEach(term => {
        const termKey = term.replace('.', '_');
        const rAmb = parseFloat(updated[`lv_wr_${termKey}_amb`] || '');
        const r75Key = `lv_wr_${termKey}_75c`;
        if (!isNaN(rAmb)) {
          const r75 = ((235 + 75) / (235 + windingT)) * rAmb;
          const r75Str = r75.toFixed(4);
          if (updated[r75Key] !== r75Str) {
            updated[r75Key] = r75Str;
            changed = true;
          }
        } else {
          if (updated[r75Key]) {
            updated[r75Key] = '';
            changed = true;
          }
        }
      });
    } else {
      TERMINALS.forEach(term => {
        const termKey = term.replace('.', '_');
        const r75Key = `lv_wr_${termKey}_75c`;
        if (updated[r75Key]) {
          updated[r75Key] = '';
          changed = true;
        }
      });
    }
    return changed;
  };

  const calculateLVWindingTanDelta = (updated: Record<string, string>) => {
    let changed = false;
    const mf = parseFloat(updated['lv_td_winding_mf'] || '');
    (['5', '10'] as const).forEach(kv => {
      const tan = parseFloat(updated[`lv_td_winding_${kv}_tan`] || '');
      const tan20Key = `lv_td_winding_${kv}_tan20`;
      if (!isNaN(mf) && !isNaN(tan)) {
        const tan20 = (mf * tan).toFixed(4);
        if (updated[tan20Key] !== tan20) {
          updated[tan20Key] = tan20;
          changed = true;
        }
      } else if (updated[tan20Key]) {
        updated[tan20Key] = '';
        changed = true;
      }
    });
    return changed;
  };

  useEffect(() => {
    let changed = false;
    const updated = { ...rawData };
    TERMINALS.forEach(term => {
      const calKey = `lv_ratio_${term}_cal`;
      if (updated[calKey] !== fixedCalRatios[term]) {
        updated[calKey] = fixedCalRatios[term];
        changed = true;
      }
      
      const measVal = parseFloat(updated[`lv_ratio_${term}_measured`] || '');
      const calVal = parseFloat(fixedCalRatios[term]);
      const devKey = `lv_ratio_${term}_dev`;
      if (!isNaN(measVal)) {
        const expectedDev = (((measVal - calVal) / calVal) * 100).toFixed(2);
        if (updated[devKey] !== expectedDev) {
          updated[devKey] = expectedDev;
          changed = true;
        }
      }
    });

    if (!updated['lv_mag_meter_make']) {
      updated['lv_mag_meter_make'] = 'HTC';
      changed = true;
    }
    if (!updated['lv_mag_meter_sr_no']) {
      updated['lv_mag_meter_sr_no'] = 'HTC2406CG0244';
      changed = true;
    }

    const impedanceChanged = calculateLVImpedance(updated);
    if (impedanceChanged) {
      changed = true;
    }

    // Auto calculate Avg Oil Temp on mount
    const top = parseFloat(updated['lv_top_oil_temp'] || '');
    const bottom = parseFloat(updated['lv_bottom_oil_temp'] || '');
    if (!isNaN(top) && !isNaN(bottom)) {
      const avg = ((top + bottom) / 2).toFixed(1);
      if (updated['lv_avg_oil_temp'] !== avg) {
        updated['lv_avg_oil_temp'] = avg;
        changed = true;
      }
    }

    // Initialize max guaranteed values for winding resistance in Final LV Report
    const fixedMaxGuaranteed: Record<string, string> = {
      '1.1-2': getFinalLvWindingResMaxGuaranteed('1.1-2', job?.type, job?.capacity),
      '1.1-2.1': getFinalLvWindingResMaxGuaranteed('1.1-2.1', job?.type, job?.capacity),
      '2.1-2': getFinalLvWindingResMaxGuaranteed('2.1-2', job?.type, job?.capacity),
    };
    const forceMaxOverwrite = job?.type === 'Auto' && job?.capacity === '12.3MVA';
    TERMINALS.forEach(term => {
      const termKey = term.replace('.', '_');
      const maxKey = `lv_wr_${termKey}_max`;
      if (forceMaxOverwrite || updated[maxKey] === undefined || updated[maxKey] === '') {
        if (updated[maxKey] !== fixedMaxGuaranteed[term]) {
          updated[maxKey] = fixedMaxGuaranteed[term];
          changed = true;
        }
      }
    });

    // Auto calculate lv_wr_avg_oil on mount
    const wrTop = parseFloat(updated['lv_wr_top_oil'] || '');
    const wrBottom = parseFloat(updated['lv_wr_bottom_oil'] || '');
    if (!isNaN(wrTop) && !isNaN(wrBottom)) {
      const wrAvg = ((wrTop + wrBottom) / 2).toFixed(1);
      if (updated['lv_wr_avg_oil'] !== wrAvg) {
        updated['lv_wr_avg_oil'] = wrAvg;
        changed = true;
      }
    }

    // Auto calculate IR ratio (60s/15s) on mount
    const ir15 = parseFloat(updated['lv_ir_15s'] || '');
    const ir60 = parseFloat(updated['lv_ir_60s'] || '');
    if (!isNaN(ir15) && !isNaN(ir60) && ir15 !== 0) {
      const irRatio = (ir60 / ir15).toFixed(2);
      if (updated['lv_ir_ratio'] !== irRatio) {
        updated['lv_ir_ratio'] = irRatio;
        changed = true;
      }
    }

    // Auto calculate lv_td_avg_temp on mount
    const tdTop = parseFloat(updated['lv_td_top_oil'] || '');
    const tdBottom = parseFloat(updated['lv_td_bottom_oil'] || '');
    if (!isNaN(tdTop) && !isNaN(tdBottom)) {
      const tdAvg = ((tdTop + tdBottom) / 2).toFixed(1);
      if (updated['lv_td_avg_temp'] !== tdAvg) {
        updated['lv_td_avg_temp'] = tdAvg;
        changed = true;
      }
    }

    // Auto calculate lv_pi_avg_oil on mount
    const piTop = parseFloat(updated['lv_pi_top_oil'] || '');
    const piBottom = parseFloat(updated['lv_pi_bottom_oil'] || '');
    if (!isNaN(piTop) && !isNaN(piBottom)) {
      const piAvg = ((piTop + piBottom) / 2).toFixed(1);
      if (updated['lv_pi_avg_oil'] !== piAvg) {
        updated['lv_pi_avg_oil'] = piAvg;
        changed = true;
      }
    }

    // Auto calculate lv winding resistance @ 75°C on mount
    const wrWindingResChanged = calculateLVWindingResistance(updated);
    if (wrWindingResChanged) {
      changed = true;
    }

    // Auto calculate winding tan delta @ 20°C on mount
    const windingTanDeltaChanged = calculateLVWindingTanDelta(updated);
    if (windingTanDeltaChanged) {
      changed = true;
    }

    // Auto calculate Polarization Index Ratios on mount
    const pi15 = parseFloat(updated['lv_pi_15s'] || '');
    const pi60 = parseFloat(updated['lv_pi_60s'] || '');
    const pi600 = parseFloat(updated['lv_pi_600s'] || '');
    if (!isNaN(pi15) && !isNaN(pi60) && pi15 !== 0) {
      const irRatio = (pi60 / pi15).toFixed(2);
      if (updated['lv_pi_ir_ratio'] !== irRatio) {
        updated['lv_pi_ir_ratio'] = irRatio;
        changed = true;
      }
    }
    if (!isNaN(pi60) && !isNaN(pi600) && pi60 !== 0) {
      const piRatio = (pi600 / pi60).toFixed(2);
      if (updated['lv_pi_pi_ratio'] !== piRatio) {
        updated['lv_pi_pi_ratio'] = piRatio;
        changed = true;
      }
    }

    if (changed) {
      onUpdate(updated);
    } else if (JSON.stringify(rawData) !== JSON.stringify(test.observationData || {})) {
      onUpdate(rawData);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };

    if (key === 'offered_by') {
      updated['offered_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'tested_by') {
      updated['tested_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'authorized_by') {
      updated['authorized_date'] = value ? new Date().toLocaleString() : '';
    }

    // Auto calculate IR ratio (60s/15s)
    if (key === 'lv_ir_15s' || key === 'lv_ir_60s') {
      const v15 = parseFloat(updated['lv_ir_15s']);
      const v60 = parseFloat(updated['lv_ir_60s']);
      if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
        updated['lv_ir_ratio'] = (v60 / v15).toFixed(2);
      } else if (updated['lv_ir_15s'] === '' || updated['lv_ir_60s'] === '') {
        updated['lv_ir_ratio'] = '';
      }
    }

    // Auto calculate Polarization Index Ratios
    if (key === 'lv_pi_15s' || key === 'lv_pi_60s' || key === 'lv_pi_600s') {
      const v15 = parseFloat(updated['lv_pi_15s']);
      const v60 = parseFloat(updated['lv_pi_60s']);
      const v600 = parseFloat(updated['lv_pi_600s']);
      
      if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
        updated['lv_pi_ir_ratio'] = (v60 / v15).toFixed(2);
      } else {
        updated['lv_pi_ir_ratio'] = '';
      }

      if (!isNaN(v60) && !isNaN(v600) && v60 !== 0) {
        updated['lv_pi_pi_ratio'] = (v600 / v60).toFixed(2);
      } else {
        updated['lv_pi_pi_ratio'] = '';
      }
    }

    // Auto calculate Avg Oil Temp
    if (key === 'lv_top_oil_temp' || key === 'lv_bottom_oil_temp') {
      const topVal = parseFloat(updated['lv_top_oil_temp'] || '');
      const bottomVal = parseFloat(updated['lv_bottom_oil_temp'] || '');
      if (!isNaN(topVal) && !isNaN(bottomVal)) {
        updated['lv_avg_oil_temp'] = ((topVal + bottomVal) / 2).toFixed(1);
      } else {
        updated['lv_avg_oil_temp'] = '';
      }
    }

    // Auto calculate ratio deviation: ((measured - cal) / cal) * 100
    TERMINALS.forEach(term => {
      const calKey = `lv_ratio_${term}_cal`;
      const measuredKey = `lv_ratio_${term}_measured`;
      const devKey = `lv_ratio_${term}_dev`;

      if (key === calKey || key === measuredKey) {
        const calVal = parseFloat(updated[calKey]);
        const measVal = parseFloat(updated[measuredKey]);

        if (!isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
          const dev = ((measVal - calVal) / calVal) * 100;
          updated[devKey] = dev.toFixed(2);
        } else if (updated[calKey] === '' || updated[measuredKey] === '') {
          updated[devKey] = '';
        }
      }
    });

    // Auto calculate Short Circuit %Z
    if (
      key === 'lv_sc_v1' || 
      key === 'lv_sc_c2' || 
      key === 'lv_sc_v2' || 
      key === 'lv_sc_c4'
    ) {
      calculateLVImpedance(updated);
    }

    // Auto calculate winding resistance Average Oil Temp for Final LV Report
    if (key === 'lv_wr_top_oil' || key === 'lv_wr_bottom_oil') {
      const topVal = parseFloat(updated['lv_wr_top_oil'] || '');
      const bottomVal = parseFloat(updated['lv_wr_bottom_oil'] || '');
      if (!isNaN(topVal) && !isNaN(bottomVal)) {
        updated['lv_wr_avg_oil'] = ((topVal + bottomVal) / 2).toFixed(1);
      } else {
        updated['lv_wr_avg_oil'] = '';
      }
    }

    // Auto calculate Tan Delta Bushing Avg. Temp
    if (key === 'lv_td_top_oil' || key === 'lv_td_bottom_oil') {
      const topVal = parseFloat(updated['lv_td_top_oil'] || '');
      const bottomVal = parseFloat(updated['lv_td_bottom_oil'] || '');
      if (!isNaN(topVal) && !isNaN(bottomVal)) {
        updated['lv_td_avg_temp'] = ((topVal + bottomVal) / 2).toFixed(1);
      } else {
        updated['lv_td_avg_temp'] = '';
      }
    }

    // Auto calculate Polarization Index Avg. Oil Temp
    if (key === 'lv_pi_top_oil' || key === 'lv_pi_bottom_oil') {
      const topVal = parseFloat(updated['lv_pi_top_oil'] || '');
      const bottomVal = parseFloat(updated['lv_pi_bottom_oil'] || '');
      if (!isNaN(topVal) && !isNaN(bottomVal)) {
        updated['lv_pi_avg_oil'] = ((topVal + bottomVal) / 2).toFixed(1);
      } else {
        updated['lv_pi_avg_oil'] = '';
      }
    }

    // Auto calculate winding tan delta @ 20°C: MF * TAN DELTA (%)
    if (
      key === 'lv_td_winding_mf' ||
      key === 'lv_td_winding_5_tan' ||
      key === 'lv_td_winding_10_tan'
    ) {
      calculateLVWindingTanDelta(updated);
    }

    // Auto calculate winding resistance @ 75°C for Final LV Report
    if (
      key === 'lv_wr_avg_oil' ||
      key === 'lv_wr_top_oil' ||
      key === 'lv_wr_bottom_oil' ||
      (key.startsWith('lv_wr_') && key.endsWith('_amb'))
    ) {
      calculateLVWindingResistance(updated);
    }

    onUpdate(updated);
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: ctx?.styleMode }}>
      <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
        <CompanyHeader />
        {/* 1. MEASUREMENT OF IR VALUES */}
        <section className="space-y-6">
          <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MEASUREMENT OF IR VALUES</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field id="lv_date" type="date" label="Date" />
              <Field id="lv_time" type="time" label="Time" />
              <Field id="lv_amb_temp" label="Amb. Temp (⁰C)" />
              <Field id="lv_humidity" label="Relative Humidity (%)" />
              <Field id="lv_top_oil_temp" label="Top Oil Temp (⁰C)" />
              <Field id="lv_bottom_oil_temp" label="Bottom oil Temp (⁰C)" />
              <div className="col-span-2">
                <Field id="lv_avg_oil_temp" label="Avg oil Temp (⁰C)" readOnly={true} className="bg-slate-50 font-bold" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-industrial-border pb-2 mb-4">
              <HardDrive size={14} className="text-industrial-accent" />
              <h4 className="text-xs font-bold text-industrial-accent uppercase tracking-widest">Insulation Tester</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field id="lv_ir_make" label="Make" />
              <Field id="lv_ir_sr_no" label="Sr. No" />
              <Field id="lv_ir_range" label="Range" />
              <Field id="lv_ir_voltage" label="Voltage Level (V)" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
                <tr>
                  <th className="p-4 border-r border-b border-industrial-border text-left">Description</th>
                  <th className="p-4 border-r border-b border-industrial-border text-center">15 Sec (MΩ)</th>
                  <th className="p-4 border-r border-b border-industrial-border text-center">60 Sec (MΩ)</th>
                  <th className="p-4 border-b border-industrial-border text-center">Ratio of 60 Sec/ 15 Sec</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10">WINDING-EARTH</td>
                  <td className="p-1 border-r border-industrial-border"><Field id="lv_ir_15s" placeholder="" /></td>
                  <td className="p-1 border-r border-industrial-border"><Field id="lv_ir_60s" placeholder="" /></td>
                  <td className="p-1"><Field id="lv_ir_ratio" placeholder="" readOnly={true} className="text-center bg-slate-50 font-bold" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm max-w-md">
            <table className="w-full text-xs font-mono">
              <tbody>
                <tr className="border-b border-industrial-border">
                  <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10 text-right w-1/2">core to frame :</td>
                  <td className="p-1 border-r border-industrial-border w-1/3"><Field id="lv_ir_core_to_frame" placeholder="" /></td>
                  <td className="p-4 text-center font-bold text-industrial-text-muted bg-industrial-bg/10 w-1/6">(MΩ)</td>
                </tr>
                <tr className="border-b border-industrial-border">
                  <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10 text-right">core to tank :</td>
                  <td className="p-1 border-r border-industrial-border"><Field id="lv_ir_core_to_tank" placeholder="" /></td>
                  <td className="p-4 text-center font-bold text-industrial-text-muted bg-industrial-bg/10">(MΩ)</td>
                </tr>
                <tr>
                  <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10 text-right">frame to tank :</td>
                  <td className="p-1 border-r border-industrial-border"><Field id="lv_ir_frame_to_tank" placeholder="" /></td>
                  <td className="p-4 text-center font-bold text-industrial-text-muted bg-industrial-bg/10">(MΩ)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2. RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">RATIO TEST</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-industrial-bg/5 p-6 rounded-xl border border-industrial-border text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-industrial-border pb-2 mb-4">
              <Activity size={14} className="text-industrial-accent" />
              <h4 className="text-xs font-bold text-industrial-accent uppercase tracking-widest">Ratio Meter Details</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field id="lv_ratio_meter_make" label="Meter Make" />
              <Field id="lv_ratio_meter_sr_no" label="Sr. No." />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-industrial-border pb-2 mb-4">
              <Timer size={14} className="text-industrial-accent" />
              <h4 className="text-xs font-bold text-industrial-accent uppercase tracking-widest">Test Date & Time</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field id="lv_ratio_date" type="date" label="Date" />
              <Field id="lv_ratio_time" type="time" label="Time" />
            </div>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">Terminals</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">CAL. RATIO</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">MEASURED RATIO</th>
                <th className="p-4 border-b border-industrial-border text-center">DEVIATION %</th>
              </tr>
            </thead>
            <tbody>
              {['1.1-2', '1.1-2.1', '2.1-2'].map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border"><Field id={`lv_ratio_${term}_cal`} placeholder="-" readOnly={true} /></td>
                  <td className="p-1 border-r border-b border-industrial-border"><Field id={`lv_ratio_${term}_measured`} placeholder="-" /></td>
                  <td className="p-1 border-b border-industrial-border"><Field id={`lv_ratio_${term}_dev`} placeholder="-" readOnly={true} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. VOLTAGE RATIO TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Timer size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">VOLTAGE RATIO TEST</span>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase font-bold px-1">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-center w-1/3">APPLIED VOLTAGE (V)</th>
                <th colSpan={2} className="p-4 border-b border-industrial-border text-center">MEASURED VOLTAGE (V)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: '11_2', applied: '1.1-2', m1_label: '1.1-2.1', m2_label: '2-2.1' },
                { key: '11_21', applied: '1.1-2.1', m1_label: '1.1-2', m2_label: '2-2.1' },
                { key: '21_2', applied: '2.1-2', m1_label: '1.1-2', m2_label: '1.1-2.1' }
              ].map(group => (
                <React.Fragment key={group.key}>
                  {/* Label Row */}
                  <tr className="bg-slate-100 border-b border-industrial-border text-center font-bold">
                    <td className="p-3 border-r border-industrial-border text-slate-800">{group.applied}</td>
                    <td className="p-3 border-r border-industrial-border text-slate-800">{group.m1_label}</td>
                    <td className="p-3 text-slate-800 bg-slate-50">{group.m2_label}</td>
                  </tr>
                  {/* Input Fields Row */}
                  <tr className="border-b border-industrial-border last:border-b-0 text-center">
                    <td className="p-1 border-r border-industrial-border bg-white">
                      <Field id={`lv_vratio_applied_${group.key}`} placeholder="" className="text-center font-bold" />
                    </td>
                    <td className="p-1 border-r border-industrial-border bg-white">
                      <Field id={`lv_vratio_m1_${group.key}`} placeholder="" className="text-center" />
                    </td>
                    <td className="p-1 bg-white">
                      <Field id={`lv_vratio_m2_${group.key}`} placeholder="" className="text-center" />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. MAGNETIZING CURRENT TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">MAGNETIZING CURRENT TEST</span>
          </div>
        </div>
        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4">
          {/* Header 1: APPLIED VOLTAGE, DATE, TIME */}
          <div className="border border-industrial-border grid grid-cols-6 items-center text-xs rounded-t-lg overflow-hidden">
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              APPLIED VOLTAGE (V) :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-white">
              <Field id="lv_mag_applied" placeholder="" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              DATE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-white">
              <Field id="lv_mag_date" type="date" placeholder="DD/MM/YYYY" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              TIME :
            </div>
            <div className="p-1 col-span-1 bg-white">
              <Field id="lv_mag_time" type="time" placeholder="HH:MM" />
            </div>
          </div>

          {/* Header 2: METER MAKE, SR. NO */}
          <div className="border-x border-b border-industrial-border grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              METER MAKE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1 bg-slate-50/50">
              <Field id="lv_mag_meter_make" placeholder="" className="font-bold bg-slate-50/50" />
            </div>
            <div className="p-2 bg-slate-100 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1 uppercase">
              SR. NO:
            </div>
            <div className="p-1 col-span-1 bg-slate-50/50">
              <Field id="lv_mag_meter_sr_no" placeholder="" className="font-bold bg-slate-50/50" />
            </div>
          </div>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left">TERMINALS</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">APPLIED VOLTAGE (V)</th>
                <th className="p-4 border-b border-industrial-border text-center">MEASURED CURRENT <span className="normal-case">(mA)</span></th>
              </tr>
            </thead>
            <tbody>
              {['1.1-2', '1.1-2.1', '2.1-2'].map(term => (
                <tr key={term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{term}</td>
                  <td className="p-1 border-r border-b border-industrial-border"><Field id={`lv_mag_${term}_voltage`} /></td>
                  <td className="p-1 border-b border-industrial-border"><Field id={`lv_mag_${term}_current`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. SHORT CIRCUIT TEST */}
      <section className="space-y-6">
        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4">
          {/* Header 1: Process | Short Circuit Test */}
          <div className="border border-industrial-border grid grid-cols-5 text-center font-bold text-xs uppercase bg-[#dbeafe] rounded-t-lg overflow-hidden">
            <div className="p-3 border-r border-industrial-border bg-[#dbeafe] font-bold text-industrial-text col-span-1">
              PROCESS
            </div>
            <div className="p-3 bg-[#e0f2fe] text-blue-900 font-extrabold col-span-4 tracking-wider">
              SHORT CIRCUIT TEST
            </div>
          </div>

          {/* Header 2: Applied Voltage, Date, Time */}
          <div className="border-x border-b border-industrial-border grid grid-cols-6 items-center text-xs">
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              APPLIED VOLTAGE (V) :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1">
              <Field id="lv_sc_applied" placeholder="" />
            </div>
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              DATE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1">
              <Field id="lv_sc_date" type="date" placeholder="DD/MM/YYYY" />
            </div>
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              TIME :
            </div>
            <div className="p-1 col-span-1">
              <Field id="lv_sc_time" type="time" placeholder="HH:MM" />
            </div>
          </div>

          {/* Header 3: Meter Make, Sr.No */}
          <div className="border-x border-b border-industrial-border grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              METER MAKE :
            </div>
            <div className="p-1 border-r border-[#cbd5e1] col-span-1">
              <Field id="lv_sc_meter_make" placeholder="" />
            </div>
            <div className="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
              SR.NO.:
            </div>
            <div className="p-1 col-span-1">
              <Field id="lv_sc_sr_no" placeholder="" />
            </div>
          </div>
        </div>

        {/* Short Circuit Measurements Grid (Matches excel columns exactly) */}
        <div className="border border-industrial-border rounded-xl overflow-hidden mb-6 shadow-sm">
          <table className="w-full text-xs font-mono text-center border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-industrial-border font-bold">
                <th className="p-3 border-r border-industrial-border w-[10%] bg-slate-50"></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[30%]">APPLIED VOLTAGE (V)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[30%]">MEASURED CURRENT (A)</th>
                <th className="p-3 text-center text-slate-700 uppercase tracking-wider w-[30%] border-b-none">MEASURED CURRENT (A)</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 static text */}
              <tr className="bg-slate-50 border-b border-industrial-border text-center font-bold">
                <td className="p-3 border-r border-industrial-border bg-slate-50/70" rowSpan={2}>-</td>
                <td className="p-3 border-r border-industrial-border">1.1-2</td>
                <td className="p-3 border-r border-industrial-border">1.1</td>
                <td className="p-3 bg-slate-50/20 font-bold text-center">2-2.1 (Short)</td>
              </tr>
              {/* Row 1 subheader / user inputs */}
              <tr className="border-b border-industrial-border">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_sc_v1" placeholder="" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_sc_c1" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="lv_sc_c2" placeholder="" />
                </td>
              </tr>

              {/* Row 2 static text */}
              <tr className="bg-slate-50 border-b border-industrial-border text-center font-bold">
                <td className="p-3 border-r border-industrial-border bg-slate-50/70" rowSpan={2}>-</td>
                <td className="p-3 border-r border-industrial-border">1.1-2</td>
                <td className="p-3 border-r border-industrial-border">2</td>
                <td className="p-3 bg-slate-50/20 font-bold text-center">1.1-2.1 (Short)</td>
              </tr>
              {/* Row 2 subheader / user inputs */}
              <tr className="border-b-0">
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_sc_v2" placeholder="" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_sc_c3" placeholder="" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="lv_sc_c4" placeholder="" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="text-center font-black text-sm uppercase tracking-wider text-industrial-text-muted">
            % IMPEDANCE
          </div>
          <div className="grid grid-cols-3 bg-[#94a3b8]/30 border border-industrial-border rounded-xl text-center items-center font-bold text-sm max-w-md w-full overflow-hidden shadow-sm">
            <div className="p-3 border-r border-b border-industrial-border font-extrabold text-slate-800">
              % Z =
            </div>
            <div className="p-1 border-r border-b border-[#cbd5e1] border-industrial-border bg-white">
              <Field id="lv_sc_z" placeholder="" className="text-center font-black" readOnly={true} />
            </div>
            <div className="p-3 border-b border-industrial-border font-extrabold text-slate-800">
              %
            </div>
            <div className="p-3 border-r border-industrial-border font-extrabold text-slate-800">
              % Z =
            </div>
            <div className="p-1 border-r border-[#cbd5e1] border-industrial-border bg-white">
              <Field id="lv_sc_z2" placeholder="" className="text-center font-black" readOnly={true} />
            </div>
            <div className="p-3 font-extrabold text-slate-800">
              %
            </div>
          </div>
        </div>
      </section>

      {/* 6. WINDING RESISTANCE TEST */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">WINDING RESISTANCE TEST</span>
          </div>
        </div>
        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-0 mb-4 overflow-hidden">
          <table className="w-full text-xs font-mono border border-industrial-border border-collapse mb-0">
            <tbody>
              <tr className="border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border bg-white w-1/3">
                  <span className="font-bold">METER USED:</span>
                  <Field id="lv_wr_meter_used" pdfValue="PRESTIGE ELECTRONICS" className="text-center mt-1" />
                </td>
                <td className="p-2 border-r border-industrial-border bg-white w-1/3">
                  <span className="font-bold">DATE:</span>
                  <Field id="lv_wr_date" type="date" className="text-center mt-1" />
                </td>
                <td className="p-2 bg-white w-1/3">
                  <span className="font-bold">TIME :</span>
                  <Field id="lv_wr_time" type="time" className="text-center mt-1" />
                </td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border bg-white">
                  <span className="font-bold">METER MAKE SR. NO :</span>
                  <Field id="lv_wr_meter_sr_no" pdfValue="PE/040/MAR/2023" className="text-center mt-1" />
                </td>
                <td className="p-2 border-r border-industrial-border bg-white">
                  <span className="font-bold">TOP OIL TEMP °C :</span>
                  <Field id="lv_wr_top_oil" placeholder="" className="text-center mt-1" />
                </td>
                <td className="p-2 bg-white">
                  <span className="font-bold">BOTTOM OIL TEMP °C :</span>
                  <Field id="lv_wr_bottom_oil" placeholder="" className="text-center mt-1" />
                </td>
              </tr>
              <tr>
                <td className="p-2 border-r border-industrial-border bg-white">
                  <span className="font-bold">RANGE :</span>
                  <Field id="lv_wr_range" pdfValue="1999.9 μΩ-19.999Ω" className="text-center mt-1" />
                </td>
                <td className="p-2 border-r border-industrial-border bg-white">
                  <span className="font-bold">AMBIENT °C :</span>
                  <Field id="lv_wr_ambient" placeholder="" className="text-center mt-1" />
                </td>
                <td className="p-2 bg-white">
                  <span className="font-bold">AVERAGE OIL TEMP °C :</span>
                  <Field id="lv_wr_avg_oil" placeholder="" readOnly={true} className="text-center mt-1 bg-slate-50 font-bold" />
                </td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-xs font-mono border-x border-b border-industrial-border border-collapse">
            <tbody>
              <tr>
                <td className="p-2 border-r border-industrial-border bg-white w-1/2">
                  <span className="font-bold">Avg. Oil Temp °C :</span>
                  <Field id="lv_wr_avg_oil" placeholder="" readOnly={true} className="text-center mt-1 bg-slate-50 font-bold max-w-xs" />
                </td>
                <td className="p-2 bg-white w-1/2">
                  <span className="font-bold">Humidity (%):</span>
                  <Field id="lv_wr_humidity" placeholder="" className="text-center mt-1 max-w-xs" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3 border-r border-b border-industrial-border text-left font-black">TEMINALS</th>
                <th className="p-3 border-r border-b border-industrial-border text-center font-black">
                  <div>RESISTANCE @ AMB.</div>
                  <div className="text-[10px] font-normal text-slate-400">Ω</div>
                </th>
                <th className="p-3 border-r border-b border-industrial-border text-center bg-orange-50/60 text-orange-800 font-black">
                  <div>RESISTANCE @75°C</div>
                  <div className="text-[10px] font-normal text-orange-500">Ω</div>
                </th>
                <th className="p-3 border-b border-industrial-border text-center font-black">
                  <div>MAX. GUARANTEED @75°C</div>
                  <div className="text-[10px] font-normal text-slate-400">Ω</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { term: '1.1-2' },
                { term: '1.1-2.1' },
                { term: '2.1-2' }
              ].map(row => (
                <tr key={row.term}>
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{row.term}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`lv_wr_${row.term.replace('.','_')}_amb`} placeholder="-" className="text-center font-bold" />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border bg-orange-50/30">
                    <Field id={`lv_wr_${row.term.replace('.','_')}_75c`} placeholder="-" className="text-center text-orange-600 font-black" readOnly={true} />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field
                      id={`lv_wr_${row.term.replace('.','_')}_max`}
                      placeholder="-"
                      pdfValue={getFinalLvWindingResMaxGuaranteed(row.term, job?.type, job?.capacity)}
                      className="text-center font-bold text-slate-700"
                      readOnly={true}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. TAN DELTA AND CAPACITANCE TEST ON BUSHING */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">TAN DELTA AND CAPACITANCE TEST ON BUSHING</span>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-0 mb-4 overflow-hidden">
          <table className="w-full text-xs font-mono border border-industrial-border border-collapse mb-0">
            <tbody>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center w-[15%]">METER USED</td>
                <td className="p-1 border-r border-industrial-border bg-white w-[20%]"><Field id="lv_td_meter" placeholder="MEGGER" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2 w-[10%]">Date:</td>
                <td className="p-1 border-r border-industrial-border bg-white w-[20%]"><Field id="lv_td_date" type="date" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2 w-[10%]">Time:</td>
                <td className="p-1 bg-white w-[25%]"><Field id="lv_td_time" type="time" className="text-center" /></td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">MODEL & S. NO</td>
                <td className="p-1 border-r border-industrial-border bg-white"><Field id="lv_td_model" placeholder="1100205" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2">OTI:</td>
                <td className="p-1 border-r border-industrial-border bg-white"><Field id="lv_td_oti" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2">WTI:</td>
                <td className="p-1 bg-white"><Field id="lv_td_wti" placeholder="" className="text-center" /></td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-xs font-mono border-x border-b border-industrial-border border-collapse">
            <tbody>
              <tr>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2 w-[10%]">Top Oil(°C):</td>
                <td className="p-1 border-r border-industrial-border bg-white w-[15%]"><Field id="lv_td_top_oil" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2 w-[12%]">Bottom Oil(°C):</td>
                <td className="p-1 border-r border-industrial-border bg-white w-[13%]"><Field id="lv_td_bottom_oil" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2 w-[15%]">Amb. Temp.(°C):</td>
                <td className="p-1 border-r border-industrial-border bg-white w-[10%]"><Field id="lv_td_amb_temp" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2 w-[10%]">Humi.(%):</td>
                <td className="p-1 bg-white w-[15%]"><Field id="lv_td_humi" placeholder="" className="text-center" /></td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-right pr-2">Avg. Temp (°C) :</td>
                <td className="p-1 border-r border-industrial-border bg-white" colSpan={7}><Field id="lv_td_avg_temp" placeholder="" readOnly={true} className="text-center max-w-xs bg-slate-50 font-bold" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono text-center border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-industrial-border font-bold">
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[15%]">TERMINAL</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[15%]">Sr. No. / Make</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[14%]">Applied Voltage <span className="normal-case font-sans font-normal">(kV)</span></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[14%]">TAN DELTA (%)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[14%]">CAPACITANCE <span className="normal-case font-sans font-normal">(pf)</span></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider w-[14%] bg-slate-100">EXCITATION CURRENT <span className="normal-case font-sans font-normal">(mA)</span></th>
                <th className="p-3 text-center text-slate-700 uppercase tracking-wider w-[14%]">DIELECTRIC LOSS (W)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-industrial-border">
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold text-center" rowSpan={2}>
                  <div>1.1</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-1">mode:</div>
                  <div className="text-[11px] mt-1">UST <span className="text-red-600 font-extrabold">-R</span><span className="text-blue-600 font-extrabold">/B</span></div>
                </td>
                <td className="p-2 border-r border-industrial-border bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-600 mb-1">Sr. No.</div>
                  <Field id="lv_td_1_1_5_sr" placeholder="" className="text-center" />
                </td>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold">5</td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_1_1_5_tan" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_1_1_5_cap" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_1_1_5_exc" placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="lv_td_1_1_5_loss" placeholder="" className="text-center" />
                </td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 border-r border-industrial-border bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-600 mb-1">Make</div>
                  <Field id="lv_td_1_1_10_make" placeholder="" className="text-center" />
                </td>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold">10</td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_1_1_10_tan" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_1_1_10_cap" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_1_1_10_exc" placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="lv_td_1_1_10_loss" placeholder="" className="text-center" />
                </td>
              </tr>

              <tr className="border-b border-industrial-border">
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold text-center" rowSpan={2}>
                  <div>2</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-1">mode:</div>
                  <div className="text-[11px] mt-1">UST <span className="text-red-600 font-extrabold">R</span><span className="text-blue-600 font-extrabold">/B</span></div>
                </td>
                <td className="p-2 border-r border-industrial-border bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-600 mb-1">Sr. No.</div>
                  <Field id="lv_td_2_5_sr" placeholder="" className="text-center" />
                </td>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold">5</td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_2_5_tan" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_2_5_cap" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_2_5_exc" placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="lv_td_2_5_loss" placeholder="" className="text-center" />
                </td>
              </tr>
              <tr>
                <td className="p-2 border-r border-industrial-border bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-600 mb-1">Make</div>
                  <Field id="lv_td_2_10_make" placeholder="" className="text-center" />
                </td>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold">10</td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_2_10_tan" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white">
                  <Field id="lv_td_2_10_cap" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_2_10_exc" placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-white">
                  <Field id="lv_td_2_10_loss" placeholder="" className="text-center" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. TAN DELTA AND CAPACITANCE TEST ON WINDING */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">TAN DELTA AND CAPACITANCE TEST ON WINDING</span>
          </div>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs font-mono text-center border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-industrial-border font-bold">
                <th className="p-1 border-r border-industrial-border" colSpan={6}></th>
                <th className="p-1 text-center text-slate-700 font-bold normal-case bg-white">
                  <span className="block mb-1">MF:</span>
                  <Field id="lv_td_winding_mf" placeholder="" className="text-center" />
                </th>
              </tr>
              <tr className="bg-slate-200 border-b border-industrial-border font-bold">
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider">TERMINAL</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider">Applied Voltage <span className="normal-case font-sans font-normal">(kV)</span></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider">TAN DELTA (%)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider">CAPACITANCE <span className="normal-case font-sans font-normal">(pf)</span></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider bg-slate-100">EXCITATION CURRENT <span className="normal-case font-sans font-normal">(mA)</span></th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider">DIELECTRIC LOSS (W)</th>
                <th className="p-3 text-center text-slate-700 uppercase tracking-wider">TanΔ (%) at 20 °C</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-industrial-border">
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold text-center" rowSpan={2}>
                  <div>WINDING</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-1">mode:</div>
                  <div className="text-[11px] mt-1 font-extrabold text-slate-700">GST-GND</div>
                </td>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold">5</td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_5_tan" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_5_cap" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_5_exc" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_5_loss" placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-slate-100">
                  <Field id="lv_td_winding_5_tan20" placeholder="" readOnly={true} className="text-center font-bold bg-slate-50" />
                </td>
              </tr>
              <tr>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold">10</td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_10_tan" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_10_cap" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_10_exc" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-100">
                  <Field id="lv_td_winding_10_loss" placeholder="" className="text-center" />
                </td>
                <td className="p-1 bg-slate-100">
                  <Field id="lv_td_winding_10_tan20" placeholder="" readOnly={true} className="text-center font-bold bg-slate-50" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. POLARIZATION INDEX */}
      <section className="space-y-6">
        <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">POLARIZATION INDEX</span>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-industrial-border p-6 rounded-xl space-y-4 mb-4">
          <table className="w-full text-xs font-mono border border-industrial-border border-collapse mb-0" style={{ tableLayout: 'fixed' }}>
            <tbody>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" style={{ width: '20%' }}>Date:</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center" style={{ width: '20%' }}><Field id="lv_pi_date" type="date" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" style={{ width: '10%' }}>Time:</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center" style={{ width: '15%' }}><Field id="lv_pi_time" type="time" className="text-center" /></td>
                <td className="p-2 bg-slate-100 font-bold text-center" style={{ width: '35%' }}>Details of Insulation Tester</td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Ambiant Temp (&deg;C):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="lv_pi_amb_temp" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Make:</td>
                <td className="p-1 bg-white text-center"><Field id="lv_pi_make" placeholder="MEGGER" className="text-center" /></td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Top Oil Temp (&deg;C):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="lv_pi_top_oil" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Sr. No:</td>
                <td className="p-1 bg-white text-center"><Field id="lv_pi_sr_no" placeholder="A01148D22" className="text-center" /></td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Bottom Oil Temp (&deg;C):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="lv_pi_bottom_oil" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Range:</td>
                <td className="p-1 bg-white text-center"><Field id="lv_pi_range" placeholder="1-TO-5 Kv" className="text-center" /></td>
              </tr>
              <tr className="border-b border-industrial-border">
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Avg. Oil Temp (⁰C):</td>
                <td className="p-1 border-r border-industrial-border bg-slate-50 text-center"><Field id="lv_pi_avg_oil" placeholder="" readOnly={true} className="text-center font-bold bg-slate-50" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}>Voltage Level (V):</td>
                <td className="p-1 bg-white text-center"><Field id="lv_pi_applied" placeholder="" className="text-center" /></td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center">Relative Humidity (%):</td>
                <td className="p-1 border-r border-industrial-border bg-white text-center"><Field id="lv_pi_humidity" placeholder="" className="text-center" /></td>
                <td className="p-2 bg-slate-50 border-r border-industrial-border font-bold text-center" colSpan={2}></td>
                <td className="p-1 bg-white text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm mt-4">
          <table className="w-full text-xs font-mono text-center border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-slate-200 border-b border-industrial-border font-bold">
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider" style={{ width: '25%' }}>WINDING -EARTH</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>15 Sec (M&Omega;)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>60 Sec (M&Omega;)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>600 Sec (M&Omega;)</th>
                <th className="p-3 border-r border-industrial-border text-center text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>Ratio of 60 Sec/<br/>15 Sec</th>
                <th className="p-3 text-center text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>Ratio of 600 Sec/<br/>60 Sec</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-r border-industrial-border bg-slate-50 font-bold text-center">
                  WINDING - EARTH
                </td>
                <td className="p-1 border-r border-industrial-border bg-white text-center">
                  <Field id="lv_pi_15s" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white text-center">
                  <Field id="lv_pi_60s" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-white text-center">
                  <Field id="lv_pi_600s" placeholder="" className="text-center" />
                </td>
                <td className="p-1 border-r border-industrial-border bg-slate-50 text-center">
                  <Field id="lv_pi_ir_ratio" placeholder="-" className="text-center font-bold bg-slate-50 text-industrial-accent" readOnly={true} />
                </td>
                <td className="p-1 bg-slate-50 text-center">
                  <Field id="lv_pi_pi_ratio" placeholder="-" className="text-center font-bold bg-slate-50 text-industrial-accent" readOnly={true} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.offered_by || ''}
              onChange={(e) => handleFieldChange('offered_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="offered_date" placeholder="Date" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="tested_date" placeholder="Date" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <Field id="authorized_date" placeholder="Date" className="text-[10px] mt-1 text-center" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
        </div>
      </div>
    </div>
    </FormContext.Provider>
  );
}

function TwoKVTestForm({ test, onUpdate }: { test: TransformerTest, onUpdate: (data: Record<string, string>) => void }) {
  const data = test.observationData || {};
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const handleFieldChange = (key: string, value: string) => {
    onUpdate({ ...data, [key]: value });
  };

  const SECTIONS = ['HORIZANTAL', 'VERTICAL'] as const;
  const ROWS = ['CORE-FRAME', 'FRAME-FRAME'] as const;

  return (
    <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
      {/* Test Tables */}
      {SECTIONS.map((section) => (
        <section key={section} className="border border-industrial-border rounded-xl overflow-hidden">
          <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center gap-3">
            <Cpu size={16} className="text-industrial-accent" />
            <span className="text-sm font-bold uppercase tracking-widest">{section} - 2KV TESTING</span>
          </div>
          <table className="w-full text-[10px] font-mono">
            <thead className="bg-[#f8fafc] text-industrial-text-muted font-bold uppercase tracking-widest">
              <tr>
                <th className="p-4 border-r border-b border-industrial-border text-left w-48">{section}</th>
                <th className="p-4 border-r border-b border-industrial-border text-center normal-case">voltage applied (kV)</th>
                <th className="p-4 border-r border-b border-industrial-border text-center">DURATION (Sec)</th>
                <th className="p-4 border-b border-industrial-border text-center normal-case">leakage current (mA)</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row} className="hover:bg-industrial-bg/10 transition-colors">
                  <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/20">{row}</td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`2kv_${section.toLowerCase()}_${row.toLowerCase().replace('-', '_')}_voltage`} pdfValue="2" />
                  </td>
                  <td className="p-1 border-r border-b border-industrial-border">
                    <Field id={`2kv_${section.toLowerCase()}_${row.toLowerCase().replace('-', '_')}_duration`} pdfValue="60" />
                  </td>
                  <td className="p-1 border-b border-industrial-border">
                    <Field id={`2kv_${section.toLowerCase()}_${row.toLowerCase().replace('-', '_')}_leakage`} placeholder="Enter mA" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.tested_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.tested_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY (TESTED)</p>
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.reviewed_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.reviewed_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY (REVIEWED)</p>
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {data.authorized_at && <div className="text-[10px] text-industrial-text-muted mt-1 italic">{data.authorized_at}</div>}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY (AUTHORIZED)</p>
        </div>
      </div>
    </div>
  );
}

function PrePostVpdServicingForm({ test, onUpdate }: { test: TransformerTest, onUpdate: (data: Record<string, string>) => void }) {
  const data = test.observationData || {};
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const PROCESSES = ['PRE-SERVICING', 'POST-SERVICING'] as const;
  const MAG_ROWS = ['1.1-2.1', '2-2.1', '1.1-2'] as const;
  const TEST_2KV_ROWS = ['CORE-FRAME', 'FRAME-FRAME'] as const;
  const TEST_2KV_DISPLAY: Record<string, string> = {
    'CORE-FRAME': 'Core- Frame',
    'FRAME-FRAME': 'Frame-Frame'
  };

  useEffect(() => {
    let changed = false;
    const updated = { ...data };
    PROCESSES.forEach(proc => {
      const p = proc.toLowerCase();
      if (updated[`${p}_ir_ratio`] === undefined) {
        const v15 = parseFloat(updated[`${p}_ir_15s`] || '');
        const v60 = parseFloat(updated[`${p}_ir_60s`] || '');
        if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
          updated[`${p}_ir_ratio`] = (v60 / v15).toFixed(2);
        } else {
          updated[`${p}_ir_ratio`] = '-';
        }
        changed = true;
      }

      // Initialize 2 KV applied voltage (2) and duration (60)
      TEST_2KV_ROWS.forEach(row => {
        const vKey = `${p}_2kv_${row}_v`;
        const secKey = `${p}_2kv_${row}_sec`;
        if (updated[vKey] !== '2') {
          updated[vKey] = '2';
          changed = true;
        }
        if (updated[secKey] !== '60') {
          updated[secKey] = '60';
          changed = true;
        }
      });

      // Initialize magnetising current applied voltage to 200 if empty
      MAG_ROWS.forEach(row => {
        const magVKey = `${p}_mag_${row}_v`;
        if (!updated[magVKey]) {
          updated[magVKey] = '200';
          changed = true;
        }
      });
    });
    if (changed) {
      onUpdate(updated);
    }
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };
    PROCESSES.forEach(proc => {
      const p = proc.toLowerCase();
      if (key === `${p}_ir_15s` || key === `${p}_ir_60s`) {
        const v15 = parseFloat(updated[`${p}_ir_15s`] || '');
        const v60 = parseFloat(updated[`${p}_ir_60s`] || '');
        if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
          updated[`${p}_ir_ratio`] = (v60 / v15).toFixed(2);
        } else {
          updated[`${p}_ir_ratio`] = '-';
        }
      }
    });
    onUpdate(updated);
  };

  return (
    <FormContext.Provider value={{ data, handleFieldChange, currentRole, styleMode: ctx?.styleMode }}>
      <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
        {/* Equipment Details */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-industrial-bg/10 p-6 rounded-xl border border-industrial-border">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-industrial-border pb-2 mb-4">
              <HardDrive size={14} className="text-industrial-accent" />
              <h4 className="text-xs font-bold text-industrial-accent uppercase tracking-widest">Insulation Tester</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Make</span>
                <Field id="vpd_tester_make" pdfValue="MEGGER" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Range</span>
                <Field id="vpd_tester_range" pdfValue="1-TO-5 kV" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Sr. No</span>
                <Field id="vpd_tester_sr_no" pdfValue="101979324" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Voltage Level</span>
                <Field id="vpd_tester_v_level" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-industrial-border pb-2 mb-4">
              <Cpu size={14} className="text-industrial-accent" />
              <h4 className="text-xs font-bold text-industrial-accent uppercase tracking-widest">Multimeter Details</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Make</span>
                <Field id="vpd_meter_make" pdfValue="HTC" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Sr. No</span>
                <Field id="vpd_meter_sr_no" pdfValue="HTC2201CG0011" />
              </div>
            </div>
          </div>
        </section>

        {PROCESSES.map((process) => (
          <section key={process} className="space-y-8 border-t pt-8 border-industrial-border first:border-0 first:pt-0">
            <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer size={16} className="text-industrial-accent" />
                <span className="text-sm font-bold uppercase tracking-widest">{process} TESTING</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-industrial-bg/5 p-4 rounded-lg">
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Date</span>
                 <Field id={`${process.toLowerCase()}_date`} type="date" placeholder="DD/MM/YYYY" />
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Time</span>
                 <Field id={`${process.toLowerCase()}_time`} type="time" placeholder="HH:MM" />
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Amb. Temp (⁰C)</span>
                 <Field id={`${process.toLowerCase()}_amb_temp`} />
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Wdg. Temp. (⁰C)</span>
                 <Field id={`${process.toLowerCase()}_wdg_temp`} />
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Relative Humidity (%)</span>
                 <Field id={`${process.toLowerCase()}_humidity`} />
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-industrial-text-muted uppercase">Core Temp. (⁰C)</span>
                 <Field id={`${process.toLowerCase()}_core_temp`} />
               </div>
            </div>

            <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
               <table className="w-full text-xs font-mono border-collapse">
                 <thead>
                   <tr className="bg-[#f8fafc] text-industrial-text-muted uppercase border-b border-industrial-border">
                     <th className="p-4 border-r border-industrial-border text-left font-bold w-1/4">COMBINATION</th>
                     <th className="p-4 border-r border-industrial-border text-center font-bold w-1/4">15 SEC (MΩ)</th>
                     <th className="p-4 border-r border-industrial-border text-center font-bold w-1/4">60 SEC (MΩ)</th>
                     <th className="p-4 text-center font-bold w-1/4">RATIO (60/15S)</th>
                   </tr>
                 </thead>
                 <tbody>
                    <tr>
                      <td className="p-4 border-r border-industrial-border font-bold bg-industrial-bg/10 uppercase">WINDING-EARTH</td>
                      <td className="p-1 border-r border-industrial-border">
                         <Field id={`${process.toLowerCase()}_ir_15s`} placeholder="-" />
                      </td>
                      <td className="p-1 border-r border-industrial-border">
                         <Field id={`${process.toLowerCase()}_ir_60s`} placeholder="-" />
                      </td>
                      <td className="p-1">
                         <Field id={`${process.toLowerCase()}_ir_ratio`} pdfValue="-" placeholder="-" className="text-center font-bold" />
                      </td>
                    </tr>
                  </tbody>
               </table>
            </div>

            <div className="border border-industrial-border rounded-xl overflow-hidden">
              <div className="bg-industrial-bg/50 px-4 py-2 border-b border-industrial-border font-bold text-xs uppercase">MAGNETISING CURRENT TEST (1Φ 200V)</div>
              <table className="w-full text-[10px] font-mono">
                <thead className="bg-[#f8fafc] text-industrial-text-muted">
                  <tr className="border-b border-industrial-border">
                    <th className="p-3 border-r text-left w-1/3"></th>
                    <th className="p-3 border-r text-center w-1/3 font-bold text-xs">
                      Applied Voltage (V)<br />
                      <span className="text-[10px] font-normal uppercase tracking-tight">(1Φ 200 VOLT APPLIED )</span>
                    </th>
                    <th className="p-3 text-center w-1/3 font-bold text-xs">
                      Measured Current (mA)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MAG_ROWS.map((row) => (
                    <tr key={row}>
                      <td className="p-3 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{row}</td>
                      <td className="p-1 border-r border-b border-industrial-border">
                         <Field id={`${process.toLowerCase()}_mag_${row}_v`} pdfValue="200" />
                      </td>
                      <td className="p-1 border-b border-industrial-border">
                         <Field id={`${process.toLowerCase()}_mag_${row}_ma`} placeholder="Enter mA" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-industrial-border rounded-xl overflow-hidden">
              <div className="bg-industrial-bg/50 px-4 py-2 border-b border-industrial-border font-bold text-xs uppercase">2 KV TEST</div>
              <table className="w-full text-[10px] font-mono">
                <thead className="bg-[#f8fafc] text-industrial-text-muted">
                  <tr className="border-b border-industrial-border">
                     <th className="p-3 border-r text-left w-1/3"></th>
                     <th className="p-3 border-r text-center w-1/3 font-bold text-xs">Voltage Applied (kV)</th>
                     <th className="p-3 border-r text-center w-1/3 font-bold text-xs">Duration (Sec)</th>
                     <th className="p-3 text-center w-1/3 font-bold text-xs">Leakage Current (mA)</th>
                  </tr>
                </thead>
                <tbody>
                  {TEST_2KV_ROWS.map((row) => (
                    <tr key={row}>
                      <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10">{TEST_2KV_DISPLAY[row] || row}</td>
                      <td className="p-1 border-r border-b border-industrial-border text-center">
                         <Field id={`${process.toLowerCase()}_2kv_${row}_v`} pdfValue="2" readOnly={true} className="text-center font-bold" />
                      </td>
                      <td className="p-1 border-r border-b border-industrial-border text-center">
                         <Field id={`${process.toLowerCase()}_2kv_${row}_sec`} pdfValue="60" readOnly={true} className="text-center font-bold" />
                      </td>
                      <td className="p-1 border-b border-industrial-border text-center">
                         <Field id={`${process.toLowerCase()}_2kv_${row}_ma`} placeholder="Enter mA" className="text-center" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* Signature Section */}
        <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="border-b border-industrial-border pb-4 mb-2">
              <select 
                className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
                value={data.tested_by || ''}
                onChange={(e) => handleFieldChange('tested_by', e.target.value)}
              >
                <option value="">Select Technician</option>
                {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Field id="tested_date" placeholder="Date" className="text-[10px] mt-1" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
          </div>
          
          <div className="text-center">
            <div className="border-b border-industrial-border pb-4 mb-2">
              <select 
                className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
                value={data.reviewed_by || ''}
                onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
                disabled={currentRole === 'Admin_Tested'}
              >
                <option value="">Select Reviewer</option>
                {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Field id="reviewed_date" placeholder="Date" className="text-[10px] mt-1" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
          </div>

          <div className="text-center">
            <div className="border-b border-industrial-border pb-4 mb-2">
              <select 
                className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
                value={data.authorized_by || ''}
                onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
                disabled={currentRole === 'Admin_Tested'}
              >
                <option value="">Select Authorizer</option>
                {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Field id="authorized_date" placeholder="Date" className="text-[10px] mt-1" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
          </div>
        </div>
      </div>
    </FormContext.Provider>
  );
}

function OilSoakingServicingForm({ test, onUpdate }: { test: TransformerTest, onUpdate: (data: Record<string, string>) => void }) {
  const data = test.observationData || {};
  const ctx = useContext(FormContext);
  const currentRole = ctx?.currentRole || 'Admin_Tested';

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...data, [key]: value };
    if (key === 'tested_by') {
      updated['tested_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'reviewed_by') {
      updated['reviewed_date'] = value ? new Date().toLocaleString() : '';
    }
    if (key === 'authorized_by') {
      updated['authorized_date'] = value ? new Date().toLocaleString() : '';
    }
    onUpdate(updated);
  };

  const STAGES = ['BEFORE', 'AFTER'] as const;
  const ROWS = ['Core- Frame', 'Frame-Frame', 'Frame-Tank', 'CORE-Tank'] as const;

  useEffect(() => {
    let changed = false;
    const updated = { ...data };

    STAGES.forEach((stage) => {
      ROWS.forEach((row) => {
        const vKey = `${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_v`;
        const secKey = `${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_sec`;
        if (updated[vKey] !== '1') {
          updated[vKey] = '1';
          changed = true;
        }
        if (updated[secKey] !== '60') {
          updated[secKey] = '60';
          changed = true;
        }
      });
    });

    if (changed) {
      onUpdate(updated);
    }
  }, []);

  return (
    <div className="space-y-12 bg-white p-8 rounded-xl border border-industrial-border shadow-inner">
      <CompanyHeader />
      {/* Header Equipment Details */}
      <section className="bg-industrial-bg/10 p-6 rounded-xl border border-industrial-border">
        <h4 className="text-xs font-bold text-industrial-accent uppercase tracking-widest border-b border-industrial-border pb-2 mb-4">Details of Insulation Tester</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Field id="oil_tester_make" pdfValue="MEGGER" label="Make" />
          <Field id="oil_tester_range" pdfValue="1-TO-5 kV" label="Range" />
          <Field id="oil_tester_sr_no" pdfValue="A01148D22" label="Sr. No" />
          <Field id="oil_tester_v_level" pdfValue="1000V" label="Voltage Level" />
        </div>
      </section>

      <div className="bg-green-600 text-white text-center py-2 font-bold uppercase tracking-[0.3em] rounded shadow-sm">
        IR TEST
      </div>

      {STAGES.map((stage) => (
        <section key={stage} className="space-y-6">
          <div className="bg-industrial-bg px-6 py-3 border-b border-industrial-border flex items-center justify-center">
            <span className="text-sm font-black uppercase tracking-[0.2em]">{stage} SERVICING</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-industrial-bg/5 p-4 rounded-lg border border-industrial-border">
             <Field id={`${stage.toLowerCase()}_date`} type="date" label="Date" placeholder="DD/MM/YYYY" />
             <Field id={`${stage.toLowerCase()}_time`} type="time" label="Time" placeholder="HH:MM" />
             <Field id={`${stage.toLowerCase()}_amb_temp`} label="Amb. Temp (⁰C)" />
             <Field id={`${stage.toLowerCase()}_wdg_temp`} label="Wdg. Temp (⁰C)" />
             <Field id={`${stage.toLowerCase()}_humidity`} label="Relative Humidity (%)" />
             <Field id={`${stage.toLowerCase()}_core_temp`} label="Core Temp (⁰C)" />
          </div>

          <div className="border border-industrial-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#f8fafc] text-industrial-text-muted uppercase">
                <tr>
                   <th className="p-4 border-r border-b border-industrial-border text-left"></th>
                   <th className="p-4 border-r border-b border-industrial-border text-center normal-case">voltage applied (kV)</th>
                   <th className="p-4 border-r border-b border-industrial-border text-center">Duration (Sec)</th>
                   <th className="p-4 border-b border-industrial-border text-center">MΩ</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row}>
                    <td className="p-4 border-r border-b border-industrial-border font-bold bg-industrial-bg/10 text-center">{row}</td>
                    <td className="p-1 border-r border-b border-industrial-border">
                       <Field 
                         id={`${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_v`} 
                         pdfValue="1" 
                         readOnly={true}
                       />
                    </td>
                    <td className="p-1 border-r border-b border-industrial-border">
                       <Field 
                         id={`${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_sec`} 
                         pdfValue="60" 
                         readOnly={true}
                       />
                    </td>
                    <td className="p-1 border-b border-industrial-border">
                       <Field id={`${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_mohm`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Signature Section */}
      <div className="mt-8 pt-8 border-t border-industrial-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.tested_by || ''}
              onChange={(e) => handleFieldChange('tested_by', e.target.value)}
            >
              <option value="">Select Technician</option>
              {NAMES_TECHNICIANS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">TESTED BY</p>
          <Field id="tested_date" placeholder="Date" className="text-[10px] mt-1" />
        </div>
        
        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.reviewed_by || ''}
              onChange={(e) => handleFieldChange('reviewed_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Reviewer</option>
              {NAMES_REVIEWERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">REVIEWED BY</p>
          <Field id="reviewed_date" placeholder="Date" className="text-[10px] mt-1" />
        </div>

        <div className="text-center">
          <div className="border-b border-industrial-border pb-4 mb-2">
            <select 
              className="w-full text-center bg-transparent font-bold text-industrial-text uppercase outline-none text-xs"
              value={data.authorized_by || ''}
              onChange={(e) => handleFieldChange('authorized_by', e.target.value)}
              disabled={currentRole === 'Admin_Tested'}
            >
              <option value="">Select Authorizer</option>
              {NAMES_AUTHORIZERS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-text-muted">AUTHORIZED BY</p>
          <Field id="authorized_date" placeholder="Date" className="text-[10px] mt-1" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>('LOGIN');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin_Tested');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<JobStatus>('Processing');
  const [filterCapacity, setFilterCapacity] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [currentSelection, setCurrentSelection] = useState<{
    capacity?: TransformerCapacity;
    type?: TransformerType;
  }>({});
  const [jobName, setJobName] = useState('');

  // Load jobs from local storage
  useEffect(() => {
    const savedJobs = localStorage.getItem(JOBS_STORAGE_KEY);
    if (savedJobs) {
      try {
        setJobs(JSON.parse(savedJobs));
      } catch (e) {
        console.error('Failed to parse jobs', e);
      }
    }
  }, []);

  // Save jobs to local storage
  useEffect(() => {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDownloadTestReport = (job: Job, test: TransformerTest) => {
    const testData = test.observationData || {};
    const ratingNameplateRowsHtml = renderJobRatingNameplateRows(job);

    const testFormRenderedHtml = getTestFormHtml(test.name, testData, { type: job.type, capacity: job.capacity });

    let pdfTestedBy = testData.tested_by || 'Field Tech';
    let pdfReviewedBy = testData.reviewed_by || 'Quality Inspector';
    let pdfAuthorizedBy = testData.authorized_by || 'Lead Engineer';

    let pdfTestedDate = testData.tested_at || testData.tested_date || new Date(test.updatedAt).toLocaleString();
    let pdfReviewedDate = testData.reviewed_at || testData.reviewed_date || new Date(test.updatedAt).toLocaleString();
    let pdfAuthorizedDate = testData.authorized_at || testData.authorized_date || new Date().toLocaleString();

    if (test.name.toUpperCase() === 'FINAL LV TEST REPORT') {
      pdfTestedBy = testData.offered_by || 'Field Tech';
      pdfReviewedBy = testData.tested_by || 'Quality Inspector';
      pdfAuthorizedBy = testData.authorized_by || 'Lead Engineer';

      pdfTestedDate = testData.offered_date || pdfTestedDate;
      pdfReviewedDate = testData.tested_date || pdfReviewedDate;
      pdfAuthorizedDate = testData.authorized_date || pdfAuthorizedDate;
    } else if (test.name.toUpperCase() === 'POST-CONNECTION TEST') {
      pdfTestedBy = testData.pct_tested_by || 'Field Tech';
      pdfReviewedBy = testData.pct_reviewed_by || 'Quality Inspector';
      pdfAuthorizedBy = testData.pct_authorized_by || 'Lead Engineer';

      pdfTestedDate = testData.pct_tested_date || pdfTestedDate;
      pdfReviewedDate = testData.pct_reviewed_date || pdfReviewedDate;
      pdfAuthorizedDate = testData.pct_authorized_date || pdfAuthorizedDate;
    } else if (test.name.toUpperCase() === 'POST-TANKING TEST') {
      pdfTestedBy = testData.pt_tested_by || 'Field Tech';
      pdfReviewedBy = testData.pt_reviewed_by || 'Quality Inspector';
      pdfAuthorizedBy = testData.pt_authorized_by || 'Lead Engineer';

      pdfTestedDate = testData.pt_tested_date || pdfTestedDate;
      pdfReviewedDate = testData.pt_reviewed_date || pdfReviewedDate;
      pdfAuthorizedDate = testData.pt_authorized_date || pdfAuthorizedDate;
    } else if (test.name.toUpperCase() === 'CHECKLIST FOR TFR BEFORE HV') {
      pdfTestedBy = testData.tested_by || 'Field Tech';
      pdfReviewedBy = testData.reviewed_by || 'Quality Inspector';
      pdfAuthorizedBy = testData.authorized_by || 'Lead Engineer';

      pdfTestedDate = testData.tested_date || pdfTestedDate;
      pdfReviewedDate = testData.reviewed_date || pdfReviewedDate;
      pdfAuthorizedDate = testData.authorized_date || pdfAuthorizedDate;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vishvas Power - Test Report: ${test.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            industrial: {
              bg: '#F8FAFC',
              card: '#FFFFFF',
              accent: '#2563EB',
              border: '#E2E8F0',
              text: '#1E293B',
              'text-muted': '#64748B',
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    button.print-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
      transition: background-color 0.2s;
    }

    button.print-btn:hover {
      background-color: #1d4ed8;
    }

    .no-print {
      margin-bottom: 30px;
      background: white;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 50px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }

    .header-logo {
      height: 70px;
      object-fit: contain;
      margin-bottom: 16px;
    }

    .corp-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0;
    }

    .corp-address {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: #64748b;
      margin-top: 6px;
      margin-bottom: 24px;
      text-transform: uppercase;
    }

    .divider {
      height: 3px;
      background-color: #2563eb;
      margin-bottom: 30px;
    }

    .report-title-card {
      background-color: #f1f5f9;
      border-left: 5px solid #2563eb;
      padding: 16px 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-title-card h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
    }

    .status-badge {
      background-color: #d1fae5;
      color: #065f46;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid #a7f3d0;
    }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #2563eb;
      margin-top: 30px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }

    td {
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }

    .stamp-container {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 50px;
      border-top: 1px solid #e2e8f0;
      padding-top: 30px;
    }

    .stamp-box {
      background-color: #fbfbfb;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }

    .stamp-box .title {
      font-size: 9px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }

    .stamp-box .signature {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 4px;
    }

    .stamp-box .date {
      font-size: 9px;
      color: #94a3b8;
    }

${PDF_PRINT_STYLES}
  </style>
</head>
<body>

  <div class="no-print" style="max-width: 900px; margin: 0 auto 30px auto;">
    <div>
      <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">Print-Ready Report Connected Object</h4>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Save as a premium PDF or print directly from your browser.</p>
    </div>
    <button class="print-btn" onclick="window.print()">
      <svg width="16" height="16" fill="white" viewBox="0 0 24 24" style="margin-right: 4px;"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
      Print Report
    </button>
  </div>

  <div class="report-container">
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
      <div>
        <img src="https://apivishvaspower.com/logo.png" alt="Vishvas Logo" style="height: 60px; max-width: 240px; object-fit: contain;" />
      </div>
      <div style="text-align: right;">
        <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e3a8a;">M/S VISHVAS POWER ENGINEERING SERVICES (P) LTD.</h1>
        <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; font-weight: 500;">
          Plot no K5 Five Star Industrial area, MIDC, Bori, Maharashtra 441122<br/>
          E-mail: <span style="text-decoration: underline;">testing@vishvaspower.co.in</span>
        </p>
      </div>
    </div>

    <!-- Title Badge -->
    <div style="background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 20px; font-size: 15px; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 30px; letter-spacing: 0.05em;">
      TECHNICAL TEST MEMORANDUM OF WORK - ${test.name}
    </div>

    <!-- Complete Job Rating & Nameplate -->
    <div style="display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 14px;">
      <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #2563eb; margin: 0;">JOB RATING &amp; NAMEPLATE</h3>
      <div style="font-size: 11px; font-weight: 800; color: #1e293b;">
        ${job.capacity} &nbsp; ${job.type.toUpperCase()} TYPE
      </div>
    </div>
    <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 30px;" border="1" cellpadding="8" cellspacing="0" bordercolor="#e2e8f0">
      <tr>
        <td style="font-weight: 600; color: #475569; width: 25%;">Transformer Name</td>
        <td style="font-weight: 700; color: #0F172A; width: 25%;">${job.name}</td>
        <td style="font-weight: 600; color: #475569; width: 25%;">Capacity</td>
        <td style="font-weight: 700; color: #0F172A; width: 25%;">${job.capacity}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #475569;">Transformer Type</td>
        <td colspan="3" style="font-weight: 700; color: #0F172A;">${job.type}</td>
      </tr>
      ${ratingNameplateRowsHtml}
    </table>

    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #2563eb; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 30px 0 20px;">
      Test Observations & Measured Values
    </div>

    <!-- Active High-Fidelity Test Content -->
    <div class="test-form-wrapper mb-10 text-left">
      ${testFormRenderedHtml}
    </div>

    <!-- Signature Logs / Seal Blocks -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 50px; page-break-inside: avoid;">
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4f46e5; border-bottom: 1px solid #e1e7f0; padding-bottom: 6px; margin-bottom: 8px;">1. Done (Tested)</div>
        <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #1e1b4b; height: 32px; display: flex; align-items: center; justify-content: center;">✓ ${pdfTestedBy}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">${pdfTestedDate}</div>
      </div>
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0891b2; border-bottom: 1px solid #e1e7f0; padding-bottom: 6px; margin-bottom: 8px;">2. Checked (Reviewed)</div>
        <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #164e63; height: 32px; display: flex; align-items: center; justify-content: center;">✓ ${pdfReviewedBy}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">${pdfReviewedDate}</div>
      </div>
      <div style="border: 1px solid #10b981; background-color: #ecfdf5; border-radius: 8px; padding: 14px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #065f46; border-bottom: 1px solid #d1fae5; padding-bottom: 6px; margin-bottom: 8px;">3. Authorized (Final)</div>
        <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #064e3b; height: 32px; display: flex; align-items: center; justify-content: center;">✓ ${pdfAuthorizedBy}</div>
        <div style="font-size: 9px; color: #059669; margin-top: 4px;">${pdfAuthorizedDate}</div>
      </div>
    </div>

    <p style="text-align: center; font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
      This is an official technical record generated by M/S VISHVAS POWER system under security clearance protocols.
    </p>

  </div>

</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VISHVAS_REPORT_${test.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_JOB_${job.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setToast({
      message: `${test.name} report downloaded!`,
      type: 'success'
    });
  };

  const handleDownloadJobCard = (job: Job) => {
    let ratingRowsHtml = '';
    getJobRatingNameplateFields(job).forEach(item => {
      ratingRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; font-weight: 600; color: #475569; width: 40%; text-transform: uppercase; font-size: 11px;">${item.label}</td>
          <td style="padding: 10px 14px; font-family: monospace; font-size: 13px; color: #0f172a; font-weight: bold;">${item.value || '-'}</td>
        </tr>
      `;
    });

    let testsRowsHtml = '';
    job.tests.forEach((test, idx) => {
      const testData = test.observationData || {};
      
      let stageLabel = test.stage;
      let badgeStyle = "background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;";
      
      if (test.stage === 'Authorized') {
        badgeStyle = "background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;";
      } else if (test.stage === 'Reviewed') {
        badgeStyle = "background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;";
      } else if (test.stage === 'Tested') {
        badgeStyle = "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;";
      }

      const testKeysLength = Object.keys(testData).filter(k => !k.includes('_at') && !k.includes('_by')).length;
      const filledText = testKeysLength > 0 ? `<span style="color: #059669; font-weight: 600;">Filled (${testKeysLength} values)</span>` : `<span style="color: #64748b;">No values filled</span>`;

      testsRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 14px; font-weight: 600; color: #0f172a; font-size: 13px;">${idx + 1}. ${test.name}</td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; ${badgeStyle}">
              ${stageLabel}
            </span>
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #334155;">${filledText}</td>
          <td style="padding: 12px 14px; font-size: 11px; color: #64748b; font-family: monospace;">
            ${testData.tested_by ? `Tested: ${testData.tested_by}` : ''}
            ${testData.reviewed_by ? `<br/>Reviewed: ${testData.reviewed_by}` : ''}
            ${testData.authorized_by ? `<br/>Auth: ${testData.authorized_by}` : ''}
            ${!testData.tested_by && !testData.reviewed_by && !testData.authorized_by ? '-' : ''}
          </td>
        </tr>
      `;
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vishvas Power - Job Dossier: ${job.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    button.print-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background-color: #059669;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);
      transition: background-color 0.2s;
    }

    button.print-btn:hover {
      background-color: #047857;
    }

    .no-print {
      margin-bottom: 30px;
      background: white;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 50px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }

    .header-logo {
      height: 70px;
      object-fit: contain;
      margin-bottom: 16px;
    }

    .corp-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0;
    }

    .corp-address {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: #64748b;
      margin-top: 6px;
      margin-bottom: 24px;
      text-transform: uppercase;
    }

    .divider {
      height: 3px;
      background-color: #059669;
      margin-bottom: 30px;
    }

    .report-title-card {
      background-color: #f1f5f9;
      border-left: 5px solid #059669;
      padding: 16px 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-title-card h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
    }

    .status-badge {
      background-color: ${job.status === 'Completed' ? '#d1fae5' : '#dbeafe'};
      color: ${job.status === 'Completed' ? '#065f46' : '#1e40af'};
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid ${job.status === 'Completed' ? '#a7f3d0' : '#bfdbfe'};
    }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #059669;
      margin-top: 30px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }

    td {
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }

${PDF_PRINT_STYLES}
  </style>
</head>
<body>

  <div class="no-print" style="max-width: 900px; margin: 0 auto 30px auto;">
    <div>
      <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">Print-Ready Master Dossier</h4>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Includes full transformer specifications and all protocol statuses.</p>
    </div>
    <button class="print-btn" onclick="window.print()">
      <svg width="16" height="16" fill="white" viewBox="0 0 24 24" style="margin-right: 4px;"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
      Print Dossier
    </button>
  </div>

  <div class="report-container">
    <div style="text-align: center;">
      <img src="https://apivishvaspower.com/logo.png" alt="Vishvas Power Logo" class="header-logo" />
      <h1 class="corp-title">M/S VISHVAS POWER ENGINEERING SERVICES (P) LTD</h1>
      <p class="corp-address">Plot no K5 Five Star Industrial area, MIDC, Bori, Maharashtra 441122<br/>E-mail: testing@vishvaspower.co.in</p>
    </div>

    <div class="divider"></div>

    <div class="report-title-card">
      <div>
        <p style="margin: 0; font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase;">Job Dossier Log</p>
        <h2>${job.name}</h2>
      </div>
      <span class="status-badge">${job.status}</span>
    </div>

    <div class="section-title">
      Transformer Nameplate & Rating Specifications
    </div>
    
    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="width: 40%;">Specification Field</th>
          <th style="width: 60%;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${ratingRowsHtml}
      </tbody>
    </table>

    <div class="section-title">
      Comprehensive Test Verification Protocol
    </div>

    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="width: 45%">Test Name</th>
          <th style="width: 15%; text-align: center;">Testing Stage</th>
          <th style="width: 15%">Data Status</th>
          <th style="width: 25%">Sign-Off Authority Logs</th>
        </tr>
      </thead>
      <tbody>
        ${testsRowsHtml}
      </tbody>
    </table>

    <p style="text-align: center; font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
      This dossier was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} by the Vishvas Power System.
    </p>

  </div>

</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VISHVAS_JOB_${job.id.slice(0, 8)}_DOSSIER.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setToast({
      message: `${job.name} master dossier downloaded!`,
      type: 'success'
    });
  };

  const handleLogin = () => setView('DASHBOARD');
  const handleStartWorkflow = () => setView('SELECT_TYPE');
  
  const handleSelectType = (type: TransformerType) => {
    setCurrentSelection(prev => ({ ...prev, type }));
    setView('SELECT_CAPACITY');
  };

  const handleSelectCapacity = (capacity: TransformerCapacity) => {
    setCurrentSelection(prev => ({ ...prev, capacity }));
    // Auto-pre-populate job name as example
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setJobName(`V/M/${randNum}`);
    setView('NAME_JOB');
  };

  const handleSaveJob = () => {
    if (!jobName.trim()) return;
    
    const initialTests: TransformerTest[] = TEST_NAMES.map(name => ({
      id: crypto.randomUUID(),
      name,
      stage: 'Not Started',
      accepted: false,
      updatedAt: Date.now(),
      ...(name === 'CT TEST' && currentSelection.type === 'Auto' && (currentSelection.capacity === '12.3MVA' || currentSelection.capacity === '16.5MVA')
        ? { observationData: seedCTNameplateDefaults({}, currentSelection.type, currentSelection.capacity) }
        : {})
    }));

    const matches = jobName.match(/\d+/g);
    const jobNumber = matches && matches.length > 0 ? matches[matches.length - 1] : '';
    const autoSrNo = jobNumber ? `V/M/${jobNumber}` : '';

    const ratingDefaults = getJobRatingDefaults(currentSelection.type!, currentSelection.capacity!);
    const shouldUseFixedAuto165SrNo = currentSelection.type === 'Auto' && currentSelection.capacity === '16.5MVA';
    const newJob: Job = {
      id: crypto.randomUUID(),
      name: jobName,
      capacity: currentSelection.capacity!,
      type: currentSelection.type!,
      createdAt: Date.now(),
      status: 'Processing',
      tests: initialTests,
      ratingData: {
        ...ratingDefaults,
        rating_sr_no: shouldUseFixedAuto165SrNo ? (ratingDefaults.rating_sr_no || '') : (autoSrNo || ratingDefaults.rating_sr_no || '')
      }
    };

    setJobs(prev => [newJob, ...prev]);
    setView('JOB_LIST');
    // Clear selection
    setCurrentSelection({});
    setJobName('');
  };

  const handleUpdateTestStage = (jobId: string, testId: string, targetStage: TestStage) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      
      const updatedTests = job.tests.map(test => {
        if (test.id !== testId) return test;
        
        // Authorization & Sequential Logic
        const canPromote = (
          (currentRole === 'Admin_Tested' && test.stage === 'Not Started' && targetStage === 'Tested') ||
          (currentRole === 'Admin_Reviewed' && test.stage === 'Tested' && targetStage === 'Reviewed') ||
          (currentRole === 'Admin_Authorized' && test.stage === 'Reviewed' && targetStage === 'Authorized')
        );

        if (!canPromote) return test;

        let newObservationData = { ...(test.observationData || {}) };
        const isReportable = test.name.toUpperCase() === 'CT TEST' || test.name.toUpperCase() === 'BUSHING TEST' || test.name.toUpperCase() === '2 KV TEST' || test.name.toUpperCase() === 'PRE-CONNECTION TEST' || test.name.toUpperCase() === 'POST-CONNECTION TEST' || test.name.toUpperCase() === 'PRE & POST VPD SERVICING' || test.name.toUpperCase().includes('OIL SOAKING') || test.name.toUpperCase() === 'POST-TANKING TEST' || test.name.toUpperCase() === 'FINAL LV TEST REPORT' || test.name.toUpperCase() === 'CHECKLIST FOR TFR BEFORE HV' || test.name.toUpperCase() === 'LIST OF HV TEST';

        const now = new Date();
        const nowString = now.toLocaleString();

        // Automatically calculate post-connection signature dates if names are selected
        if (test.name.toUpperCase() === 'POST-CONNECTION TEST') {
          if (newObservationData.pct_tested_by && !newObservationData.pct_tested_date) {
            newObservationData.pct_tested_date = nowString;
          }
          if (targetStage === 'Reviewed' || targetStage === 'Authorized') {
            if (newObservationData.pct_reviewed_by && !newObservationData.pct_reviewed_date) {
              newObservationData.pct_reviewed_date = nowString;
            }
          }
          if (targetStage === 'Authorized') {
            if (newObservationData.pct_authorized_by && !newObservationData.pct_authorized_date) {
              newObservationData.pct_authorized_date = nowString;
            }
          }
        }

        if (targetStage === 'Tested' && isReportable) {
          newObservationData = {
            ...newObservationData,
            tested_at: nowString,
            tested_by: newObservationData.tested_by || ''
          };
          // Automatically open form for Test in next page
          setEditingTestId(testId);
          setView('TEST_REPORT');
        }

        if (targetStage === 'Reviewed' && isReportable) {
          newObservationData = {
            ...newObservationData,
            reviewed_at: nowString,
            reviewed_by: newObservationData.reviewed_by || ''
          };
        }

        if (targetStage === 'Authorized' && isReportable) {
          newObservationData = {
            ...newObservationData,
            authorized_at: nowString,
            authorized_by: newObservationData.authorized_by || ''
          };
        }
        
        return { ...test, stage: targetStage, observationData: newObservationData, updatedAt: Date.now() };
      });

      // Check if all tests are authorized
      const allAuthorized = updatedTests.every(t => t.stage === 'Authorized');
      const newStatus: JobStatus = allAuthorized ? 'Completed' : 'Processing';

      return {
        ...job,
        status: newStatus,
        tests: updatedTests
      };
    }));
  };

  const handleRejectTestStage = (jobId: string, testId: string, targetStage: TestStage) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      
      const updatedTests = job.tests.map(test => {
        if (test.id !== testId) return test;
        
        let newObservationData = { ...(test.observationData || {}) };
        
        if (targetStage === 'Tested') {
          delete newObservationData.reviewed_at;
          delete newObservationData.reviewed_by;
        } else if (targetStage === 'Reviewed') {
          delete newObservationData.authorized_at;
          delete newObservationData.authorized_by;
        } else if (targetStage === 'Not Started') {
          delete newObservationData.tested_at;
          delete newObservationData.tested_by;
          delete newObservationData.reviewed_at;
          delete newObservationData.reviewed_by;
          delete newObservationData.authorized_at;
          delete newObservationData.authorized_by;
        }

        return { ...test, stage: targetStage, observationData: newObservationData, updatedAt: Date.now() };
      });

      const allAuthorized = updatedTests.every(t => t.stage === 'Authorized');
      const newStatus: JobStatus = allAuthorized ? 'Completed' : 'Processing';

      return {
        ...job,
        status: newStatus,
        tests: updatedTests
      };
    }));
  };

  const handleAcceptTestOffer = (jobId: string, testId: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      return {
        ...job,
        tests: job.tests.map(test => {
          if (test.id !== testId) return test;
          return { ...test, accepted: true, updatedAt: Date.now() };
        })
      };
    }));
  };

  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const handleUpdateTestData = (jobId: string, testId: string, data: Record<string, string>) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      return {
        ...job,
        tests: job.tests.map(test => {
          if (test.id !== testId) return test;
          return { ...test, observationData: data, updatedAt: Date.now() };
        })
      };
    }));
  };

  const handleUpdateJobRating = (jobId: string, data: Record<string, string>) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      return {
        ...job,
        ratingData: data
      };
    }));
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const editingTest = selectedJob?.tests.find(t => t.id === editingTestId);

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-industrial-bg text-industrial-text font-sans antialiased">
      {/* Floating Dynamic Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={() => setToast(null)}
            className={`fixed top-16 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-xl cursor-pointer ${
              toast.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-200/10' 
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-200/10'
                : 'bg-blue-50 text-blue-800 border-blue-200 shadow-blue-200/10'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <XCircle size={18} className="text-rose-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-blue-600 shrink-0" />
            )}
            <span className="text-xs font-bold font-sans tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {view !== 'LOGIN' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-industrial-border px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://apivishvaspower.com/logo.png" 
              alt="Vishvas Power Logo" 
              className="h-6 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-industrial-text-muted uppercase font-bold mr-2">Switch Admin Role:</span>
            {(['Admin_Tested', 'Admin_Reviewed', 'Admin_Authorized'] as UserRole[]).map(role => (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${
                  currentRole === role 
                    ? 'bg-industrial-accent text-white border-industrial-accent' 
                    : 'bg-white text-industrial-text-muted border-industrial-border hover:border-industrial-accent/30'
                }`}
              >
                {role.replace('Admin_', '')}
              </button>
            ))}
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        {view === 'LOGIN' && (
          <motion.div 
            key="login"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="login-page"
            className="w-full max-w-md bg-industrial-card border border-industrial-border p-8 rounded-2xl shadow-2xl"
          >
            <div className="flex flex-col items-center justify-center gap-3 mb-8">
              <img 
                src="https://apivishvaspower.com/logo.png" 
                alt="Vishvas Power Logo" 
                className="h-24 object-contain mb-2 filter drop-shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-industrial-text-muted mb-1.5 ml-1">Terminal ID</label>
                <input 
                  type="text" 
                  id="terminal-id"
                  defaultValue="ADMIN_TESTING_01"
                  className="w-full bg-industrial-bg border border-industrial-border rounded-lg px-4 py-3 focus:outline-none focus:border-industrial-accent transition-colors font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-industrial-text-muted mb-1.5 ml-1">Access Protocol</label>
                <input 
                  type="password" 
                  id="password"
                  defaultValue="••••••••"
                  className="w-full bg-industrial-bg border border-industrial-border rounded-lg px-4 py-3 focus:outline-none focus:border-industrial-accent transition-colors font-mono text-sm"
                />
              </div>
              <button 
                id="login-btn"
                onClick={handleLogin}
                className="w-full bg-industrial-accent hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 shadow-sm"
              >
                Initialize System <ArrowRight size={18} />
              </button>
            </div>
            <p className="mt-8 text-center text-sm text-industrial-text-muted">
              Secure Data Management for Testing Department
            </p>
          </motion.div>
        )}

        {view === 'DASHBOARD' && (
          <motion.div 
            key="dashboard"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="dashboard-page"
            className="w-full max-w-4xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-industrial-accent/10 rounded-lg">
                  <LayoutDashboard className="text-industrial-accent" size={20} />
                </div>
                <h2 className="text-xl font-medium">Testing Dashboard</h2>
              </div>
              <button 
                onClick={() => setView('JOB_LIST')}
                className="flex items-center gap-2 text-sm text-industrial-text-muted hover:text-white transition-colors"
              >
                <History size={16} /> History
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <button 
                id="transformer-module-btn"
                onClick={handleStartWorkflow}
                className="group relative bg-industrial-card border border-industrial-border p-8 rounded-2xl hover:border-industrial-accent transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Database size={64} />
                </div>
                <div className="p-3 bg-industrial-accent/10 rounded-xl w-fit mb-4">
                  <HardDrive className="text-industrial-accent" size={24} />
                </div>
                <h3 className="text-lg font-medium mb-1">Transformer Module</h3>
                <p className="text-sm text-industrial-text-muted">Create new testing jobs for power transformers</p>
                <div className="mt-6 flex items-center gap-2 text-industrial-accent font-medium text-sm">
                  Start New Job <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <div className="bg-industrial-card border border-industrial-border border-dashed p-8 rounded-2xl flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed">
                <Settings className="text-industrial-text-muted mb-4" size={32} />
                <h3 className="text-lg font-medium text-industrial-text-muted">Other Modules</h3>
                <p className="text-xs text-industrial-text-muted uppercase tracking-widest mt-1">Under Maintenance</p>
              </div>
            </div>

            {/* Recent Records & Global Activities Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Recent Records Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-industrial-text-muted flex items-center gap-2">
                    <ClipboardList size={16} /> Recent Testing Records
                  </h3>
                  <button 
                    onClick={() => setView('JOB_LIST')}
                    className="text-xs text-industrial-accent hover:underline"
                  >
                    View All
                  </button>
                </div>
                
                <div className="bg-industrial-card border border-industrial-border rounded-xl overflow-hidden shadow-sm">
                  {jobs.length === 0 ? (
                    <div className="p-12 text-center text-industrial-text-muted">
                      <History size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No testing records found. Start a new job above.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-industrial-border">
                      {jobs.slice(0, 5).map((job) => {
                        const counts = {
                          tested: job.tests.filter(t => t.stage === 'Tested' && t.accepted !== false).length,
                          reviewed: job.tests.filter(t => t.stage === 'Reviewed' && t.accepted !== false).length,
                          authorized: job.tests.filter(t => t.stage === 'Authorized' && t.accepted !== false).length,
                          total: job.tests.filter(t => t.accepted !== false).length || 1
                        };
                        
                        const processingTests = job.tests.filter(t => t.accepted !== false && t.stage !== 'Authorized');
                        const completedTests = job.tests.filter(t => t.accepted !== false && t.stage === 'Authorized');

                        let ongoingStageLabel = 'Processing';
                        let stageColor = 'text-amber-500';
                        if (job.status === 'Completed') {
                           ongoingStageLabel = 'Completed';
                           stageColor = 'text-green-500';
                        }

                        return (
                          <button
                            key={job.id}
                            onClick={() => { setSelectedJobId(job.id); setView('JOB_DETAIL'); }}
                            className="w-full flex items-center justify-between p-4 hover:bg-industrial-bg/5 transition-colors text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg bg-industrial-bg border border-industrial-border ${stageColor}`}>
                                <Activity size={16} />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{job.name}</div>
                                <div className="text-[10px] text-industrial-text-muted uppercase font-mono tracking-tight">
                                  {job.capacity} • {job.type} • {new Date(job.createdAt).toLocaleDateString()}
                                </div>
                                {processingTests.length > 0 && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit max-w-[280px] sm:max-w-md">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 animate-pulse" />
                                    <span className="truncate">
                                      Processing ({processingTests.length}): {processingTests.map(t => t.name).join(', ')}
                                    </span>
                                  </div>
                                )}
                                {completedTests.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-green-600 bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10 w-fit max-w-[280px] sm:max-w-md">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                                    <span className="truncate">
                                      Authorized ({completedTests.length}): {completedTests.map(t => t.name).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="flex w-16 h-1 bg-industrial-bg rounded-full overflow-hidden border border-industrial-border">
                                  <div className="bg-green-500 h-full" style={{ width: `${(counts.authorized/counts.total)*100}%` }}></div>
                                </div>
                                <span className="text-[10px] font-mono text-industrial-text-muted">
                                  {Math.round((counts.authorized/counts.total)*100)}%
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${stageColor}`}>
                                {ongoingStageLabel}
                              </span>
                              <ChevronRight size={14} className="text-industrial-border" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Global Activity Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-industrial-text-muted flex items-center gap-2">
                    <History size={16} /> System Activities
                  </h3>
                </div>

                <div className="bg-industrial-card border border-industrial-border rounded-xl p-5 shadow-sm">
                  {(() => {
                    const globalActivities = jobs.flatMap(job => 
                      (job.tests || [])
                        .filter(t => t.stage !== 'Not Started')
                        .map(test => ({
                          jobId: job.id,
                          jobName: job.name,
                          testId: test.id,
                          testName: test.name,
                          stage: test.stage,
                          updatedAt: test.updatedAt || job.updatedAt || job.createdAt,
                        }))
                    ).sort((a, b) => b.updatedAt - a.updatedAt);

                    if (globalActivities.length === 0) {
                      return (
                        <div className="py-12 text-center text-industrial-text-muted">
                          <History size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm">No recent activity detected.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                        {globalActivities.slice(0, 8).map((activity, idx) => {
                          let badgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/10";
                          if (activity.stage === "Tested") badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/10";
                          if (activity.stage === "Reviewed") badgeColor = "bg-green-500/10 text-green-500 border-green-500/10";

                          return (
                            <div key={`${activity.jobId}-${activity.testId}-${idx}`} className="flex gap-3 items-start relative pb-4 last:pb-0 border-b border-industrial-border/30 last:border-0">
                              <div className="mt-1 w-2 h-2 rounded-full bg-industrial-accent/70 flex-shrink-0"></div>
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[9px] text-industrial-text-muted uppercase tracking-tight truncate max-w-[150px]">
                                    {activity.jobName}
                                  </span>
                                  <span className="text-[9px] text-industrial-text-muted font-mono whitespace-nowrap">
                                    {new Date(activity.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold leading-relaxed truncate text-industrial-text">
                                  {activity.testName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] text-industrial-text-muted">marked as</span>
                                  <span className={`px-1.5 py-0.2 text-[8px] rounded font-bold uppercase tracking-wider border ${badgeColor}`}>
                                    {activity.stage}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'SELECT_CAPACITY' && (
          <motion.div 
            key="capacity"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="capacity-page"
            className="w-full max-w-xl bg-industrial-card border border-industrial-border p-8 rounded-2xl shadow-sm"
          >
            {currentSelection.type && (
              <div className="mb-2 flex items-center gap-2 text-industrial-accent text-sm font-mono mb-4">
                <div className="px-2 py-0.5 bg-industrial-accent/10 rounded uppercase">SELECTED: {currentSelection.type} TYPE</div>
              </div>
            )}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">Select Capacity</h2>
              <p className="text-industrial-text-muted">Choose the MVA rating for the transformer unit</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(['8MVA', '12.3MVA', '16.5MVA'] as TransformerCapacity[]).map((cap) => (
                <button
                  key={cap}
                  id={`cap-${cap}`}
                  onClick={() => handleSelectCapacity(cap)}
                  className="w-full flex items-center justify-between p-5 bg-white border border-industrial-border rounded-xl hover:border-industrial-accent hover:bg-industrial-accent/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-industrial-bg rounded-lg text-industrial-text-muted group-hover:text-industrial-accent group-hover:bg-industrial-accent/10 transition-colors">
                      <Cpu size={20} />
                    </div>
                    <span className="text-lg font-medium">{cap}</span>
                  </div>
                  <ChevronRight size={20} className="text-industrial-border group-hover:text-industrial-accent transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between items-center pt-6 border-t border-industrial-border text-sm">
              <button 
                onClick={() => setView('SELECT_TYPE')}
                className="text-industrial-text-muted hover:text-white"
              >
                Back to Type Selection
              </button>
              <div className="text-industrial-text-muted font-mono flex items-center gap-2">
                STEP 02 <span className="w-12 h-1.5 bg-industrial-border rounded-full overflow-hidden"><span className="block h-full w-2/3 bg-industrial-accent"></span></span>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'SELECT_TYPE' && (
          <motion.div 
            key="type"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="type-page"
            className="w-full max-w-xl bg-industrial-card border border-industrial-border p-8 rounded-2xl shadow-sm"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">Select Type</h2>
              <p className="text-industrial-text-muted">Identify the core configuration of the unit</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(['Auto', 'Traction', 'V Connect'] as TransformerType[]).map((type) => (
                <button
                  key={type}
                  id={`type-${type}`}
                  onClick={() => handleSelectType(type)}
                  className="w-full flex items-center justify-between p-5 bg-white border border-industrial-border rounded-xl hover:border-industrial-accent hover:bg-industrial-accent/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-industrial-bg rounded-lg text-industrial-text-muted group-hover:text-industrial-accent group-hover:bg-industrial-accent/10 transition-colors">
                      <Box size={20} />
                    </div>
                    <span className="text-lg font-medium">{type} Transformer</span>
                  </div>
                  <ChevronRight size={20} className="text-industrial-border group-hover:text-industrial-accent transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between items-center pt-6 border-t border-industrial-border text-sm">
              <button 
                onClick={() => setView('DASHBOARD')}
                className="text-industrial-text-muted hover:text-white"
              >
                Back to Dashboard
              </button>
              <div className="text-industrial-text-muted font-mono flex items-center gap-2">
                STEP 01 <span className="w-12 h-1.5 bg-industrial-border rounded-full overflow-hidden"><span className="block h-full w-1/3 bg-industrial-accent"></span></span>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'NAME_JOB' && (
          <motion.div 
            key="name"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="naming-page"
            className="w-full max-w-xl bg-industrial-card border border-industrial-border p-8 rounded-2xl shadow-sm"
          >
            <div className="flex flex-wrap gap-2 text-xs font-mono mb-6">
              <div className="px-2 py-0.5 bg-industrial-bg text-industrial-text-muted border border-industrial-border rounded">{currentSelection.capacity}</div>
              <div className="px-2 py-0.5 bg-industrial-bg text-industrial-text-muted border border-industrial-border rounded">{currentSelection.type}</div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">Finalize Job Name</h2>
              <p className="text-industrial-text-muted">Enter a unique identifier for this testing record</p>
            </div>

            <div className="space-y-6">
              <div className="bg-industrial-bg border border-industrial-border rounded-xl p-6">
                <label className="block text-xs font-mono uppercase text-industrial-text-muted mb-3 ml-1">Job Designation</label>
                <input 
                  type="text" 
                  id="job-name-input"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g. V/M/3214"
                  className="w-full bg-transparent border-b border-industrial-border focus:border-industrial-accent py-2 text-xl font-medium focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <button 
                id="finalize-btn"
                onClick={handleSaveJob}
                disabled={!jobName.trim()}
                className="w-full bg-industrial-accent hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                Complete Registration <CheckCircle2 size={20} />
              </button>
            </div>

            <div className="mt-8 flex justify-between items-center pt-6 border-t border-industrial-border text-sm">
              <button 
                onClick={() => setView('SELECT_CAPACITY')}
                className="text-industrial-text-muted hover:text-white"
              >
                Back to Capacity Selection
              </button>
              <div className="text-industrial-text-muted font-mono flex items-center gap-2">
                STEP 03 <span className="w-12 h-1.5 bg-industrial-border rounded-full overflow-hidden"><span className="block h-full w-full bg-industrial-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span></span>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'JOB_LIST' && (
          <motion.div 
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="job-list-page"
            className="w-full max-w-4xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Testing Records</h2>
                <p className="text-sm text-industrial-text-muted">Historical log of all transformer testing jobs</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('DASHBOARD')}
                  className="px-4 py-2 text-sm border border-industrial-border rounded-lg hover:bg-white/5 transition-colors"
                >
                  Dashboard
                </button>
                <button 
                  onClick={handleStartWorkflow}
                  className="bg-industrial-accent hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-industrial-accent/20"
                >
                  <Plus size={16} /> New Job
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
              <div className="flex border-b border-industrial-border w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setActiveTab('Processing')}
                  className={`px-6 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'Processing' ? 'text-industrial-accent' : 'text-industrial-text-muted hover:text-industrial-text'
                  }`}
                >
                  Processing
                  {activeTab === 'Processing' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-industrial-accent" />}
                  <span className="ml-2 px-1.5 py-0.5 bg-industrial-bg rounded text-[10px] border border-industrial-border">
                    {jobs.filter(j => j.status === 'Processing').length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('Completed')}
                  className={`px-6 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'Completed' ? 'text-industrial-accent' : 'text-industrial-text-muted hover:text-industrial-text'
                  }`}
                >
                  Completed
                  {activeTab === 'Completed' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-industrial-accent" />}
                  <span className="ml-2 px-1.5 py-0.5 bg-industrial-bg rounded text-[10px] border border-industrial-border">
                    {jobs.filter(j => j.status === 'Completed').length}
                  </span>
                </button>
              </div>

              {/* Inline Filters */}
              <div className="flex gap-4 w-full sm:w-auto overflow-x-auto justify-start sm:justify-end items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-industrial-text-muted whitespace-nowrap">Capacity:</span>
                  <select
                    value={filterCapacity}
                    onChange={(e) => setFilterCapacity(e.target.value)}
                    className="bg-white border border-industrial-border rounded px-2 py-1 text-xs font-bold text-industrial-text outline-none focus:border-industrial-accent transition-colors cursor-pointer"
                  >
                    <option value="All">All Capacities</option>
                    <option value="8MVA">8MVA</option>
                    <option value="12.3MVA">12.3MVA</option>
                    <option value="16.5MVA">16.5MVA</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-industrial-text-muted whitespace-nowrap">Type:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-white border border-industrial-border rounded px-2 py-1 text-xs font-bold text-industrial-text outline-none focus:border-industrial-accent transition-colors cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    <option value="Auto">Auto</option>
                    <option value="Traction">Traction</option>
                    <option value="V Connect">V Connect</option>
                  </select>
                </div>

                {(filterCapacity !== 'All' || filterType !== 'All') && (
                  <button
                    onClick={() => {
                      setFilterCapacity('All');
                      setFilterType('All');
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="bg-industrial-card border border-industrial-border rounded-2xl overflow-hidden shadow-2xl">
              {(() => {
                const tabJobs = jobs.filter(j => j.status === activeTab);
                const filteredJobs = tabJobs
                  .filter(j => filterCapacity === 'All' || j.capacity === filterCapacity)
                  .filter(j => filterType === 'All' || j.type === filterType);

                if (tabJobs.length === 0) {
                  return (
                    <div className="p-20 text-center flex flex-col items-center">
                      <div className="p-4 bg-industrial-border/30 rounded-full mb-4">
                        <History className="text-industrial-text-muted" size={40} />
                      </div>
                      <h3 className="text-lg font-medium text-industrial-text-muted uppercase tracking-widest text-xs mb-2">No {activeTab} Records</h3>
                      <p className="text-industrial-text-muted max-w-xs">There are currently no jobs in the {activeTab.toLowerCase()} category.</p>
                    </div>
                  );
                }

                if (filteredJobs.length === 0) {
                  return (
                    <div className="p-20 text-center flex flex-col items-center">
                      <div className="p-4 bg-industrial-border/30 rounded-full mb-4">
                        <History className="text-industrial-text-muted" size={40} />
                      </div>
                      <h3 className="text-sm font-bold text-industrial-text-muted uppercase tracking-widest mb-2">No Matching Records</h3>
                      <p className="text-industrial-text-muted text-xs max-w-xs mb-4">No jobs match your selected configuration filters.</p>
                      <button
                        onClick={() => {
                          setFilterCapacity('All');
                          setFilterType('All');
                        }}
                        className="text-xs bg-industrial-bg px-3 py-1.5 border border-industrial-border font-bold uppercase rounded hover:bg-industrial-text/5 transition-colors"
                      >
                        Reset filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-sm">
                      <thead>
                        <tr className="border-bottom border-industrial-border bg-white/5 uppercase text-[10px] tracking-widest text-industrial-text-muted">
                          <th className="px-6 py-4 font-semibold">Timestamp</th>
                          <th className="px-6 py-4 font-semibold">Job ID & Name</th>
                          <th className="px-6 py-4 font-semibold">Ongoing Stage</th>
                          <th className="px-6 py-4 font-semibold">Capacity</th>
                          <th className="px-6 py-4 font-semibold flex items-center gap-1">Type</th>
                          <th className="px-6 py-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-industrial-border/50">
                        {filteredJobs.map((job) => {
                          const counts = {
                            tested: job.tests.filter(t => t.stage === 'Tested' && t.accepted !== false).length,
                            reviewed: job.tests.filter(t => t.stage === 'Reviewed' && t.accepted !== false).length,
                            authorized: job.tests.filter(t => t.stage === 'Authorized' && t.accepted !== false).length,
                            total: job.tests.filter(t => t.accepted !== false).length || 1
                          };

                          const processingTests = job.tests.filter(t => t.accepted !== false && t.stage !== 'Authorized');
                          const completedTests = job.tests.filter(t => t.accepted !== false && t.stage === 'Authorized');

                          let ongoingStageLabel = 'Not Started';
                          let stageColor = 'bg-gray-100 text-gray-500 border-gray-200';

                          if (counts.authorized > 0) {
                            ongoingStageLabel = counts.authorized === counts.total ? 'Fully Authorized' : 'Authorization Phase';
                            stageColor = 'bg-green-100 text-green-700 border-green-200';
                          } else if (counts.reviewed > 0) {
                            ongoingStageLabel = 'Review Phase';
                            stageColor = 'bg-blue-100 text-blue-700 border-blue-200';
                          } else if (counts.tested > 0) {
                            ongoingStageLabel = 'Testing Phase';
                            stageColor = 'bg-amber-100 text-amber-700 border-amber-200';
                          }

                          return (
                            <tr 
                              key={job.id} 
                              onClick={() => { setSelectedJobId(job.id); setView('JOB_DETAIL'); }}
                              className="hover:bg-industrial-bg/50 transition-colors group cursor-pointer"
                            >
                              <td className="px-6 py-5 align-top text-industrial-text-muted whitespace-nowrap">
                                {new Date(job.createdAt).toLocaleDateString()}
                                <br />
                                <span className="text-[10px]">{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </td>
                              <td className="px-6 py-5 align-top font-sans">
                                <div className="text-xs text-industrial-text-muted font-mono mb-1 truncate max-w-[120px]">#{job.id.slice(0, 8)}</div>
                                <div className="text-base font-medium group-hover:text-industrial-accent transition-colors mb-1">{job.name}</div>
                                {processingTests.length > 0 && (
                                  <div className="flex items-center gap-1 text-[9px] font-semibold text-amber-600 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 w-fit max-w-[180px] truncate mb-0.5" title={processingTests.map(t => t.name).join(', ')}>
                                    <span className="w-1 h-1 bg-amber-500 rounded-full shrink-0 animate-pulse" />
                                    <span className="truncate">Active: {processingTests.map(t => t.name).join(', ')}</span>
                                  </div>
                                )}
                                {completedTests.length > 0 && (
                                  <div className="flex items-center gap-1 text-[9px] font-semibold text-green-600 bg-green-500/5 px-1.5 py-0.5 rounded border border-green-500/10 w-fit max-w-[180px] truncate" title={completedTests.map(t => t.name).join(', ')}>
                                    <span className="w-1 h-1 bg-green-500 rounded-full shrink-0" />
                                    <span className="truncate">Done: {completedTests.map(t => t.name).join(', ')}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-5 align-top">
                                <div className="flex flex-col gap-1.5">
                                  <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${stageColor}`}>
                                    {ongoingStageLabel}
                                  </span>
                                  <div className="flex w-24 h-1 bg-industrial-bg rounded-full overflow-hidden border border-industrial-border">
                                    <div className="bg-amber-400 h-full" style={{ width: `${(counts.tested/counts.total)*100}%` }}></div>
                                    <div className="bg-blue-500 h-full" style={{ width: `${(counts.reviewed/counts.total)*100}%` }}></div>
                                    <div className="bg-green-500 h-full" style={{ width: `${(counts.authorized/counts.total)*100}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 align-top">
                                <span className="px-2 py-1 bg-industrial-bg border border-industrial-border rounded text-[10px]">{job.capacity}</span>
                              </td>
                              <td className="px-6 py-5 align-top">
                                <span className="px-2 py-1 bg-industrial-bg border border-industrial-border rounded text-[10px]">{job.type}</span>
                              </td>
                              <td className="px-6 py-5 align-top text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleDownloadJobCard(job)}
                                    title="Download Job Dossier"
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer focus:outline-none"
                                  >
                                    <FileDown size={14} />
                                    <span className="text-[10px] uppercase font-bold px-1">Dossier</span>
                                  </button>
                                  <div 
                                    onClick={() => { setSelectedJobId(job.id); setView('JOB_DETAIL'); }}
                                    className={`inline-flex items-center gap-2 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer ${
                                      job.status === 'Completed' ? 'bg-green-600 text-white shadow-sm' : 'bg-industrial-accent text-white shadow-sm'
                                    }`}
                                  >
                                    {job.status === 'Completed' ? 'ARCHIVED' : 'RESUME'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
        {view === 'JOB_DETAIL' && selectedJob && (
          <motion.div 
            key="detail"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="job-detail-page"
            className="w-full max-w-5xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('JOB_LIST')}
                  className="p-2 hover:bg-industrial-border rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-semibold mb-1">{selectedJob.name}</h2>
                  <div className="flex gap-2 text-xs font-mono text-industrial-text-muted">
                    <span>{selectedJob.capacity}</span>
                    <span>•</span>
                    <span>{selectedJob.type}</span>
                    <span>•</span>
                    <span>ID: {selectedJob.id.slice(0,8)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadJobCard(selectedJob)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
                >
                  <FileDown size={14} /> Download Job Dossier
                </button>
                <div className="hidden md:block">
                  <div className="bg-industrial-accent/10 border border-industrial-accent/20 px-4 py-2 rounded-lg flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-industrial-accent font-bold">Overall Progress</div>
                      <div className="text-sm font-bold text-industrial-accent">
                        {selectedJob.tests.filter(t => t.stage === 'Reviewed' && t.accepted !== false).length} / {selectedJob.tests.filter(t => t.accepted !== false).length || 1} COMPLETE
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-industrial-accent flex items-center justify-center font-mono text-xs font-bold text-industrial-accent">
                      {Math.round((selectedJob.tests.filter(t => t.stage === 'Reviewed' && t.accepted !== false).length / (selectedJob.tests.filter(t => t.accepted !== false).length || 1)) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <JobRatingForm 
                job={selectedJob} 
                onUpdate={(data) => handleUpdateJobRating(selectedJob.id, data)} 
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Pending Test Offers Section */}
                  {currentRole !== 'Admin_Tested' && selectedJob.tests.some(t => t.accepted === false) && (
                    <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="text-base font-bold text-amber-600 flex items-center gap-2">
                            <AlertCircle size={18} /> Available Test Offers ({selectedJob.tests.filter(t => t.accepted === false).length})
                          </h3>
                          <p className="text-xs text-industrial-text-muted mt-1 leading-relaxed">
                            These tests are offered for this transformer configuration. You must **accept** test offers to release them into active protocol execution.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            selectedJob.tests.forEach(t => {
                              if (t.accepted === false) {
                                handleAcceptTestOffer(selectedJob.id, t.id);
                              }
                            });
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 whitespace-nowrap self-start"
                        >
                          <CheckCircle2 size={14} /> Accept All Offers
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedJob.tests.filter(t => t.accepted === false).map((test) => (
                          <div 
                            key={test.id} 
                            className="bg-white border border-industrial-border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-amber-500/50 transition-colors"
                          >
                            <div>
                              <div className="text-[9px] font-mono text-industrial-text-muted uppercase tracking-widest font-black">Test Offer</div>
                              <h4 className="font-bold text-sm text-industrial-text mt-1">{test.name}</h4>
                            </div>
                            <button
                              onClick={() => handleAcceptTestOffer(selectedJob.id, test.id)}
                              className="w-full text-center py-2 bg-industrial-accent hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 size={12} /> Accept Offer
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-industrial-card border border-industrial-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-industrial-bg px-6 py-4 border-b border-industrial-border flex justify-between items-center">
                    <div className="flex items-center gap-2 font-semibold">
                      <ClipboardList size={18} className="text-industrial-accent" />
                      Test Protocol Execution
                    </div>
                    <span className="text-[10px] font-mono text-industrial-text-muted uppercase tracking-widest">3-Stage Verification</span>
                  </div>
                  <div className="divide-y divide-industrial-border">
                    {selectedJob.tests.filter(t => t.accepted !== false).length === 0 ? (
                      <div className="p-12 text-center text-industrial-text-muted bg-white/50">
                        <AlertCircle size={36} className="mx-auto mb-3 text-industrial-text-muted opacity-40 animate-pulse" />
                        <h4 className="font-bold text-sm mb-1 text-industrial-text">No Active Tests Released</h4>
                        <p className="text-xs text-industrial-text-muted max-w-sm mx-auto">
                          {currentRole === 'Admin_Tested'
                            ? "Waiting for reviewer or authorizer to release and accept test offers into active protocol execution."
                            : "Please accept available test offers from the section above to release and begin execution."}
                        </p>
                      </div>
                    ) : (
                      selectedJob.tests.filter(t => t.accepted !== false).map((test) => {
                        return (
                          <div 
                            key={test.id} 
                            className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors ${
                              test.stage === 'Authorized' ? 'bg-green-50/30' : 'hover:bg-industrial-bg/20'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-medium text-lg mb-1">{test.name}</h4>
                                {test.stage === 'Authorized' && (
                                  <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded uppercase flex items-center gap-1 shadow-sm">
                                    <CheckCircle2 size={10} /> Completed
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs font-mono text-industrial-text-muted">
                                <span className="flex items-center gap-1"><Timer size={12} /> {new Date(test.updatedAt).toLocaleTimeString()}</span>
                                {test.observationData && Object.keys(test.observationData).length > 0 && (
                                  <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">REPORT DATA FILLED</span>
                                )}
                              </div>
                              
                              {/* Report Data Entry Toggle */}
                              {!(
                                (currentRole === 'Admin_Tested' && (test.stage === 'Reviewed' || test.stage === 'Authorized')) ||
                                (currentRole === 'Admin_Reviewed' && test.stage === 'Authorized')
                              ) ? (
                                <div className="flex items-center gap-3 flex-wrap mt-3">
                                  <button 
                                    onClick={() => {
                                      setEditingTestId(test.id);
                                      setView('TEST_REPORT');
                                    }}
                                    className="text-xs font-bold text-industrial-accent underline flex items-center gap-1"
                                  >
                                    <ClipboardList size={14} /> 
                                    {test.observationData ? 'View/Edit Test Report' : 'Fill Test Report'}
                                  </button>
                                  {test.stage === 'Authorized' && (
                                    <button 
                                      onClick={() => handleDownloadTestReport(selectedJob, test)}
                                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <FileDown size={14} /> 
                                      Download Report
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 flex-wrap mt-3">
                                  <div className="text-xs text-industrial-text-muted flex items-center gap-1 font-semibold bg-gray-100/60 px-2 py-1 rounded w-fit border border-gray-200">
                                    <Lock size={12} className="text-gray-400" /> Report Locked ({test.stage})
                                  </div>
                                  {test.stage === 'Authorized' && (
                                    <button 
                                      onClick={() => handleDownloadTestReport(selectedJob, test)}
                                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <FileDown size={14} /> 
                                      Download Report
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-4">
                              <div className="flex items-center gap-2">
                                {(['Tested', 'Reviewed', 'Authorized'] as TestStage[]).map((stage) => {
                                  const isCurrentStage = test.stage === stage;
                                  const isPrerequisiteMet = (
                                    (stage === 'Tested' && test.stage === 'Not Started') ||
                                    (stage === 'Reviewed' && test.stage === 'Tested') ||
                                    (stage === 'Authorized' && test.stage === 'Reviewed')
                                  );
                                  const hasRequiredRole = (
                                    (stage === 'Tested' && currentRole === 'Admin_Tested') ||
                                    (stage === 'Reviewed' && currentRole === 'Admin_Reviewed') ||
                                    (stage === 'Authorized' && currentRole === 'Admin_Authorized')
                                  );

                                  // Button should be active if it's the current stage OR if it's the next stage AND we have the role
                                  const isActive = isCurrentStage;
                                  const canClick = isPrerequisiteMet && hasRequiredRole;

                                  const isTestedAdminLocked = currentRole === 'Admin_Tested' && (test.stage === 'Reviewed' || test.stage === 'Authorized');
                                  const isReviewedAdminLocked = currentRole === 'Admin_Reviewed' && test.stage === 'Authorized';
                                  const isStageLocked = isTestedAdminLocked || isReviewedAdminLocked;

                                  return (
                                    <button
                                      key={stage}
                                      disabled={(!canClick && !isCurrentStage) || isStageLocked}
                                      onClick={() => {
                                        if (isStageLocked) return;
                                        const isReportable = test.name.toUpperCase() === 'CT TEST' || test.name.toUpperCase() === 'BUSHING TEST' || test.name.toUpperCase() === '2 KV TEST' || test.name.toUpperCase() === 'PRE-CONNECTION TEST' || test.name.toUpperCase() === 'POST-CONNECTION TEST' || test.name.toUpperCase() === 'PRE & POST VPD SERVICING' || test.name.toUpperCase().includes('OIL SOAKING') || test.name.toUpperCase() === 'POST-TANKING TEST' || test.name.toUpperCase() === 'FINAL LV TEST REPORT' || test.name.toUpperCase() === 'CHECKLIST FOR TFR BEFORE HV' || test.name.toUpperCase() === 'LIST OF HV TEST';
                                        if (canClick) {
                                          handleUpdateTestStage(selectedJob.id, test.id, stage);
                                          if (isReportable && (stage === 'Reviewed' || stage === 'Authorized')) {
                                            if (currentRole === 'Admin_Tested' || currentRole === 'Admin_Reviewed') return;
                                            setEditingTestId(test.id);
                                            setView('TEST_REPORT');
                                          }
                                        } else if (isReportable && (isCurrentStage || stage === 'Reviewed' || stage === 'Authorized')) {
                                          if (isStageLocked) {
                                            return;
                                          }
                                          // Allow opening the report if it's current stage or Reviewed/Authorized stages
                                          setEditingTestId(test.id);
                                          setView('TEST_REPORT');
                                        }
                                      }}
                                      className={`
                                        px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border
                                        ${isActive 
                                          ? (stage === 'Authorized' ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20' : 'bg-industrial-accent text-white border-industrial-accent shadow-md shadow-industrial-accent/20')
                                          : canClick
                                            ? 'bg-white text-industrial-accent border-industrial-accent/30 hover:bg-industrial-accent/5'
                                            : (stage === 'Authorized' && test.stage === 'Authorized')
                                              ? 'bg-green-50 text-green-700 border-green-600 font-black'
                                              : 'bg-industrial-bg/50 text-industrial-text-muted border-industrial-border cursor-not-allowed opacity-40'
                                        }
                                      `}
                                    >
                                      {stage}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-industrial-card border border-industrial-border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <History size={18} className="text-industrial-accent" />
                    Activity Log
                  </h3>
                  <div className="space-y-4">
                    {selectedJob.tests
                      .filter(t => t.stage !== 'Not Started')
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .slice(0, 5)
                      .map(log => (
                        <div key={`${log.id}-log`} className="flex gap-3">
                          <div className="mt-1 w-2 h-2 rounded-full bg-industrial-accent flex-shrink-0"></div>
                          <div>
                            <p className="text-sm font-medium leading-tight">
                              {log.name} marked as <span className="text-industrial-accent uppercase text-[10px] font-bold">{log.stage}</span>
                            </p>
                            <span className="text-[10px] text-industrial-text-muted font-mono">{new Date(log.updatedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    }
                    {selectedJob.tests.every(t => t.stage === 'Not Started') && (
                      <p className="text-sm text-industrial-text-muted italic ">No activity recorded yet for this job.</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
                  <Zap size={32} className="mb-4 opacity-80" />
                  <h3 className="text-lg font-bold mb-2">Technical Support</h3>
                  <p className="text-sm opacity-90 leading-relaxed mb-4">
                    If you encounter any discrepancies during HV testing or LV validation, please contact the Lead Testing Engineer immediately.
                  </p>
                  <button className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-medium transition-colors">
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}
        {view === 'TEST_REPORT' && selectedJob && editingTest && (
          (() => {
            const isAccessDenied = (
              (currentRole === 'Admin_Tested' && (editingTest.stage === 'Reviewed' || editingTest.stage === 'Authorized')) ||
              (currentRole === 'Admin_Reviewed' && editingTest.stage === 'Authorized')
            );
            const isChecklist = editingTest.name === 'Checklist for TFR BEFORE HV';
            const testData = editingTest.observationData || {};
            const handleTestFieldChange = (key: string, value: string) => {
              handleUpdateTestData(selectedJob.id, editingTest.id, { ...testData, [key]: value });
            };
            if (isAccessDenied) {
              return (
                <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-xl max-w-xl mx-auto mt-20 text-center shadow-lg">
                  <Lock size={48} className="mx-auto mb-4 text-red-600" />
                  <h3 className="text-xl font-bold mb-2">Access Locked</h3>
                  <p className="text-sm mb-6">
                    {currentRole === 'Admin_Tested' 
                      ? "Tested Admins are restricted from viewing or editing Reviewed/Authorized test reports."
                      : "Reviewed Admins are restricted from viewing or editing Authorized test reports."}
                  </p>
                  <button 
                    onClick={() => setView('JOB_DETAIL')}
                    className="bg-red-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Go Back to Job Details
                  </button>
                </div>
              );
            }
            return (
              <motion.div 
                key="report-page"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-6xl pb-20"
              >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('JOB_DETAIL')}
                  className="p-2 hover:bg-industrial-border rounded-lg transition-colors border border-industrial-border"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-bold">{editingTest.name}</h2>
                  <p className="text-sm text-industrial-text-muted uppercase tracking-widest font-mono">Job: {selectedJob.name} | Protocol ID: {editingTest.id.slice(0,8)}</p>
                </div>
              </div>
              <button 
                onClick={() => setView('JOB_DETAIL')}
                className="text-industrial-text-muted hover:text-industrial-accent text-sm font-bold flex items-center gap-2 transition-colors px-4 py-2 hover:bg-industrial-bg rounded-lg"
              >
                Cancel & Exit
              </button>
            </div>

            <JobRatingForm 
              job={selectedJob} 
              onUpdate={(data) => handleUpdateJobRating(selectedJob.id, data)} 
              currentRole={currentRole}
            />

            <FormContext.Provider value={{ data: testData, handleFieldChange: handleTestFieldChange, currentRole, styleMode: isChecklist ? 'checklist' : 'standard' }}>
              <div className="bg-white rounded-3xl p-1 shadow-2xl border border-industrial-border">
                {editingTest.name === 'CT TEST' ? (
                  <CTTestForm 
                    test={editingTest}
                    job={selectedJob}
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'BUSHING TEST' ? (
                  <BushingTestForm 
                    test={editingTest} 
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === '2 KV TEST' ? (
                  <TwoKVTestForm 
                    test={editingTest} 
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'PRE-CONNECTION TEST' ? (
                  <PreConnectionTestForm 
                    test={editingTest}
                    job={selectedJob}
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'POST-CONNECTION TEST' ? (
                  <PostConnectionTestForm 
                    test={editingTest}
                    job={selectedJob}
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'PRE & POST VPD SERVICING' ? (
                  <PrePostVpdServicingForm 
                    test={editingTest} 
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name.toUpperCase().includes('OIL SOAKING') ? (
                  <OilSoakingServicingForm 
                    test={editingTest} 
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'POST-TANKING TEST' ? (
                  <PostTankingTestForm 
                    test={editingTest}
                    job={selectedJob}
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'List of HV Test' ? (
                  <HVTestListForm 
                    test={editingTest}
                    job={selectedJob}
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'FINAL LV TEST REPORT' ? (
                  <FinalLVTestForm 
                    test={editingTest}
                    job={selectedJob}
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : editingTest.name === 'Checklist for TFR BEFORE HV' ? (
                  <ChecklistForTFRBeforeHV
                    test={editingTest} 
                    onUpdate={(data) => handleUpdateTestData(selectedJob.id, editingTest.id, data)}
                  />
                ) : (
                  <div className="p-12 text-center flex flex-col items-center">
                     <div className="p-6 bg-industrial-bg rounded-full mb-6">
                      <ClipboardList size={48} className="text-industrial-text-muted opacity-30" />
                     </div>
                     <h3 className="text-xl font-bold mb-2">Detailed Report Interface Pending</h3>
                     <p className="text-industrial-text-muted max-w-sm">Detailed parameters for {editingTest.name} are currently being mapped from technical standards.</p>
                     <button 
                      onClick={() => setView('JOB_DETAIL')}
                      className="mt-8 text-industrial-accent font-bold underline"
                     >
                      Return to job summary
                     </button>
                  </div>
                )}
              </div>
            </FormContext.Provider>

             {/* Bottom Actions */}
             <div className="mt-8 flex justify-center gap-4 flex-wrap">
               {editingTest.stage === 'Reviewed' && (
                 <button 
                   onClick={() => {
                     handleRejectTestStage(selectedJob.id, editingTest.id, 'Tested');
                     setView('JOB_DETAIL');
                   }}
                   className="bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg cursor-pointer"
                 >
                   <XCircle size={24} />
                   Reject to Tested
                 </button>
               )}
 
               {editingTest.stage === 'Authorized' && (
                 <>
                   <button 
                     onClick={() => {
                       setToast({
                         message: `${editingTest.name} approved successfully.`,
                         type: 'success'
                       });
                       setView('JOB_DETAIL');
                     }}
                     className="bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg cursor-pointer"
                   >
                     <CheckCircle2 size={24} />
                     Approve
                   </button>
                   <button 
                     onClick={() => {
                       handleRejectTestStage(selectedJob.id, editingTest.id, 'Reviewed');
                       setView('JOB_DETAIL');
                     }}
                     className="bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg cursor-pointer"
                   >
                     <XCircle size={24} />
                     Reject to Reviewed
                   </button>
                 </>
               )}
 
               {editingTest.stage !== 'Authorized' && (
                 <>
                   <button 
                     onClick={() => handleDownloadTestReport(selectedJob, editingTest)}
                     className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg cursor-pointer"
                   >
                     <FileDown size={24} />
                     Download PDF Report
                   </button>
                   <button 
                     onClick={() => {
                       setToast({
                         message: `${editingTest.name} draft saved successfully!`,
                         type: 'success'
                       });
                       setView('JOB_DETAIL');
                     }}
                     className="bg-slate-600 hover:bg-slate-700 shadow-md shadow-slate-600/20 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg cursor-pointer"
                   >
                     <Save size={24} />
                     Save as Draft
                   </button>
                 </>
               )}

               {editingTest.stage === 'Authorized' && (
                 <button 
                   onClick={() => handleDownloadTestReport(selectedJob, editingTest)}
                   className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg cursor-pointer"
                 >
                   <FileDown size={24} />
                   Download Report
                 </button>
               )}

               {editingTest.stage !== 'Authorized' && (
                 <button 
                   onClick={() => {
                     const isReportable = editingTest.name.toUpperCase() === 'CT TEST' || editingTest.name.toUpperCase() === 'BUSHING TEST' || editingTest.name.toUpperCase() === '2 KV TEST' || editingTest.name.toUpperCase() === 'PRE-CONNECTION TEST' || editingTest.name.toUpperCase() === 'POST-CONNECTION TEST' || editingTest.name.toUpperCase() === 'PRE & POST VPD SERVICING' || editingTest.name.toUpperCase().includes('OIL SOAKING') || editingTest.name.toUpperCase() === 'POST-TANKING TEST' || editingTest.name.toUpperCase() === 'FINAL LV TEST REPORT' || editingTest.name.toUpperCase() === 'CHECKLIST FOR TFR BEFORE HV' || editingTest.name.toUpperCase() === 'LIST OF HV TEST';
                     if (isReportable) {
                       if (editingTest.stage === 'Tested') {
                         handleUpdateTestStage(selectedJob.id, editingTest.id, 'Reviewed');
                       } else if (editingTest.stage === 'Reviewed') {
                         handleUpdateTestStage(selectedJob.id, editingTest.id, 'Authorized');
                       }
                     }
                     setView('JOB_DETAIL');
                   }}
                   className={`${
                     editingTest.stage === 'Reviewed' 
                       ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' 
                       : 'bg-industrial-accent hover:bg-blue-600 shadow-industrial-accent/20'
                   } text-white px-12 py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center gap-3 text-lg group cursor-pointer`}
                 >
                   <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" /> 
                   {editingTest.stage === 'Tested' ? 'Submit to Reviewer' : 
                    editingTest.stage === 'Reviewed' ? 'Approve & Finalize Report' : 
                    'Save Observations'}
                 </button>
               )}
             </div>
          </motion.div>
          );
          })()
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 left-4 flex items-center gap-4 text-[10px] font-mono text-industrial-text-muted uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500"></span> System Online
        </div>
        <div className="h-3 w-px bg-industrial-border"></div>
        <div>V.2.4.0-CORE</div>
      </div>
    </div>
  );
}
