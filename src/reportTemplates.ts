// Dynamic high-fidelity HTML templates for downloaded reports to match on-screen UI exactly.

import { getCTConfig, getRatioAppliedPrimary } from './ctTestConfig';
import { getPreConnWindingResMaxGuaranteed } from './preConnectionTestConfig';
import { calculatePostConnScImpedanceZ, getPostConnWindingResMaxGuaranteed } from './postConnectionTestConfig';
import { calculatePostTankingScImpedanceZ, getPostTankingWindingResMaxGuaranteed } from './postTankingTestConfig';
import { calculateFinalLvScImpedanceZ, getFinalLvWindingResMaxGuaranteed } from './finalLvTestConfig';
import { applyHVLLCalculations, getHVLLConfig, getHVNllGuaranteedCurrent, getHVNllGuaranteedPower } from './hvTestListConfig';
import { TransformerCapacity, TransformerType } from './types';

export function getTestFormHtml(
  testName: string,
  testData: Record<string, string>,
  jobMeta?: { type?: TransformerType; capacity?: TransformerCapacity }
): string {
  const f = (fieldId: string, pdfValue?: string, label?: string, className: string = "", placeholder: string = "-") => {
    const val = testData[fieldId] || pdfValue || '';
    const displayVal = val !== '' ? val : placeholder;
    
    if (label) {
      return `
        <div class="flex flex-col gap-1 w-full ${className}">
          <span class="text-[10px] font-bold text-industrial-text-muted uppercase px-1">${label}</span>
          <div class="p-2 text-sm font-bold bg-industrial-bg/5 rounded text-left min-h-[38px] text-industrial-text border border-industrial-border/40">
            ${displayVal}
          </div>
        </div>
      `;
    }
    return `<div class="p-2 text-sm font-bold text-center text-industrial-text ${className}">${displayVal}</div>`;
  };

  // 1. CT TEST
  if (testName === 'CT TEST') {
    const ctConfig = getCTConfig(jobMeta?.type, jobMeta?.capacity);
    const CT_SECTIONS = [...ctConfig.sections];
    const RATIO_ROWS = [
      { percent: '20%' },
      { percent: '40%' },
      { percent: '60%' },
      { percent: '80%' },
      { percent: '100%' }
    ];
    const KNEE_ROWS = [
      { percent: '20%' },
      { percent: '40%' },
      { percent: '60%' },
      { percent: '80%' },
      { percent: '100%' },
      { percent: '110%' }
    ];

    return `
      <div class="space-y-6">
        <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] mb-4">Name Plate Details</h4>
        <div class="overflow-x-auto border border-[#cbd5e1] rounded-xl">
          <table class="w-full text-xs font-mono">
            <thead class="bg-[#f8fafc]">
              <tr class="border-b border-[#cbd5e1]">
                <th class="p-3 border-r border-[#cbd5e1] text-left w-12 text-[#64748b]">Sr. No</th>
                <th class="p-3 border-r border-[#cbd5e1] text-left text-[#64748b]">Description</th>
                ${CT_SECTIONS.map(s => `<th class="p-3 border-r border-[#cbd5e1] text-center text-[#2563eb] font-bold last:border-r-0">${s}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${ctConfig.nameplateRows.map(row => `
                <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                  <td class="p-3 border-r border-[#cbd5e1] text-center text-[#64748b]">${row.id}</td>
                  <td class="p-3 border-r border-[#cbd5e1] font-medium text-left">${row.label}</td>
                  ${CT_SECTIONS.map(s => `<td class="p-1 border-r border-[#cbd5e1] last:border-r-0">${f(`np_${s}_${row.key}`, row.defaults[s] as string)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${CT_SECTIONS.map(section => {
          const kneeV = parseFloat(testData['np_' + section + '_knee_v'] || ctConfig.getKneeFallback(section));
          return `
          <div class="p-6 border border-[#cbd5e1] rounded-xl space-y-6 relative mt-10">
            <div class="absolute -top-3 left-6 px-3 bg-white text-[#2563eb] font-bold text-[10px] border border-[#2563eb] rounded-full">
              SECTION ${section}
            </div>
            <div class="absolute -top-3 right-6 bg-white px-2 text-[10px] font-mono text-slate-600">
              <strong>SR. NO.:</strong> <span class="text-[#1e293b] font-bold">${testData[`np_${section}_mfg_sr`] || '-'}</span>
            </div>
            <div class="grid grid-cols-2 gap-8">
              <div>
                <h5 class="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-3 text-left">Ratio Test Core -S1-S2</h5>
                <div class="border border-[#cbd5e1] rounded-lg overflow-hidden">
                  <table class="w-full text-[10px] font-mono">
                    <thead class="bg-[#f8fafc]">
                      <tr class="border-b border-[#cbd5e1]">
                        <th class="p-2 border-r border-[#cbd5e1] text-left">Current %</th>
                        <th class="p-2 border-r border-[#cbd5e1] text-center">Applied Primary Current (A)</th>
                        <th class="p-2 border-[#cbd5e1] text-center bg-amber-50/50 text-[#2563eb]">Measured Secondary (A)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${RATIO_ROWS.map(row => `
                        <tr class="border-b border-[#cbd5e1] last:border-0">
                          <td class="p-2 border-r border-[#cbd5e1] font-bold text-left">${row.percent}</td>
                          <td class="p-2 border-r border-[#cbd5e1] text-center text-[#64748b]">${getRatioAppliedPrimary(section, row.percent, testData['np_' + section + '_ratio'], jobMeta?.type, jobMeta?.capacity)}</td>
                          <td class="p-1">${f(`ratio_${section}_${row.percent}_measured`)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                ${section !== 'WTI' ? `
                  <h5 class="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-3 text-left">Knee Point Voltage</h5>
                  <div class="border border-[#cbd5e1] rounded-lg overflow-hidden mb-3">
                    <table class="w-full text-[10px] font-mono">
                      <thead class="bg-[#f8fafc]">
                        <tr class="border-b border-[#cbd5e1]">
                          <th class="p-2 border-r border-[#cbd5e1] text-left">Voltage %</th>
                          <th class="p-2 border-r border-[#cbd5e1] text-center">Applied Voltage (V)</th>
                          <th class="p-2 border-[#cbd5e1] text-center bg-blue-50/50 text-[#2563eb]">Measured Current (mA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${KNEE_ROWS.map(row => {
                          const pct = parseFloat(row.percent) / 100;
                          const rawVal = pct * kneeV;
                          const calculatedVal = isNaN(kneeV) ? '-' : (rawVal % 1 === 0 ? rawVal.toFixed(0) : rawVal.toFixed(1));
                          return `
                          <tr class="border-b border-[#cbd5e1] last:border-0">
                            <td class="p-2 border-r border-[#cbd5e1] font-bold text-left">${row.percent}</td>
                            <td class="p-2 border-r border-[#cbd5e1] text-center text-[#64748b]">${calculatedVal}</td>
                            <td class="p-1">${f(`kv_${section}_${row.percent}_measured`)}</td>
                          </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : `
                  <div class="mb-6">
                    <h5 class="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-3 text-left">Auxiliary Checks</h5>
                  </div>
                `}
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex items-center gap-2 border border-[#cbd5e1] rounded p-2 bg-[#f8fafc]">
                    <span class="text-[10px] font-bold uppercase text-[#64748b]">Continuity:</span>
                    <div class="flex-1">${f(`cont_${section}`)}</div>
                  </div>
                  <div class="flex items-center gap-2 border border-[#cbd5e1] rounded p-2 bg-[#f8fafc]">
                    <span class="text-[10px] font-bold uppercase text-[#64748b]">Resistance:</span>
                    <div class="flex-1 flex justify-between items-center font-bold">
                      <div class="flex-1">${f(`res_${section}`)}</div>
                      <span class="text-xs text-slate-400 mr-1">Ω</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 2. BUSHING TEST
  if (testName === 'BUSHING TEST') {
    const SECTIONS = ['1.1', '2'];
    const ROWS = ['05 KV', '10 KV'];
    
    return `
      <div class="space-y-6">
        <div class="grid grid-cols-4 gap-4 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1]">
          ${f('bushing_make', '-', 'Temp (°C)')}
          ${f('bushing_sr_no', '-', 'Humidity(%)')}
          ${f('bushing_meter_make', 'DOBEL', 'Meter Make')}
          ${f('bushing_meter_sr', '-', 'Sl No.')}
        </div>

        ${SECTIONS.map(sec => {
          const srNoKey = sec === '1.1' ? 'section1_1_sr_no' : 'section2_sr_no';
          const makeKey = sec === '1.1' ? 'section1_1_make' : 'section2_make';
          const srNoVal = testData[srNoKey] || '-';
          const makeVal = testData[makeKey] || '-';

          return `
          <div class="p-6 border border-[#cbd5e1] rounded-xl space-y-4 mt-8 relative">
            <div class="absolute -top-3 left-6 px-3 bg-white text-[#2563eb] font-bold text-[10px] border border-[#2563eb] rounded-full">
              SECTION ${sec} - Mode: UST R/B
            </div>
            <div class="flex justify-start gap-6 text-xs font-mono text-slate-600 border-b border-[#f1f5f9] pb-2">
              <div><strong>SR. NO:</strong> <span class="text-[#1e293b] font-bold">${srNoVal}</span></div>
              <div><strong>MAKE:</strong> <span class="text-[#1e293b] font-bold">${makeVal}</span></div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs font-mono">
                <thead class="bg-[#f8fafc]">
                  <tr class="border-b border-[#cbd5e1]">
                    <th class="p-3 border-r border-[#cbd5e1] text-left w-32">VOLTAGE (kV)</th>
                    <th class="p-3 border-r border-[#cbd5e1] text-center">TAN DELTA (%)</th>
                    <th class="p-3 border-r border-[#cbd5e1] text-center">CAPACITANCE (pF)</th>
                    <th class="p-3 border-r border-[#cbd5e1] text-center">EXCITATION CURRENT (mA)</th>
                    <th class="p-3 border-[#cbd5e1] text-center">DIELECTRIC LOSS (W)</th>
                  </tr>
                </thead>
                <tbody>
                  ${ROWS.map(v => `
                    <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                      <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${v}</td>
                      <td class="p-1 border-r border-[#cbd5e1]">${f(`bushing_${sec}_${v.replace(' ', '_')}_tan_delta`)}</td>
                      <td class="p-1 border-r border-[#cbd5e1]">${f(`bushing_${sec}_${v.replace(' ', '_')}_capacitance`)}</td>
                      <td class="p-1 border-r border-[#cbd5e1]">${f(`bushing_${sec}_${v.replace(' ', '_')}_excitation`)}</td>
                      <td class="p-1">${f(`bushing_${sec}_${v.replace(' ', '_')}_loss`)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 3. 2 KV TEST
  if (testName === '2 KV TEST') {
    const SECTIONS = ['HORIZANTAL', 'VERTICAL'];
    const ROWS = ['CORE-FRAME', 'FRAME-FRAME'];

    return SECTIONS.map(section => `
      <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-8">
        <div class="bg-[#f8fafc] px-6 py-3 border-b border-[#cbd5e1] text-left">
          <span class="text-sm font-bold uppercase tracking-widest text-[#2563eb]">${section} - 2KV TESTING</span>
        </div>
        <table class="w-full text-xs font-mono">
          <thead class="bg-[#f8fafc]">
            <tr class="border-b border-[#cbd5e1]">
              <th class="p-3 border-r border-[#cbd5e1] text-left w-48">${section}</th>
              <th class="p-3 border-r border-[#cbd5e1] text-center">voltage applied (kV)</th>
              <th class="p-3 border-r border-[#cbd5e1] text-center">DURATION (Sec)</th>
              <th class="p-3 border-[#cbd5e1] text-center">leakage current (mA)</th>
            </tr>
          </thead>
          <tbody>
            ${ROWS.map(row => `
              <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${row}</td>
                <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`2kv_${section.toLowerCase()}_${row.toLowerCase().replace('-', '_')}_voltage`, '2')}</td>
                <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`2kv_${section.toLowerCase()}_${row.toLowerCase().replace('-', '_')}_duration`, '60')}</td>
                <td class="p-1 text-center">${f(`2kv_${section.toLowerCase()}_${row.toLowerCase().replace('-', '_')}_leakage`)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

  // 4. PRE-CONNECTION TEST
  if (testName === 'PRE-CONNECTION TEST') {
    const RATIO_TERMINALS = ['(1.1-2.)-(2.1-2)', '(1.1-2)-(2.1-1.1)', '(1.1-2.1)-(2-2.1)'];
    const MAG_TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];
    return `
      <div class="space-y-8">
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">1. Measurement of IR Values</h4>
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-4 rounded-xl space-y-0 mb-4 overflow-hidden">
            <table class="w-full text-xs font-mono border border-[#cbd5e1] border-collapse mb-0" style="table-layout: fixed;">
              <tbody>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" style="width: 20%;">Date:</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 20%;">${f('ir_date', '', '', 'text-center', 'DD/MM/YYYY')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" style="width: 10%;">Time:</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 15%;">${f('ir_time', '', '', 'text-center', 'HH:MM')}</td>
                  <td class="p-2 bg-slate-100 font-bold text-center" style="width: 35%;">Details of Insulation Tester</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Ambiant Temp (&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('ir_amb_temp', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Make:</td>
                  <td class="p-1 bg-white text-center">${f('ir_tester_make', '', '', 'text-center', 'MEGGER')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Core Temp(&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('ir_core_temp', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Sr. No:</td>
                  <td class="p-1 bg-white text-center">${f('ir_tester_sr_no', '', '', 'text-center', 'A01148D22')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Wdg. Temp(&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('ir_wdg_temp', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Range:</td>
                  <td class="p-1 bg-white text-center">${f('ir_tester_range', '', '', 'text-center', '1-TO-5 kV')}</td>
                </tr>
                <tr>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Relative Humidity(%):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('ir_humidity', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Voltage Level:</td>
                  <td class="p-1 bg-white text-center">${f('ir_tester_voltage_level', '', '', 'text-center', '')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left">COMBINATION</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center">15 Sec (MΩ)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center">60 Sec (MΩ)</th>
                  <th class="p-3 text-center">Ratio (60s/15s)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">WINDING-EARTH</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('ir_winding_earth_15s', testData['ir_winding_earth_10s'] || '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('ir_winding_earth_60s')}</td>
                  <td class="p-1">${f('ir_winding_earth_ratio')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">2. Ratio Test</h4>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#cbd5e1] mb-4">
            ${f('ratio_meter_make', 'Eltel', 'Meter Make')}
            ${f('ratio_meter_sr_no', '-', 'Meter Sr. No')}
            ${f('ratio_test_date', '-', 'Test Date')}
            ${f('ratio_test_time', '-', 'Test Time')}
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left">TERMINALS</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center">CAL. RATIO</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center">MEASURED RATIO</th>
                  <th class="p-3 text-center">DEVIATION %</th>
                </tr>
              </thead>
              <tbody>
                ${RATIO_TERMINALS.map(term => {
                  const calVal = parseFloat(testData[`ratio_${term}_cal`] || '');
                  const measVal = parseFloat(testData[`ratio_${term}_measured`] || '');
                  let devVal = testData[`ratio_${term}_deviation`];
                  if (!devVal && !isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
                    devVal = (((measVal - calVal) / calVal) * 100).toFixed(2);
                  }
                  return `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f(`ratio_${term}_cal`)}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f(`ratio_${term}_measured`)}</td>
                    <td class="p-1">${devVal ? `<div class="p-2 text-sm font-bold text-center text-industrial-text">${devVal}</div>` : f(`ratio_${term}_deviation`)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">3. Voltage Ratio Test</h4>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead>
                <!-- Process / Voltage Ratio Test Row -->
                <tr class="bg-[#dbeafe] text-slate-800 font-bold uppercase tracking-wider text-xs border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left font-black w-[40%]">PROCESS</th>
                  <th class="p-3 text-center font-black" colspan="2">VOLTAGE RATIO TEST</th>
                </tr>
                <!-- Applied Voltage / Measured Voltage Row -->
                <tr class="bg-[#cbd5e1] text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-center font-bold">APPLIED VOLTAGE (V)</th>
                  <th class="p-3 text-center font-bold" colspan="2">MEASURED VOLTAGE (V)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Scenario 1 -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40">1.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2.1</td>
                  <td class="p-2">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('volt_ratio_sc1_applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('volt_ratio_sc1_m1')}
                  </td>
                  <td class="p-1 bg-white text-center">
                    ${f('volt_ratio_sc1_m2')}
                  </td>
                </tr>

                <!-- Scenario 2 -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40">1.1-2.1</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-[#ffffff] text-center">
                    ${f('volt_ratio_sc2_applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-[#ffffff] text-center">
                    ${f('volt_ratio_sc2_m1')}
                  </td>
                  <td class="p-1 bg-[#ffffff] text-center">
                    ${f('volt_ratio_sc2_m2')}
                  </td>
                </tr>

                <!-- Scenario 3 -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40">2.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2">1.1-2.1</td>
                </tr>
                <tr class="border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('volt_ratio_sc3_applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('volt_ratio_sc3_m1')}
                  </td>
                  <td class="p-1 bg-white text-center">
                    ${f('volt_ratio_sc3_m2')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">4. Magnetizing Current Test</h4>
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-6 rounded-xl space-y-4 mb-4 text-xs">
            <!-- Header 1: Applied Voltage (V), Date, Time -->
            <div class="border border-[#cbd5e1] grid grid-cols-6 items-center text-xs rounded-t-lg overflow-hidden">
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                APPLIED VOLTAGE (V) :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('mag_applied_volt', '')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                DATE:
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('mag_date', '')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                TIME:
              </div>
              <div class="p-1 col-span-1">
                ${f('mag_time', '')}
              </div>
            </div>

            <!-- Header 2: Meter details -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                METER MAKE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('mag_meter_make', 'HTC')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                SR NO. :
              </div>
              <div class="p-1 col-span-1">
                ${f('mag_meter_sr_no', 'HTC2406CG0246')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left">TEMINALS</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center uppercase">
                    <div>APPLIED VOLTAGE (V)</div>
                    <div class="text-[10px] font-bold text-[#64748b] mt-1 normal-case">(1Φ 200VOLT APPLIED )</div>
                  </th>
                  <th class="p-3 text-center">MEASURED CURRENT <span class="normal-case">(mA)</span></th>
                </tr>
              </thead>
              <tbody>
                ${MAG_TERMINALS.map(term => `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`mag_curr_${term}_v`)}</td>
                    <td class="p-1 text-center">${f(`mag_curr_${term}_measured`)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">5. Winding Resistance Test</h4>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#cbd5e1] mb-4">
            ${f('res_meter_make', '-', 'Meter Make')}
            ${f('res_meter_sr_no', '-', 'Meter Sr. No')}
            ${f('res_meter_range', '-', 'Range')}
            ${f('res_test_date', '-', 'Test Date')}
            ${f('res_test_time', '-', 'Test Time')}
          </div>
          <div class="grid grid-cols-4 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#cbd5e1] mb-4">
            ${f('res_env_wdg', '-', 'Wdg Temp (°C)')}
            ${f('res_env_core', '-', 'Core Temp (°C)')}
            ${f('res_env_ambient', '-', 'Ambient Temp (°C)')}
            ${f('res_env_humidity', '-', 'Humidity (%)')}
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left">TEMINALS</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center">
                    <div>Resistance @ Amb.</div>
                    <div class="text-[10px] font-bold text-[#64748b] mt-1">Ω</div>
                  </th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center bg-orange-50 text-orange-800">
                    <div>Resistance @75°C</div>
                    <div class="text-[10px] font-bold text-orange-800 mt-1">Ω</div>
                  </th>
                  <th class="p-3 text-center">
                    <div>MAX. GUARANTEED @75°C</div>
                    <div class="text-[10px] font-bold text-[#64748b] mt-1">Ω</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${MAG_TERMINALS.map(term => {
                  const ambVal = parseFloat(testData[`res_winding_${term}_amb`] || '');
                  let tempValue = parseFloat(testData['res_env_wdg'] || '');
                  if (isNaN(tempValue)) {
                    tempValue = parseFloat(testData['res_env_ambient'] || '26');
                  }
                  let r75Val = testData[`res_winding_${term}_75c`];
                  if (!r75Val && !isNaN(ambVal) && !isNaN(tempValue)) {
                    r75Val = (((235 + 75) / (235 + tempValue)) * ambVal).toFixed(4);
                  }
                  return `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`res_winding_${term}_amb`)}</td>
                    <td class="p-1 border-r border-[#cbd5e1] bg-orange-50/10 text-center font-bold">${r75Val ? `<div class="p-2 text-sm font-bold text-center text-industrial-text">${r75Val}</div>` : f(`res_winding_${term}_75c`)}</td>
                    <td class="p-1 text-center">${f(`res_winding_${term}_guaranteed`, getPreConnWindingResMaxGuaranteed(term, jobMeta?.type, jobMeta?.capacity))}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 5. POST-CONNECTION TEST
  if (testName === 'POST-CONNECTION TEST') {
    const RATIO_TERMINALS = ['(1.1-2.)-(2.1-2)', '(1.1-2)-(2.1-1.1)', '(1.1-2.1)-(2-2.1)'];
    const MAG_TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

    const scV1 = parseFloat(testData['pct_sc_v1'] || '');
    const scRef1 = parseFloat(testData['pct_sc_ref1'] || '');
    const scZ1Str = calculatePostConnScImpedanceZ(scV1, scRef1, jobMeta?.type, jobMeta?.capacity);

    const scV2 = parseFloat(testData['pct_sc_v2'] || '');
    const scRef2 = parseFloat(testData['pct_sc_ref2'] || '');
    const scZ2Str = calculatePostConnScImpedanceZ(scV2, scRef2, jobMeta?.type, jobMeta?.capacity);

    const pct_sc_z_val = testData['pct_sc_z'] || scZ1Str;
    const pct_sc_z2_val = testData['pct_sc_z2'] || scZ2Str;

    return `
      <div class="space-y-8">
        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">1. Measurement of IR Values</h4>
          <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1]">
            <div class="grid grid-cols-2 gap-4">
              ${f('pct_date', '-', 'Date')}
              ${f('pct_time', '-', 'Time')}
              ${f('pct_amb_temp', '-', 'Amb. Temp (⁰C)')}
              ${f('pct_wdg_temp', '-', 'Wdg. Temp (⁰C)')}
              ${f('pct_core_temp', '-', 'Core Temp (⁰C)')}
              ${f('pct_humidity', '-', 'Relative Humidity (%)')}
            </div>
            <div>
              <h6 class="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 mb-2 text-left">Insulation Tester Details</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('pct_tester_make', '-', 'Make')}
                ${f('pct_tester_sr_no', '-', 'Sr. No')}
                ${f('pct_tester_range', '-', 'Range')}
                ${f('pct_tester_v_level', '-', 'Voltage Level')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-left">Combination</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">15 Sec (MΩ)</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">60 Sec (MΩ)</th>
                  <th class="p-4 text-center">Ratio (60/15s)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">WINDING-EARTH</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('pct_ir_15s', testData['pct_ir_10s'] || '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('pct_ir_60s')}</td>
                  <td class="p-1">${f('pct_ir_ratio')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">2. Ratio Test</h4>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#cbd5e1] mb-4">
            ${f('pct_ratio_meter_make', 'Eltel', 'Meter Make')}
            ${f('pct_ratio_meter_sr_no', '-', 'Meter Sr. No')}
            ${f('pct_ratio_test_date', '-', 'Test Date')}
            ${f('pct_ratio_test_time', '-', 'Test Time')}
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-left">Terminals</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">CAL. RATIO</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">MEASURED RATIO</th>
                  <th class="p-4 text-center">DEVIATION %</th>
                </tr>
              </thead>
              <tbody>
                ${RATIO_TERMINALS.map(term => {
                  const calRatios: Record<string, string> = {
                    '(1.1-2.)-(2.1-2)': '2',
                    '(1.1-2)-(2.1-1.1)': '2',
                    '(1.1-2.1)-(2-2.1)': '1'
                  };
                  const calVal = parseFloat(testData[`pct_ratio_${term}_cal`] || calRatios[term] || '');
                  const measVal = parseFloat(testData[`pct_ratio_${term}_measured`] || '');
                  let devVal = testData[`pct_ratio_${term}_dev`];
                  if (!devVal && !isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
                    devVal = (((measVal - calVal) / calVal) * 100).toFixed(2);
                  }
                  return `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f(`pct_ratio_${term}_cal`, calRatios[term] || '')}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f(`pct_ratio_${term}_measured`)}</td>
                    <td class="p-1">${devVal ? `<div class="p-2 text-sm font-bold text-center text-industrial-text">${devVal}</div>` : f(`pct_ratio_${term}_dev`)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">3. Voltage Ratio Test</h4>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead>
                <!-- Process / Voltage Ratio Test Row -->
                <tr class="bg-[#dbeafe] text-slate-800 font-bold uppercase tracking-wider text-xs border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left font-black w-[40%]">PROCESS</th>
                  <th class="p-3 text-center font-black" colspan="2">VOLTAGE RATIO TEST</th>
                </tr>
                <!-- Applied Voltage / Measured Voltage Row -->
                <tr class="bg-[#cbd5e1] text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-center font-bold">APPLIED VOLTAGE (V)</th>
                  <th class="p-3 text-center font-bold" colspan="2">MEASURED VOLTAGE (V)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Scenario 1 -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40">1.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2.1</td>
                  <td class="p-2">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('pct_volt_ratio_sc1_applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('pct_volt_ratio_sc1_m1')}
                  </td>
                  <td class="p-1 bg-white text-center">
                    ${f('pct_volt_ratio_sc1_m2')}
                  </td>
                </tr>

                <!-- Scenario 2 -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40">1.1-2.1</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-[#ffffff] text-center">
                    ${f('pct_volt_ratio_sc2_applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-[#ffffff] text-center">
                    ${f('pct_volt_ratio_sc2_m1')}
                  </td>
                  <td class="p-1 bg-[#ffffff] text-center">
                    ${f('pct_volt_ratio_sc2_m2')}
                  </td>
                </tr>

                <!-- Scenario 3 -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40">2.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2">1.1-2.1</td>
                </tr>
                <tr class="border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('pct_volt_ratio_sc3_applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('pct_volt_ratio_sc3_m1')}
                  </td>
                  <td class="p-1 bg-white text-center">
                    ${f('pct_volt_ratio_sc3_m2')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">4. Magnetizing Current Test</h4>
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-6 rounded-xl space-y-4 mb-4 text-xs">
            <!-- Header 1: Applied Voltage (V), Date, Time -->
            <div class="border border-[#cbd5e1] grid grid-cols-6 items-center text-xs rounded-t-lg overflow-hidden">
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                APPLIED VOLTAGE (V) :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('pct_mag_volt', '')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                DATE:
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('pct_mag_date', '')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                TIME:
              </div>
              <div class="p-1 col-span-1">
                ${f('pct_mag_time', '')}
              </div>
            </div>

            <!-- Header 2: Meter details -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                METER MAKE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('pct_mag_meter_make', 'HTC')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                SR NO. :
              </div>
              <div class="p-1 col-span-1">
                ${f('pct_mag_sr_no', 'HTC2406CG0246')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-left">Terminals</th>
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-center">Applied Voltage (V)</th>
                  <th class="p-4 border-b border-[#cbd5e1] text-center">MEASURED CURRENT <span class="normal-case">(mA)</span></th>
                </tr>
              </thead>
              <tbody>
                ${MAG_TERMINALS.map(term => `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-b border-[#cbd5e1]">${f(`pct_mag_${term}_v`)}</td>
                    <td class="p-1">${f(`pct_mag_${term}_ma`)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">5. Short Circuit Test</h4>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#cbd5e1] mb-4">
            ${f('pct_sc_meter_make', 'HTC', 'Meter Make')}
            ${f('pct_sc_sr_no', 'HTC2406CG0246', 'Meter Sr. No')}
            ${f('pct_sc_applied', '-', 'Applied Voltage')}
            ${f('pct_sc_date', '-', 'Test Date')}
            ${f('pct_sc_time', '-', 'Test Time')}
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-center font-bold">TEMINALS</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center font-bold">APPLIED VOLTAGE (V)</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center font-bold">MEASURED CURRENT (A)</th>
                  <th class="p-4 text-center font-bold">MEASURED CURRENT (A)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Row 1 Subheader / Config -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40" rowspan="2">-</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1</td>
                  <td class="p-2 font-bold bg-[#f1f5f9]/50">2-2.1 (Short)</td>
                </tr>
                <!-- Row 1 Inputs -->
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('pct_sc_v1', '-', 'Applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('pct_sc_a1', '-', 'Measured')}
                  </td>
                  <td class="p-1 bg-white text-center">
                    ${f('pct_sc_ref1', '-', 'Short')}
                  </td>
                </tr>

                <!-- Row 2 Subheader / Config -->
                <tr class="bg-[#f8fafc] text-slate-700 font-bold tracking-wider text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-black text-blue-900 bg-blue-50/40" rowspan="2">-</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">2</td>
                  <td class="p-2 font-bold bg-[#f1f5f9]/50">1.1-2.1 (Short)</td>
                </tr>
                <!-- Row 2 Inputs -->
                <tr class="border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1] bg-[#ffffff] text-center">
                    ${f('pct_sc_v2', '-', 'Applied')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-[#ffffff] text-center">
                    ${f('pct_sc_a2', '-', 'Measured')}
                  </td>
                  <td class="p-1 bg-[#ffffff] text-center">
                    ${f('pct_sc_ref2', '-', 'Short')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-col items-center gap-4 mt-4">
            <div class="text-center font-black text-sm uppercase tracking-wider text-slate-500">
              % IMPEDANCE
            </div>
            <div class="grid grid-cols-3 bg-[#cbd5e1]/40 border border-[#cbd5e1] rounded-xl text-center items-center font-bold text-sm max-w-md w-full overflow-hidden shadow-sm text-xs font-mono">
              <div class="p-3 border-r border-b border-[#cbd5e1] font-extrabold text-slate-800 uppercase text-[10px]">
                % Z (Row 1) =
              </div>
              <div class="p-1 border-r border-b border-[#cbd5e1] bg-white">
                ${f('pct_sc_z', pct_sc_z_val, '', '', '')}
              </div>
              <div class="p-3 border-b border-[#cbd5e1] font-extrabold text-slate-800">
                %
              </div>
              <div class="p-3 border-r border-[#cbd5e1] font-extrabold text-slate-800 uppercase text-[10px]">
                % Z (Row 2) =
              </div>
              <div class="p-1 border-r border-[#cbd5e1] bg-white">
                ${f('pct_sc_z2', pct_sc_z2_val, '', '', '')}
              </div>
              <div class="p-3 font-extrabold text-slate-800">
                %
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-black uppercase tracking-widest text-[#2563eb] border-b pb-2 text-left">6. Winding Resistance Test</h4>
          <div class="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-4 bg-[#f8fafc]/50 p-4 rounded border border-[#cbd5e1] text-left">
             ${f('pct_res_meter_make', '-', 'Meter Make')}
             ${f('pct_res_sr_no', '-', 'Meter Sr. No.')}
             ${f('pct_res_range', '-', 'Range')}
             ${f('pct_res_wdg_temp', '-', 'Wdg Temp (°C)')}
             ${f('pct_res_core_temp', '-', 'Core Temp (°C)')}
             ${f('pct_res_amb_temp', '-', 'Ambient (°C)')}
             ${f('pct_res_humidity', '-', 'Humidity (%)')}
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-left">TEMINALS</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center font-bold">
                    <div>RESISTANCE @ AMB.</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1">Ω</div>
                  </th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center bg-orange-50 text-orange-800 font-bold">
                    <div>RESISTANCE @75°C</div>
                    <div class="text-[10px] font-bold text-orange-800 mt-1">Ω</div>
                  </th>
                  <th class="p-4 border-b border-[#cbd5e1] text-center font-bold">
                    <div>MAX. GUARANTEED @75°C</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1">Ω</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${MAG_TERMINALS.map(term => `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`pct_res_${term}_amb`, '-')}</td>
                    <td class="p-1 border-r border-[#cbd5e1] bg-orange-50/10 text-center font-extrabold text-orange-700">${f(`pct_res_${term}_75c`, '-')}</td>
                    <td class="p-1 text-center">${f(`pct_res_${term}_max`, getPostConnWindingResMaxGuaranteed(term, jobMeta?.type, jobMeta?.capacity))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 6. PRE & POST VPD SERVICING
  if (testName === 'PRE & POST VPD SERVICING') {
    const PROCESSES = ['PRE-SERVICING', 'POST-SERVICING'];
    const MAG_ROWS = ['1.1-2.1', '2-2.1', '1.1-2'];
    const TEST_2KV_ROWS = ['CORE-FRAME', 'FRAME-FRAME'];
    const TEST_2KV_DISPLAY: Record<string, string> = {
      'CORE-FRAME': 'Core- Frame',
      'FRAME-FRAME': 'Frame-Frame'
    };
    
    return `
      <div class="space-y-8">
        <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1]">
          <div>
            <h4 class="text-xs font-bold text-[#2563eb] uppercase tracking-widest border-b pb-2 mb-4 text-left">Insulation Tester</h4>
            <div class="grid grid-cols-2 gap-4">
              ${f('vpd_tester_make', 'MEGGER', 'Make')}
              ${f('vpd_tester_range', '1-TO-5 kV', 'Range')}
              ${f('vpd_tester_sr_no', '101979324', 'Sr. No')}
              ${f('vpd_tester_v_level', '-', 'Voltage Level')}
            </div>
          </div>
          <div>
            <h4 class="text-xs font-bold text-[#2563eb] uppercase tracking-widest border-b pb-2 mb-4 text-left">Multimeter Details</h4>
            <div class="grid grid-cols-2 gap-4">
              ${f('vpd_meter_make', 'HTC', 'Make')}
              ${f('vpd_meter_sr_no', 'HTC2201CG0011', 'Sr. No')}
            </div>
          </div>
        </div>

        ${PROCESSES.map(process => {
          const p = process.toLowerCase();
          const v15 = parseFloat(testData[`${p}_ir_15s`] || '');
          const v60 = parseFloat(testData[`${p}_ir_60s`] || '');
          let autoRatio = '-';
          if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
            autoRatio = (v60 / v15).toFixed(2);
          }
          const finalRatio = testData[`${p}_ir_ratio`] !== undefined && testData[`${p}_ir_ratio`] !== '' ? testData[`${p}_ir_ratio`] : autoRatio;

          return `
          <div class="space-y-6 pt-8 border-t border-[#cbd5e1] mt-8">
            <div class="bg-[#f8fafc] px-6 py-2 border-b border-[#cbd5e1] text-left">
              <span class="text-sm font-bold uppercase tracking-widest text-[#2563eb]">${process} TESTING</span>
            </div>

            <div class="grid grid-cols-4 gap-4 bg-[#f8fafc]/50 p-4 rounded-lg border border-[#cbd5e1]">
              ${f(`${p}_date`, '-', 'Date')}
              ${f(`${p}_time`, '-', 'Time')}
              ${f(`${p}_amb_temp`, '-', 'Amb. Temp (⁰C)')}
              ${f(`${p}_wdg_temp`, '-', 'Wdg. Temp. (⁰C)')}
              ${f(`${p}_humidity`, '-', 'Relative Humidity (%)')}
              ${f(`${p}_core_temp`, '-', 'Core Temp. (⁰C)')}
            </div>

            <div class="border border-[#cbd5e1] rounded-xl h-fit overflow-hidden">
              <table class="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr class="bg-[#f8fafc] font-bold text-center border-b border-[#cbd5e1] text-slate-800 uppercase">
                    <th class="p-4 border-r border-[#cbd5e1] text-left font-bold w-1/4">COMBINATION</th>
                    <th class="p-4 border-r border-[#cbd5e1] text-center font-bold w-1/4">15 SEC (MΩ)</th>
                    <th class="p-4 border-r border-[#cbd5e1] text-center font-bold w-1/4">60 SEC (MΩ)</th>
                    <th class="p-4 text-center font-bold w-1/4">RATIO (60/15S)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left uppercase">WINDING-EARTH</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center bg-slate-50/50">${f(`${p}_ir_15s`)}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center bg-slate-50/50">${f(`${p}_ir_60s`)}</td>
                    <td class="p-1 text-center font-bold bg-slate-50/50">${f(`${p}_ir_ratio`, finalRatio)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
              <div class="bg-[#f8fafc] px-4 py-2 border-b border-[#cbd5e1] font-bold text-xs uppercase text-left">MAGNETISING CURRENT TEST (1Φ 200V)</div>
              <table class="w-full text-xs font-mono">
                <thead class="bg-[#f8fafc]">
                  <tr class="border-b border-[#cbd5e1]">
                    <th class="p-3 border-r border-[#cbd5e1] text-left w-1/3"></th>
                    <th class="p-3 border-r border-[#cbd5e1] text-center w-1/3 font-bold text-xs">
                      Applied Voltage (V)<br />
                      <span class="text-[10px] font-normal uppercase">(1Φ 200 VOLT APPLIED )</span>
                    </th>
                    <th class="p-3 text-center w-1/3 font-bold text-xs">
                      Measured Current (mA)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${MAG_ROWS.map(row => `
                    <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                      <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${row}</td>
                      <td class="p-1 border-r border-[#cbd5e1]">${f(`${p}_mag_${row}_v`, '200')}</td>
                      <td class="p-1">${f(`${p}_mag_${row}_ma`)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-6">
              <div class="bg-[#f8fafc] px-4 py-2 border-b border-[#cbd5e1] font-bold text-xs uppercase text-left">2 KV TEST</div>
              <table class="w-full text-xs font-mono">
                <thead class="bg-[#f8fafc]">
                  <tr class="border-b border-[#cbd5e1]">
                    <th class="p-3 border-r border-[#cbd5e1] text-left w-1/3"></th>
                    <th class="p-3 border-r border-[#cbd5e1] text-center w-1/3 font-bold text-xs">Voltage Applied (kV)</th>
                    <th class="p-3 border-r border-[#cbd5e1] text-center w-1/3 font-bold text-xs">Duration (Sec)</th>
                    <th class="p-3 text-center w-1/3 font-bold text-xs">Leakage Current (mA)</th>
                  </tr>
                </thead>
                <tbody>
                  ${TEST_2KV_ROWS.map(row => `
                    <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                      <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${TEST_2KV_DISPLAY[row] || row}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`${p}_2kv_${row}_v`, '2')}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`${p}_2kv_${row}_sec`, '60')}</td>
                      <td class="p-1 text-center">${f(`${p}_2kv_${row}_ma`)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 7. OIL SOAKING SERVICING PLANNING
  if (testName.toUpperCase().includes('OIL SOAKING') || testName.toUpperCase().includes('SERVICING PLANNING')) {
    const STAGES = ['BEFORE', 'AFTER'];
    const ROWS = ['Core- Frame', 'Frame-Frame', 'Frame-Tank', 'CORE-Tank'];

    return `
      <div class="space-y-8">
        <div class="bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1]">
          <h4 class="text-xs font-bold text-[#2563eb] uppercase tracking-widest border-b border-[#cbd5e1] pb-2 mb-4 text-left">Details of Insulation Tester</h4>
          <div class="grid grid-cols-4 gap-6">
            ${f('oil_tester_make', 'MEGGER', 'Make')}
            ${f('oil_tester_range', '1-TO-5 kV', 'Range')}
            ${f('oil_tester_sr_no', 'A01148D22', 'Sr. No')}
            ${f('oil_tester_v_level', '1000V', 'Voltage Level')}
          </div>
        </div>

        <div class="bg-green-600 text-white text-center py-2 font-bold uppercase tracking-[0.3em] rounded">
          IR TEST
        </div>

        ${STAGES.map(stage => `
          <div class="space-y-6 pt-6 first:pt-0 mt-8">
            <div class="bg-[#f8fafc] px-6 py-2 border-b border-[#cbd5e1] text-left">
              <span class="text-xs font-black uppercase tracking-[0.2em] text-[#2563eb]">${stage} SERVICING</span>
            </div>

            <div class="grid grid-cols-4 gap-4 bg-[#f8fafc]/50 p-4 rounded-lg border border-[#cbd5e1]">
              ${f(`${stage.toLowerCase()}_date`, '-', 'Date')}
              ${f(`${stage.toLowerCase()}_time`, '-', 'Time')}
              ${f(`${stage.toLowerCase()}_amb_temp`, '-', 'Amb. Temp (⁰C)')}
              ${f(`${stage.toLowerCase()}_wdg_temp`, '-', 'Wdg. Temp (⁰C)')}
              ${f(`${stage.toLowerCase()}_humidity`, '-', 'Relative Humidity (%)')}
              ${f(`${stage.toLowerCase()}_core_temp`, '-', 'Core Temp (⁰C)')}
            </div>

            <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
              <table class="w-full text-xs font-mono">
                <thead class="bg-[#f8fafc]">
                  <tr class="border-b border-[#cbd5e1]">
                    <th class="p-4 border-r border-[#cbd5e1] text-left"></th>
                    <th class="p-4 border-r border-[#cbd5e1] text-center font-bold">voltage applied (kV)</th>
                    <th class="p-4 border-r border-[#cbd5e1] text-center font-bold">Duration (Sec)</th>
                    <th class="p-4 text-center font-bold">MΩ</th>
                  </tr>
                </thead>
                <tbody>
                  ${ROWS.map(row => `
                    <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                      <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-center">${row}</td>
                      <td class="p-1 border-r border-[#cbd5e1]">${f(`${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_v`, '1')}</td>
                      <td class="p-1 border-r border-[#cbd5e1]">${f(`${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_sec`, '60')}</td>
                      <td class="p-1">${f(`${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_mohm`)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 8. POST-TANKING TEST
  if (testName === 'POST-TANKING TEST') {
    const TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

    // Auto calculate %Z if not present in testData
    const v1 = parseFloat(testData['pt_sc_v1'] || '');
    const ref1 = parseFloat(testData['pt_sc_ref1'] || '');
    const calculatedPTZ = calculatePostTankingScImpedanceZ(v1, ref1, jobMeta?.type, jobMeta?.capacity);

    const v2 = parseFloat(testData['pt_sc_v2'] || '');
    const ref2 = parseFloat(testData['pt_sc_ref2'] || '');
    const calculatedPTZ2 = calculatePostTankingScImpedanceZ(v2, ref2, jobMeta?.type, jobMeta?.capacity);

    // Auto calculate IR ratio if not present in testData
    const v15 = parseFloat(testData['pt_ir_15s'] || '');
    const v60 = parseFloat(testData['pt_ir_60s'] || '');
    let calculatedIRRatio = '';
    if (!isNaN(v15) && !isNaN(v60) && v15 !== 0) {
      calculatedIRRatio = (v60 / v15).toFixed(2);
    }

    return `
      <div class="space-y-8">
        <div class="space-y-6">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">1. Measurement of IR Values</h4>
          <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1]">
            <div class="grid grid-cols-2 gap-4">
              ${f('pt_date', '-', 'Date')}
              ${f('pt_time', '-', 'Time')}
              ${f('pt_amb_temp', '-', 'Amb. Temp (⁰C)')}
              ${f('pt_wdg_temp', '-', 'Wdg. Temp (⁰C)')}
              ${f('pt_core_temp', '-', 'Core Temp (⁰C)')}
              ${f('pt_humidity', '-', 'Relative Humidity (%)')}
            </div>
            <div>
              <h6 class="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 mb-2 text-left">Insulation Tester Details</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('pt_tester_make', '', 'Make')}
                ${f('pt_tester_sr_no', '', 'Sr. No')}
                ${f('pt_tester_range', '', 'Range')}
                ${f('pt_tester_v_level', '-', 'Voltage Level')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-left">Combination</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">15 Sec (MΩ)</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">60 Sec (MΩ)</th>
                  <th class="p-4 text-center">Ratio of 60 Sec/ 15 Sec</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">WINDING-EARTH</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('pt_ir_15s', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('pt_ir_60s', '')}</td>
                  <td class="p-1">${f('pt_ir_ratio', calculatedIRRatio)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4 max-w-xl">
            <table class="w-full text-xs font-mono border-collapse">
              <tbody>
                ${[
                  { key: 'core_to_frame', label: 'core to frame :' },
                  { key: 'core_to_tank', label: 'core to tank :' },
                  { key: 'frame_to_tank', label: 'frame to tank :' },
                ].map(row => `
                  <tr class="border-b border-[#cbd5e1] last:border-0">
                    <td class="p-3 border-r border-[#cbd5e1] text-left font-medium">${row.label}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`pt_ir_${row.key}`)}</td>
                    <td class="p-3 text-center text-slate-500">(MΩ)</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">2. Ratio Test</h4>
          <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1] text-xs">
            <div class="space-y-4">
              <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 text-left">Ratio Meter Details</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('pt_ratio_meter_make', '', 'Meter Make')}
                ${f('pt_ratio_meter_sr_no', '', 'Sr. No.')}
              </div>
            </div>
            <div class="space-y-4">
              <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 text-left">Test Date & Time</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('pt_ratio_test_date', '-', 'Test Date')}
                ${f('pt_ratio_test_time', '-', 'Test Time')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-left">Terminals</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">CAL. RATIO</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">MEASURED RATIO</th>
                  <th class="p-4 text-center">DEVIATION %</th>
                </tr>
              </thead>
              <tbody>
                ${TERMINALS.map(term => {
                  const ptRatios: Record<string, string> = {
                    '1.1-2': '2',
                    '1.1-2.1': '2',
                    '2.1-2': '1'
                  };
                  const calVal = parseFloat(testData[`pt_ratio_${term}_cal`] || ptRatios[term] || '');
                  const measVal = parseFloat(testData[`pt_ratio_${term}_measured`] || '');
                  let devVal = testData[`pt_ratio_${term}_dev`];
                  if (!devVal && !isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
                    devVal = (((measVal - calVal) / calVal) * 100).toFixed(2);
                  }
                  return `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f(`pt_ratio_${term}_cal`, ptRatios[term])}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f(`pt_ratio_${term}_measured`)}</td>
                    <td class="p-1">${devVal ? `<div class="p-2 text-sm font-bold text-center text-slate-800">${devVal}</div>` : f(`pt_ratio_${term}_dev`)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="p-4 bg-slate-50 border-t border-[#cbd5e1] text-[11px] font-semibold text-slate-500 flex justify-between">
              <span>Allowable deviation is &plusmn;0.5% as per IS 2026 / IEC 60076</span>
              <span class="italic text-[#2563eb]">Formula: % Deviation = ((Measured Ratio - Cal. Ratio) / Cal. Ratio) * 100</span>
            </div>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">3. Voltage Ratio Test</h4>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono border-collapse">
              <thead>
                <tr class="bg-blue-50/70 font-bold uppercase text-xs border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left w-2/5">PROCESS</th>
                  <th class="p-3 text-center" colSpan="2">VOLTAGE RATIO TEST</th>
                </tr>
                <tr class="bg-slate-50 font-bold uppercase text-xs border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-center">APPLIED VOLTAGE (V)</th>
                  <th class="p-3 text-center" colSpan="2">MEASURED VOLTAGE (V)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-slate-50/40 text-slate-600 font-bold text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-extrabold text-blue-900 bg-blue-50/30">1.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2.1</td>
                  <td class="p-2">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">${f('pt_volt_ratio_sc1_applied')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">${f('pt_volt_ratio_sc1_m1')}</td>
                  <td class="p-1 bg-white">${f('pt_volt_ratio_sc1_m2')}</td>
                </tr>

                <tr class="bg-slate-50/40 text-slate-600 font-bold text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-extrabold text-blue-900 bg-blue-50/30">1.1-2.1</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">${f('pt_volt_ratio_sc2_applied')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">${f('pt_volt_ratio_sc2_m1')}</td>
                  <td class="p-1 bg-white">${f('pt_volt_ratio_sc2_m2')}</td>
                </tr>

                <tr class="bg-slate-50/40 text-slate-600 font-bold text-[11px] text-center border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] font-extrabold text-blue-900 bg-blue-50/30">2.1-2</td>
                  <td class="p-2 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-2">1.1-2.1</td>
                </tr>
                <tr class="border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">${f('pt_volt_ratio_sc3_applied')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">${f('pt_volt_ratio_sc3_m1')}</td>
                  <td class="p-1 bg-white">${f('pt_volt_ratio_sc3_m2')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">4. Magnetizing Current Test</h4>
          <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1] text-xs pb-4">
            <div class="space-y-4">
              <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 text-left">Test Instruments & Details</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('pt_mag_meter_make', '', 'Meter Make')}
                ${f('pt_mag_sr_no', '', 'Sr. No.')}
              </div>
            </div>
            <div class="space-y-4">
              <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 text-left">Test Parameters & Schedule</h6>
              <div class="grid grid-cols-3 gap-4">
                ${f('pt_mag_volt', '-', 'Applied Voltage')}
                ${f('pt_mag_date', '-', 'Date')}
                ${f('pt_mag_time', '-', 'Time')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-left">Terminals</th>
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-center">Applied Voltage (V)</th>
                  <th class="p-4 border-b border-[#cbd5e1] text-center">MEASURED CURRENT <span class="normal-case">(mA)</span></th>
                </tr>
              </thead>
              <tbody>
                ${TERMINALS.map(term => `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-b border-[#cbd5e1]">${f(`pt_mag_${term}_v`)}</td>
                    <td class="p-1">${f(`pt_mag_${term}_ma`)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">5. Short Circuit Test</h4>
          
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-6 rounded-xl space-y-4 mb-4 text-xs">
            <!-- Header 1: Process | Short Circuit Test -->
            <div class="border border-[#cbd5e1] grid grid-cols-5 text-center font-bold text-xs uppercase bg-[#dbeafe] rounded-t-lg overflow-hidden">
              <div class="p-3 border-r border-[#cbd5e1] bg-[#dbeafe] font-bold text-slate-800 col-span-1">
                PROCESS
              </div>
              <div class="p-3 bg-[#e0f2fe] text-blue-900 font-extrabold col-span-4 tracking-wider">
                SHORT CIRCUIT TEST
              </div>
            </div>

            <!-- Header 2: Applied Voltage, Date, Time -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-6 items-center text-xs">
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                APPLIED VOLTAGE (V) :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('pt_sc_applied', '', '', '', '1Φ 20 VOLT APPLIED')}
              </div>
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                DATE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('pt_sc_date', '', '', '', 'DD/MM/YYYY')}
              </div>
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                TIME :
              </div>
              <div class="p-1 col-span-1">
                ${f('pt_sc_time', '', '', '', 'HH:MM')}
              </div>
            </div>

            <!-- Header 3: Meter details -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                METER MAKE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('pt_sc_meter_make', '', '', '', 'HTC')}
              </div>
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                SR.NO.:
              </div>
              <div class="p-1 col-span-1">
                ${f('pt_sc_sr_no', '', '', '', 'HTC2406CG0246')}
              </div>
            </div>
          </div>

          <!-- Table exactly matching excel layout -->
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono border-collapse text-center">
              <thead>
                <tr class="bg-slate-200 border-b border-[#cbd5e1] font-bold">
                  <th class="p-3 border-r border-[#cbd5e1] w-[10%] bg-slate-50"></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider w-[30%]">APPLIED VOLTAGE (V)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider w-[30%]">MEASURED CURRENT (A)</th>
                  <th class="p-3 text-center text-slate-700 uppercase tracking-wider w-[30%]">MEASURED CURRENT (A)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Row 1 static text -->
                <tr class="bg-slate-50 border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50/70" rowspan="2">-</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1</td>
                  <td class="p-3 bg-slate-50/20 font-bold text-center">2-2.1 (Short)</td>
                </tr>
                <!-- Row 1 subheader / user inputs -->
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('pt_sc_v1', '', '', '', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('pt_sc_a1', '', '', '', '')}
                  </td>
                  <td class="p-1 bg-white">
                    ${f('pt_sc_ref1', '', '', '', '')}
                  </td>
                </tr>

                <!-- Row 2 static text -->
                <tr class="bg-slate-50 border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50/70" rowspan="2">-</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 border-r border-[#cbd5e1]">2</td>
                  <td class="p-3 bg-slate-50/20 font-bold text-center">1.1-2.1 (Short)</td>
                </tr>
                <!-- Row 2 subheader / user inputs -->
                <tr class="border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('pt_sc_v2', '', '', '', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('pt_sc_a2', '', '', '', '')}
                  </td>
                  <td class="p-1 bg-white">
                    ${f('pt_sc_ref2', '', '', '', '')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Impedance box matching excel -->
          <div class="flex flex-col items-center mt-6">
            <div class="w-1/2">
              <div class="bg-[#cbd5e1]/40 border border-[#cbd5e1] rounded-t-lg p-2 text-center text-xs font-black uppercase text-slate-800 tracking-wider">
                % IMPEDANCE
              </div>
              <div class="grid grid-cols-3 bg-slate-100 border-x border-b border-[#cbd5e1] rounded-b-lg text-center items-center font-bold text-sm">
                <div class="p-3 border-r border-b border-[#cbd5e1] font-extrabold text-slate-800">
                  % Z =
                </div>
                <div class="p-1 border-r border-b border-[#cbd5e1] bg-white">
                  ${f('pt_sc_z', calculatedPTZ)}
                </div>
                <div class="p-3 border-b border-[#cbd5e1] font-extrabold text-slate-800">
                  %
                </div>
                <div class="p-3 border-r border-[#cbd5e1] font-extrabold text-slate-800">
                  % Z =
                </div>
                <div class="p-1 border-r border-[#cbd5e1] bg-white">
                  ${f('pt_sc_z2', calculatedPTZ2)}
                </div>
                <div class="p-3 font-extrabold text-slate-800">
                  %
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">6. Winding Resistance Test</h4>
          
          <div class="bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1] text-xs mb-4">
            <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 mb-4 text-left">Test Instruments & Details</h6>
            <div class="grid grid-cols-5 gap-4 text-left">
              ${f('pt_res_meter_make', 'PRESTIGE ELECTRONICS', 'Meter Make')}
              ${f('pt_res_meter_sr_no', 'PE/12-JAN/09', 'Sr. No.')}
              ${f('pt_res_range', '1999.9 μΩ-19.999Ω', 'Measurement Range')}
              ${f('pt_res_date', '-', 'Date')}
              ${f('pt_res_time', '-', 'Time')}
            </div>
          </div>

          <!-- Winding Resistance Test Conditions styled exactly like the screenshot -->
          <div class="bg-[#f8fafc] border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm text-left">
            <div class="grid grid-cols-4 gap-6 text-left">
              ${f('pt_wdg_temp_res', '', 'WDG TEMP (°C)', '[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>div]:bg-white [&>div]:border-slate-200 [&>div]:rounded-lg [&>div]:p-2.5 [&>div]:shadow-sm')}
              ${f('pt_core_temp_res', '', 'CORE TEMP (°C)', '[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>div]:bg-white [&>div]:border-slate-200 [&>div]:rounded-lg [&>div]:p-2.5 [&>div]:shadow-sm')}
              ${f('pt_amb_temp_res', '', 'AMBIENT TEMP (°C)', '[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>div]:bg-white [&>div]:border-slate-200 [&>div]:rounded-lg [&>div]:p-2.5 [&>div]:shadow-sm')}
              ${f('pt_humidity_res', '', 'HUMIDITY (%)', '[&>span]:text-slate-500 [&>span]:font-black [&>span]:tracking-wider [&>span]:mb-1.5 [&>div]:bg-white [&>div]:border-slate-200 [&>div]:rounded-lg [&>div]:p-2.5 [&>div]:shadow-sm')}
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc] text-slate-500 uppercase text-[11px] tracking-wider">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left font-black">TEMINALS</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center font-black">
                    <div>RESISTANCE @ AMB.</div>
                    <div class="text-[10px] font-normal text-slate-400">Ω</div>
                  </th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center bg-orange-50/60 text-orange-800 font-black">
                    <div>RESISTANCE @75°C</div>
                    <div class="text-[10px] font-normal text-orange-500">Ω</div>
                  </th>
                  <th class="p-3 border-[#cbd5e1] text-center font-black">
                    <div>MAX. GUARANTEED @75°C</div>
                    <div class="text-[10px] font-normal text-slate-400">Ω</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const rows = [
                    { term: '1.1-2' },
                    { term: '1.1-2.1' },
                    { term: '2.1-2' }
                  ];
                  return rows.map(row => {
                    const max = getPostTankingWindingResMaxGuaranteed(row.term, jobMeta?.type, jobMeta?.capacity);
                    const rAmb = parseFloat(testData[`pt_res_${row.term}_amb`] || '');
                    const windingT = parseFloat(testData['pt_wdg_temp_res'] || '');
                    let calculatedR75 = '';
                    if (!isNaN(rAmb) && !isNaN(windingT)) {
                      calculatedR75 = (((235 + 75) / (235 + windingT)) * rAmb).toFixed(4);
                    }
                    const display75 = testData[`pt_res_${row.term}_75c`] || calculatedR75;
                    return `
                      <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                        <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${row.term}</td>
                        <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${f(`pt_res_${row.term}_amb`, '', '', 'text-center font-bold')}</td>
                        <td class="p-1 border-r border-b border-[#cbd5e1] bg-orange-50/10 text-center">${f(`pt_res_${row.term}_75c`, display75, '', 'text-center text-orange-600 font-black')}</td>
                        <td class="p-1 text-center">${f(`pt_res_${row.term}_max`, max, '', 'text-center font-bold text-slate-700')}</td>
                      </tr>
                    `;
                  }).join('');
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-8">
          <div class="bg-[#f8fafc] px-6 py-3 border-b border-[#cbd5e1] text-left">
            <span class="text-sm font-bold uppercase tracking-widest text-[#2563eb]">VERTICAL - 2KV TESTING</span>
          </div>
          <table class="w-full text-xs font-mono">
            <thead class="bg-[#f8fafc]">
              <tr class="border-b border-[#cbd5e1]">
                <th class="p-3 border-r border-[#cbd5e1] text-left w-48">VERTICAL</th>
                <th class="p-3 border-r border-[#cbd5e1] text-center">voltage applied (kV)</th>
                <th class="p-3 border-r border-[#cbd5e1] text-center">DURATION (Sec)</th>
                <th class="p-3 border-[#cbd5e1] text-center">leakage current (mA)</th>
              </tr>
            </thead>
            <tbody>
              ${['CORE-FRAME', 'FRAME-FRAME'].map(row => {
                const rowKey = row.toLowerCase().replace('-', '_');
                return `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${row}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`pt_2kv_vertical_${rowKey}_voltage`, '2')}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`pt_2kv_vertical_${rowKey}_duration`, '60')}</td>
                    <td class="p-1 text-center">${f(`pt_2kv_vertical_${rowKey}_leakage`)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-8">
          <div class="bg-[#f8fafc] px-6 py-3 border-b border-[#cbd5e1] text-center">
            <span class="text-sm font-bold uppercase tracking-widest text-slate-800">Turret CT IR & Continuity</span>
          </div>
          <table class="w-full text-xs font-mono border-collapse">
            <thead class="bg-[#f8fafc]">
              <tr class="border-b border-[#cbd5e1]">
                <th class="p-3 border-r border-[#cbd5e1] text-center font-bold text-slate-600">Connection</th>
                <th class="p-3 border-r border-[#cbd5e1] text-center font-bold text-slate-600">Applied Voltage</th>
                <th class="p-3 border-r border-[#cbd5e1] text-center font-bold text-slate-600">Duration</th>
                <th class="p-3 border-r border-[#cbd5e1] text-center font-bold text-slate-600 bg-white">MΩ</th>
                <th class="p-3 text-center font-bold text-slate-600 bg-white">Continuity</th>
              </tr>
            </thead>
            <tbody>
              ${[
                { key: '1_1', label: '1.1' },
                { key: '2', label: '2' },
                { key: '2_1', label: '2.1' },
                { key: 'wti', label: 'WTI' },
              ].map(row => `
                <tr class="border-b border-[#cbd5e1] last:border-0">
                  <td class="p-3 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-center">${row.label}</td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50 text-center text-slate-800">1kV</td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50 text-center text-slate-800">60 sec</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f(`pt_turret_${row.key}_mohm`)}</td>
                  <td class="p-1 bg-white text-center">${f(`pt_turret_${row.key}_continuity`)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 9. List of HV Test
  if (testName === 'List of HV Test') {
    const HV_NLL_APPLIED_V_FACTOR = (33000 / 110) * 1.732;
    const calcNllMeterReading = (rowKey: string, field: 'rms_m' | 'rms_a' | 'mean_m' | 'mean_a' | 'curr_m' | 'curr_a' | 'pow_m' | 'pow_kw') => {
      const stored = testData[`hv_nll_${rowKey}_${field}`];
      if (stored) return stored;
      const u1 = parseFloat(testData[`hv_nll_${rowKey}_u1`] || '');
      const u3 = parseFloat(testData[`hv_nll_${rowKey}_u3`] || '');
      const f1 = parseFloat(testData[`hv_nll_${rowKey}_f1`] || '');
      const f3 = parseFloat(testData[`hv_nll_${rowKey}_f3`] || '');
      const i1 = parseFloat(testData[`hv_nll_${rowKey}_i1`] || '');
      const i3 = parseFloat(testData[`hv_nll_${rowKey}_i3`] || '');
      const p = parseFloat(testData[`hv_nll_${rowKey}_p`] || '');

      if (field === 'rms_m' && !isNaN(u1) && !isNaN(u3)) return ((u1 + u3) / 2).toFixed(4);
      if (field === 'rms_a' && !isNaN(u1) && !isNaN(u3)) return (((u1 + u3) / 2) * HV_NLL_APPLIED_V_FACTOR).toFixed(2);
      if (field === 'mean_m' && !isNaN(f1) && !isNaN(f3)) return ((f1 + f3) / 2).toFixed(4);
      if (field === 'mean_a' && !isNaN(f1) && !isNaN(f3)) return (((f1 + f3) / 2) * HV_NLL_APPLIED_V_FACTOR).toFixed(2);
      if (field === 'curr_m' && !isNaN(i1) && !isNaN(i3)) return (((i1 + i3) / 1000) / 2).toFixed(4);
      if (field === 'curr_a' && !isNaN(i1) && !isNaN(i3)) return ((((i1 + i3) / 1000) / 2) * 10).toFixed(3);
      if (field === 'pow_m' && !isNaN(p)) return p.toFixed(4);
      if (field === 'pow_kw' && !isNaN(p)) return (p * 3).toFixed(3);
      return '';
    };

    const vRms = parseFloat(calcNllMeterReading('100', 'rms_a')) || 0;
    const vMean = parseFloat(calcNllMeterReading('100', 'mean_a')) || 0;
    const pMeter = parseFloat(calcNllMeterReading('100', 'pow_m')) || 0;
    const mf = parseFloat(testData['hv_nll_mf']) || 3000;
    
    const autoPm = pMeter > 0 ? (pMeter * mf) / 1000 : 0;
    const pVal = parseFloat(calcNllMeterReading('100', 'pow_kw')) || autoPm;
    
    let dVal = 0;
    let poStr = "0.000";

    if (vMean !== 0) {
      dVal = (vMean - vRms) / vMean;
      const calculatedPo = pVal * (1 + dVal);
      poStr = calculatedPo.toFixed(3);
    }

    const calcHVLLForSummary = (field: string) => {
      const stored = testData[`hv_ll_${field}`];
      if (stored) return stored;
      const llConfig = getHVLLConfig(jobMeta?.type, jobMeta?.capacity);
      const mf = parseFloat(testData['hv_ll_mf'] || String(llConfig.mf)) || llConfig.mf;
      const u1 = parseFloat(testData['hv_ll_u1'] || '');
      const u3 = parseFloat(testData['hv_ll_u3'] || '');
      const i1 = parseFloat(testData['hv_ll_i1'] || '');
      const i3 = parseFloat(testData['hv_ll_i3'] || '');
      const p = parseFloat(testData['hv_ll_p'] || '');
      const ratedV = parseFloat(testData['hv_ll_rated_v'] || String(llConfig.ratedV)) || llConfig.ratedV;
      const ratedA = parseFloat(testData['hv_ll_rated_a'] || llConfig.ratedA) || llConfig.ratedADefault;

      if (field === 'loss_corrected') {
        const appliedA = parseFloat(testData['hv_ll_applied_a'] || '') ||
          (!isNaN(i1) && !isNaN(i3) ? ((i1 + i3) / 2) * llConfig.ctFactor : NaN);
        const meterW = !isNaN(p) ? p : parseFloat(testData['hv_ll_meter_w'] || '');
        if (appliedA > 0 && !isNaN(meterW)) {
          return ((meterW * mf / 1000) * Math.pow(ratedA / appliedA, 2)).toFixed(4);
        }
      }
      if (field === 'z_percent') {
        const appliedA = parseFloat(testData['hv_ll_applied_a'] || '') ||
          (!isNaN(i1) && !isNaN(i3) ? ((i1 + i3) / 2) * llConfig.ctFactor : NaN);
        const measuredV = parseFloat(testData['hv_ll_measured_v'] || '') ||
          (!isNaN(u1) && !isNaN(u3) ? (u1 + u3) * llConfig.ptFactor : NaN);
        if (appliedA > 0 && !isNaN(measuredV)) {
          return ((measuredV / ratedV) * (ratedA / appliedA) * 100).toFixed(4);
        }
      }
      return '';
    };

    const getMajorTestRes = (testName: string) => {
      const fieldKey = `hv_sum_${testName.replace(/ /g, '_')}_res`;
      const stored = testData[fieldKey];
      if (testName === 'No Load loss measurement') {
        return stored || (poStr !== '0.000' ? `${poStr} KW` : '-');
      }
      if (testName === 'Load Loss measurement') {
        const loadLoss = calcHVLLForSummary('loss_corrected');
        return stored || (loadLoss ? `${loadLoss} kW` : '-');
      }
      if (testName === 'Separate source voltage withstand test') {
        return stored || testData['hv_ss_remark'] || 'WITHSTAND';
      }
      if (testName === 'Induced over voltage test') {
        return stored || testData['hv_iv_remark'] || 'NOT WITHSTAND';
      }
      return stored || '-';
    };

    return `
      <div class="space-y-8">
        <div class="space-y-4">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] text-left">1. No Load Losses & No Load Current</h4>
          <div class="space-y-4">
            <div class="overflow-x-auto">
              <table class="w-full text-xs border border-[#cbd5e1] border-collapse font-mono" style="table-layout: fixed;">
                <tbody>
                  <tr>
                    <td class="p-3 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] uppercase text-center" style="width: 35%;" colspan="2">
                      TEST EQUIPMENT DETAILS
                    </td>
                    <td class="p-3 border-b border-[#cbd5e1] font-bold bg-[#f8fafc] uppercase text-center" style="width: 65%;" colspan="4">
                      <div class="flex items-center justify-center gap-2">
                        <span class="text-[10px] text-slate-500">POWER ANALYZER:</span>
                        <span class="font-bold text-slate-800">${testData['hv_nll_meter'] || 'YOKOGAWA MAKE WT3000, SR NO: 91KA21004'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="p-2 border-r border-b border-[#cbd5e1] font-bold bg-slate-50 text-center" style="width: 15%;">CT RATIO</td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800" style="width: 18%;">
                      ${testData['hv_nll_ct_ratio'] || '10/1 A'}
                    </td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] font-bold bg-slate-50 text-center" style="width: 15%;">PT RATIO</td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800" style="width: 22%;">
                      ${testData['hv_nll_pt_ratio'] || '33000/&radic;3/110/&radic;3 V'}
                    </td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] font-bold bg-slate-50 text-center" style="width: 10%;">MF</td>
                    <td class="p-2 border-b border-[#cbd5e1] text-center font-bold text-slate-800" style="width: 20%;">
                      ${testData['hv_nll_mf'] || '3000'}
                    </td>
                  </tr>
                  <tr>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center align-middle bg-slate-50" rowspan="3">
                      <div class="font-bold text-xs uppercase text-slate-700">CT SR. NOS</div>
                      <div class="text-[9px] text-slate-500 mt-1 leading-tight font-sans">MAKE-MOON LIGHT<br/>ELECTICAL</div>
                    </td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center text-slate-800">
                      ${testData['hv_nll_ct_sr_1'] || '06/12/413'}
                    </td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center align-middle bg-slate-50" rowspan="3" colspan="2">
                      <div class="font-bold text-xs uppercase text-slate-700">PT SR. NOS</div>
                      <div class="text-[9px] text-slate-500 mt-1 leading-tight font-sans">MAKE-MOON LIGHT ELECTICAL</div>
                    </td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center text-slate-800" colspan="2">
                      ${testData['hv_nll_pt_sr_1'] || '06/12/417'}
                    </td>
                  </tr>
                  <tr>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center text-slate-800">
                      ${testData['hv_nll_ct_sr_2'] || '06/12/414'}
                    </td>
                    <td class="p-2 border-r border-b border-[#cbd5e1] text-center text-slate-800" colspan="2">
                      ${testData['hv_nll_pt_sr_2'] || '06/12/418'}
                    </td>
                  </tr>
                  <tr>
                    <td class="p-2 border-r border-[#cbd5e1] text-center text-slate-800">
                      ${testData['hv_nll_ct_sr_3'] || '06/12/416'}
                    </td>
                    <td class="p-2 border-[#cbd5e1] text-center text-slate-800" colspan="2">
                      ${testData['hv_nll_pt_sr_3'] || '06/12/420'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-[10px] font-mono border-collapse" style="table-layout: fixed;">
              <thead class="bg-[#f8fafc] border-b border-[#cbd5e1]">
                <tr>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600" style="width: 10%;"></th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600">U1</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600">U3</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600">F1</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600">F3</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600">I1</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600">I3</th>
                  <th class="p-2 text-center font-bold text-slate-600">P</th>
                </tr>
              </thead>
              <tbody>
                ${['90%', '100%', '110%'].map(v => {
                  const rowKey = v.replace('%', '');
                  const columns = ['u1', 'u3', 'f1', 'f3', 'i1', 'i3', 'p'];
                  return `
                    <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                      <td class="p-2 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-center">${v}</td>
                      ${columns.map((col, i) => `
                        <td class="p-1 ${i < columns.length - 1 ? 'border-r border-[#cbd5e1]' : ''} text-center text-slate-800">
                          ${testData[`hv_nll_${rowKey}_${col}`] || '-'}
                        </td>
                      `).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-[10px] font-mono border-collapse" style="table-layout: fixed;">
              <thead class="bg-[#f8fafc] border-b border-[#cbd5e1]">
                <tr>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600" rowspan="2" style="width: 8%;">Voltage %</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600" colspan="2" style="width: 18%;">RMS Voltage</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600" colspan="2" style="width: 18%;">Mean Voltage</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600" colspan="2" style="width: 18%;">RMS Current</th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600 font-sans text-[8px] leading-tight" rowspan="2" style="width: 10%;">
                    GUARANTEED<br/>MAXIMUM GUARANTEED VALUE OF NO LOAD CURRENT IN A
                  </th>
                  <th class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-600" colspan="2" style="width: 18%;">RMS Power</th>
                  <th class="p-2 text-center font-bold text-slate-600 font-sans text-[8px] leading-tight" rowspan="2" style="width: 10%;">
                    GUARANTEED<br/>MAXIMUM GUARANTEED VALUE OF NO LOAD LOSS IN KW
                  </th>
                </tr>
                <tr class="bg-slate-50 border-b border-[#cbd5e1] text-[8px] leading-tight">
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Meter Reading Voltage V</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Applied RMS Voltage V</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Meter Reading Voltage V</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Applied Mean Voltage V</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Meter Reading Current A</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Current Measured A</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Meter Reading Power W</th>
                  <th class="p-1 border-r border-[#cbd5e1] text-center">Measured Power in KW</th>
                </tr>
              </thead>
              <tbody>
                ${['90%', '100%', '110%'].map(v => {
                  const rowKey = v.replace('%', '');
                  const defaultCurrG = getHVNllGuaranteedCurrent(rowKey, jobMeta?.type, jobMeta?.capacity);
                  const defaultPowG = getHVNllGuaranteedPower(rowKey, jobMeta?.type, jobMeta?.capacity);

                  return `
                    <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                      <td class="p-2 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-center">${v}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'rms_m') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'rms_a') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'mean_m') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'mean_a') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'curr_m') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'curr_a') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800 font-medium">${testData[`hv_nll_${rowKey}_curr_g`] || defaultCurrG}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800">${calcNllMeterReading(rowKey, 'pow_m') || '-'}</td>
                      <td class="p-1 border-r border-[#cbd5e1] text-center text-slate-800 font-bold">${calcNllMeterReading(rowKey, 'pow_kw') || '-'}</td>
                      <td class="p-1 text-center text-slate-800 font-medium">${testData[`hv_nll_${rowKey}_pow_g`] || defaultPowG}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Formula and equation displays -->
          <div class="mt-4 p-4 border border-[#cbd5e1] rounded-xl bg-slate-50/50 space-y-2 font-mono text-xs text-slate-700">
            <div class="flex items-center justify-between border-b border-[#cbd5e1] pb-1.5 font-bold text-[11px]">
              <span class="uppercase text-slate-500">CORRECTED NO LOAD LOSS FORMULA:</span>
              <span class="text-blue-600">Po = Pm (1 + d) &nbsp;|&nbsp; d = (Vmean - Vrms) / Vmean</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-white rounded border border-[#cbd5e1] text-[11px] font-bold">
              <span class="text-slate-500">Corrected No Load Loss (Po):</span>
              <span class="text-blue-600">${poStr} KW</span>
            </div>
            <div class="text-[10px] text-slate-600 border border-dashed border-slate-300 p-2.5 rounded bg-white mt-2 leading-relaxed">
              <span class="font-bold text-slate-800">For 100% Rated Voltage:</span><br/>
              Po = ${pVal.toFixed(3)} * ( 1 + (${vMean.toFixed(2)} - ${vRms.toFixed(2)}) / ${vMean !== 0 ? vMean.toFixed(2) : '0.00'} ) 
              = <span class="font-bold text-blue-600 text-xs">${poStr} KW</span>
            </div>
          </div>
        </div>

        ${(() => {
          const llConfig = getHVLLConfig(jobMeta?.type, jobMeta?.capacity);
          const mf = parseFloat(testData['hv_ll_mf'] || String(llConfig.mf)) || llConfig.mf;
          const calcHVLL = (field: string) => {
            const stored = testData[`hv_ll_${field}`];
            if (stored) return stored;
            const u1 = parseFloat(testData['hv_ll_u1'] || '');
            const u3 = parseFloat(testData['hv_ll_u3'] || '');
            const i1 = parseFloat(testData['hv_ll_i1'] || '');
            const i3 = parseFloat(testData['hv_ll_i3'] || '');
            const p = parseFloat(testData['hv_ll_p'] || '');
            const ratedV = parseFloat(testData['hv_ll_rated_v'] || String(llConfig.ratedV)) || llConfig.ratedV;
            const ratedA = parseFloat(testData['hv_ll_rated_a'] || llConfig.ratedA) || llConfig.ratedADefault;

            if (field === 'meter_v' && !isNaN(u1) && !isNaN(u3)) return (u1 + u3).toFixed(4);
            if (field === 'measured_v' && !isNaN(u1) && !isNaN(u3)) return ((u1 + u3) * llConfig.ptFactor).toFixed(2);
            if (field === 'meter_i' && !isNaN(i1) && !isNaN(i3)) return ((i1 + i3) / 2).toFixed(4);
            if (field === 'applied_a' && !isNaN(i1) && !isNaN(i3)) return (((i1 + i3) / 2) * llConfig.ctFactor).toFixed(2);
            if (field === 'meter_w' && !isNaN(p)) return p.toFixed(4);

            const appliedA = parseFloat(calcHVLL('applied_a') || testData['hv_ll_applied_a'] || '');
            const measuredV = parseFloat(calcHVLL('measured_v') || testData['hv_ll_measured_v'] || '');
            const meterW = parseFloat(calcHVLL('meter_w') || testData['hv_ll_meter_w'] || '');

            if (field === 'loss_corrected' && appliedA > 0 && !isNaN(meterW)) {
              return ((meterW * mf / 1000) * Math.pow(ratedA / appliedA, 2)).toFixed(4);
            }
            if (field === 'z_percent' && appliedA > 0 && !isNaN(measuredV)) {
              return ((measuredV / ratedV) * (ratedA / appliedA) * 100).toFixed(4);
            }
            return '';
          };

          return `
            <div class="space-y-4 mt-8">
              <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] text-left">2. Measurement of % Impedance and Load Loss</h4>
              
              <div class="space-y-3">
                <table class="w-full text-xs border border-[#cbd5e1] border-collapse font-mono" style="table-layout: fixed;">
                  <tbody>
                    <tr>
                      <td class="p-2 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] uppercase text-center" style="width: 35%;" colspan="2">
                        TEST EQUIPMENT DETAILS
                      </td>
                      <td class="p-2 border-b border-[#cbd5e1] font-bold bg-[#f8fafc] uppercase text-center" style="width: 65%;" colspan="4">
                        <div class="flex items-center justify-center gap-2">
                          <span class="text-[9px] text-slate-500">POWER ANALYZER:</span>
                          <span class="font-bold text-slate-800">${testData['hv_ll_meter'] || 'POWER ANALYZER YOKOGAWA MAKE WT3000, SR NO: 91KA21004'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] text-center" style="width: 15%;">CT RATIO</td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800" style="width: 18%;">
                        ${testData['hv_ll_ct'] || llConfig.ctRatio}
                      </td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] text-center" style="width: 15%;">PT RATIO</td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800" style="width: 22%;">
                        ${testData['hv_ll_pt'] || '1100/&radic;3/110/&radic;3'}
                      </td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] text-center" style="width: 10%;">MF</td>
                      <td class="p-1.5 border-b border-[#cbd5e1] text-center font-bold text-slate-800" style="width: 20%;">
                        ${testData['hv_ll_mf'] || String(llConfig.mf)}
                      </td>
                    </tr>
                    <tr>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center align-middle bg-[#f8fafc]" rowspan="3">
                        <div class="font-bold text-[10px] uppercase text-slate-700">CT SR. NOS</div>
                        <div class="text-[8px] text-slate-500 mt-0.5 leading-tight">MAKE-MOON LIGHT ELECTRICAL</div>
                      </td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center text-slate-800">
                        ${testData['hv_ll_ct_sr_1'] || '06/12/413'}
                      </td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center align-middle bg-[#f8fafc]" rowspan="3" colspan="2">
                        <div class="font-bold text-[10px] uppercase text-slate-700">PT SR. NOS</div>
                        <div class="text-[8px] text-slate-500 mt-0.5 leading-tight">MAKE-MOON LIGHT ELECTRICAL</div>
                      </td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center text-slate-800" colspan="2">
                        ${testData['hv_ll_pt_sr_1'] || '06/12/424'}
                      </td>
                    </tr>
                    <tr>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center text-slate-800">
                        ${testData['hv_ll_ct_sr_2'] || '06/12/414'}
                      </td>
                      <td class="p-1.5 border-r border-b border-[#cbd5e1] text-center text-slate-800" colspan="2">
                        ${testData['hv_ll_pt_sr_2'] || '06/12/425'}
                      </td>
                    </tr>
                    <tr>
                      <td class="p-1.5 border-r border-[#cbd5e1] text-center text-slate-800">
                        ${testData['hv_ll_ct_sr_3'] || '06/12/416'}
                      </td>
                      <td class="p-1.5 border-[#cbd5e1] text-center text-slate-800" colspan="2">
                        ${testData['hv_ll_pt_sr_3'] || '06/12/426'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table class="w-full text-xs border border-[#cbd5e1] border-collapse font-mono mt-2" style="table-layout: fixed;">
                  <tbody>
                    <tr>
                      <td class="p-1.5 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left whitespace-nowrap">OTI (&deg;C) :</td>
                      <td class="p-1.5 border-r border-[#cbd5e1] text-center font-bold text-slate-800">
                        ${testData['hv_ll_oti'] || '0'}
                      </td>
                      <td class="p-1.5 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left whitespace-nowrap">WTI (&deg;C):</td>
                      <td class="p-1.5 border-r border-[#cbd5e1] text-center font-bold text-slate-800">
                        ${testData['hv_ll_wti'] || '0'}
                      </td>
                      <td class="p-1.5 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left whitespace-nowrap">TOP OIL (&deg;C) :</td>
                      <td class="p-1.5 border-r border-[#cbd5e1] text-center font-bold text-slate-800">
                        ${testData['hv_ll_top_oil'] || '25'}
                      </td>
                      <td class="p-1.5 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left whitespace-nowrap">BOTTOM OIL (&deg;C) :</td>
                      <td class="p-1.5 border-r border-[#cbd5e1] text-center font-bold text-slate-800">
                        ${testData['hv_ll_bottom_oil'] || '25'}
                      </td>
                      <td class="p-1.5 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left whitespace-nowrap">AVG OIL (&deg;C) :</td>
                      <td class="p-1.5 text-center font-bold text-blue-600">
                        ${testData['hv_ll_avg_oil'] || '25'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <table class="w-full text-[10px] border border-[#cbd5e1] border-collapse font-mono mt-3">
                <thead class="bg-[#f8fafc] font-bold text-center border-b border-[#cbd5e1]">
                  <tr>
                    <th class="p-1.5 border-r border-[#cbd5e1] bg-yellow-50" style="width: 18%;"></th>
                    <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 16%;">U1</th>
                    <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 16%;">U3</th>
                    <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 16%;">I1</th>
                    <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 16%;">I3</th>
                    <th class="p-1.5" style="width: 18%;">P</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-yellow-50/50">
                    <td class="p-2 border-r border-[#cbd5e1] font-bold text-center text-slate-700">LOAD LOSS:</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center font-bold">${testData['hv_ll_u1'] || '0.0000'}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center font-bold">${testData['hv_ll_u3'] || '0.0000'}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center font-bold">${testData['hv_ll_i1'] || '0.0000'}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center font-bold">${testData['hv_ll_i3'] || '0.0000'}</td>
                    <td class="p-1 text-center font-bold text-blue-600">${testData['hv_ll_p'] || '0.0000'}</td>
                  </tr>
                </tbody>
              </table>

              <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-3 shadow-sm">
                <table class="w-full text-[8px] font-mono leading-tight border-collapse">
                  <thead class="bg-[#f8fafc] uppercase font-bold text-center border-b border-[#cbd5e1] text-[7px]">
                    <tr>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 6%;">RATED VOLTAGE V</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 6%;">RATED CURRENT A</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 7%;">METER READING VOLTAGE V</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 7%;">MEASURED VOLTAGE V</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 7%;">METER READING APPLIED CURRENT A</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 7%;">APPLIED CURRENT A</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 7%;">METER READING LOSSES W</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 8%;">LOAD LOSSES CORRECTED TO RATED CURRENT kW</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 6%;">% Z</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 9%;">MAX. GUARANTEED LOSSES SOGP 75&deg;C</th>
                      <th class="p-1.5 border-r border-[#cbd5e1]" style="width: 9%;">MAX. GUARANTEED % Z SOGP 75&deg;C</th>
                      <th class="p-1.5 border-[#cbd5e1]" style="width: 9%;">MAX. GUARANTEED Z OHMS SOGP 75&deg;C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center font-bold">${testData['hv_ll_rated_v'] || '55000'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center font-bold">${testData['hv_ll_rated_a'] || llConfig.ratedA}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${calcHVLL('meter_v') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${calcHVLL('measured_v') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${calcHVLL('meter_i') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${calcHVLL('applied_a') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${calcHVLL('meter_w') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center font-semibold bg-slate-50">${calcHVLL('loss_corrected') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center font-bold text-blue-600 bg-slate-50">${calcHVLL('z_percent') || '-'}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${testData['hv_ll_guar_loss'] || llConfig.guarLoss}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1] text-center">${testData['hv_ll_guar_z_percent'] || llConfig.guarZPercent}</td>
                      <td class="p-1 border-b border-[#cbd5e1] text-center">${testData['hv_ll_guar_z_ohms'] || '0.45'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
        })()}

        <div class="space-y-8 mt-8">
          <div>
             <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">Separate-Source Voltage Test</h4>
             <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-2 shadow-sm">
               <table class="w-full text-xs border border-[#cbd5e1] border-collapse font-mono" style="table-layout: fixed;">
                 <tbody>
                   <tr>
                     <td class="p-2 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] uppercase text-center" style="width: 35%;">TEST EQUIPMENT DETAILS</td>
                     <td class="p-2 border-b border-[#cbd5e1] text-center font-bold text-slate-800 bg-slate-50" colspan="3">
                       RECTIFIERS &amp; ELECTRONICS PVT. LTD. MAKE DIVIDER &amp; kV METER BEARING SR. NO (7749/110(P)/07-08)
                     </td>
                   </tr>
                   <tr class="bg-[#f8fafc] uppercase font-bold text-center border-b border-[#cbd5e1]">
                     <th class="p-2 border-r border-[#cbd5e1]">APPLIED TERMINAL</th>
                     <th class="p-2 border-r border-[#cbd5e1]">APPLIED VOLTAGE kV</th>
                     <th class="p-2 border-r border-[#cbd5e1]">TIME IN SECOND</th>
                     <th class="p-2">REMARKS</th>
                   </tr>
                   <tr>
                     <td class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_ss_term'] || '( 1.1 - 2 - 2.1 ) ALL TERMINAL SHORTED'}</td>
                     <td class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_ss_kv'] || '70'}</td>
                     <td class="p-2 border-r border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_ss_sec'] || '60'}</td>
                     <td class="p-2 text-center font-bold uppercase bg-yellow-100">${testData['hv_ss_remark'] || 'WITHSTAND'}</td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>

          <div>
             <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">Induced Voltage Test</h4>
             <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-2 shadow-sm">
               <table class="w-full text-[10px] border border-[#cbd5e1] border-collapse font-mono" style="table-layout: fixed;">
                 <tbody>
                   <tr>
                     <td class="p-2 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] uppercase text-center align-middle" style="width: 18%;" rowspan="2">TEST EQUIPMENT DETAILS</td>
                     <td class="p-2 border-b border-[#cbd5e1] text-center font-bold text-slate-800 bg-slate-50" colspan="5">
                       DIGITAL FREQUENCY METER OF MAKE MECO BEARING SERIAL NO 2303075
                     </td>
                   </tr>
                   <tr>
                     <td class="p-2 border-b border-[#cbd5e1] text-center font-bold text-slate-800 bg-slate-50" colspan="5">
                       DIGITAL VOLT METER OF DELTRONICS MAKE BEARING SERIAL NO 24125128
                     </td>
                   </tr>
                   <tr class="bg-[#f8fafc] uppercase font-bold text-center border-b border-[#cbd5e1] leading-tight">
                     <th class="p-2 border-r border-[#cbd5e1]">VOLTAGE APPLIED TERMINAL</th>
                     <th class="p-2 border-r border-[#cbd5e1]">OPEN WINDING IN WHICH VOLTAGE</th>
                     <th class="p-2 border-r border-[#cbd5e1]">SUPPLIED VOLTAGE ON LV 1.1-2.1</th>
                     <th class="p-2 border-r border-[#cbd5e1]">INDUCED VOLTAGE IN HV 1.1-2</th>
                     <th class="p-2 border-r border-[#cbd5e1]">TEST FREQUENCY (Hz)</th>
                     <th class="p-2">TEST DURATION (Sec)</th>
                   </tr>
                   <tr class="bg-[#f8fafc] uppercase font-bold text-center border-b border-[#cbd5e1]">
                     <th class="p-1 border-r border-[#cbd5e1]"></th>
                     <th class="p-1 border-r border-[#cbd5e1]"></th>
                     <th class="p-1 border-r border-[#cbd5e1]">kVrms</th>
                     <th class="p-1 border-r border-[#cbd5e1]">kVrms</th>
                     <th class="p-1 border-r border-[#cbd5e1]"></th>
                     <th class="p-1"></th>
                   </tr>
                   <tr>
                     <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_iv_applied_term'] || '1.1-2.1'}</td>
                     <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_iv_open_winding'] || '2'}</td>
                     <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_iv_lv_kv'] || '55'}</td>
                     <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_iv_hv_kv'] || '110'}</td>
                     <td class="p-2 border-r border-b border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_iv_hz'] || '200'}</td>
                     <td class="p-2 border-b border-[#cbd5e1] text-center font-bold text-slate-800">${testData['hv_iv_sec'] || '30'}</td>
                   </tr>
                   <tr>
                     <td class="p-2 border-r border-[#cbd5e1] font-bold text-center bg-[#f8fafc]" colspan="3">Remark</td>
                     <td class="p-2 text-center font-bold uppercase bg-yellow-100" colspan="3">${testData['hv_iv_remark'] || 'NOT WITHSTAND'}</td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">Major Test Summary</h4>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-2">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc] text-[#64748b] uppercase font-bold">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-[#cbd5e1] text-left">Major Test</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">Measured Losses / Withstand</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">Date</th>
                  <th class="p-4 border-r border-[#cbd5e1] text-center">Time</th>
                  <th class="p-4 text-center">Duration (min)</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  'O.C TEST', 
                  'No Load loss measurement', 
                  'Load Loss measurement', 
                  'Separate source voltage withstand test', 
                  'Induced over voltage test',
                  'Heat Run Test only if Applicable'
                ].map(tk => `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${tk}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center font-bold">${getMajorTestRes(tk)}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`hv_sum_${tk.replace(/ /g, '_')}_date`)}</td>
                    <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`hv_sum_${tk.replace(/ /g, '_')}_time`)}</td>
                    <td class="p-1 text-center">${f(`hv_sum_${tk.replace(/ /g, '_')}_dur`)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 10. FINAL LV TEST REPORT
  if (testName === 'FINAL LV TEST REPORT') {
    const TERMINALS = ['1.1-2', '1.1-2.1', '2.1-2'];

    // Auto calculate Short Circuit %Z for PDF fallback if not already saved in testData
    const v1 = parseFloat(testData['lv_sc_v1'] || '');
    const c2 = parseFloat(testData['lv_sc_c2'] || '');
    const sc_z_val = testData['lv_sc_z'] || calculateFinalLvScImpedanceZ(v1, c2, jobMeta?.type, jobMeta?.capacity);

    const v2 = parseFloat(testData['lv_sc_v2'] || '');
    const c4 = parseFloat(testData['lv_sc_c4'] || '');
    const sc_z2_val = testData['lv_sc_z2'] || calculateFinalLvScImpedanceZ(v2, c4, jobMeta?.type, jobMeta?.capacity);

    const topOil = parseFloat(testData['lv_top_oil_temp'] || '');
    const bottomOil = parseFloat(testData['lv_bottom_oil_temp'] || '');
    let avg_oil_val = testData['lv_avg_oil_temp'] || '';
    if (!avg_oil_val && !isNaN(topOil) && !isNaN(bottomOil)) {
      avg_oil_val = ((topOil + bottomOil) / 2).toFixed(1);
    }

    const wrTopOil = parseFloat(testData['lv_wr_top_oil'] || '');
    const wrBottomOil = parseFloat(testData['lv_wr_bottom_oil'] || '');
    let wr_avg_oil_val = testData['lv_wr_avg_oil'] || '';
    if (!wr_avg_oil_val && !isNaN(wrTopOil) && !isNaN(wrBottomOil)) {
      wr_avg_oil_val = ((wrTopOil + wrBottomOil) / 2).toFixed(1);
    }

    const ir15 = parseFloat(testData['lv_ir_15s'] || '');
    const ir60 = parseFloat(testData['lv_ir_60s'] || '');
    let ir_ratio_val = testData['lv_ir_ratio'] || '';
    if (!ir_ratio_val && !isNaN(ir15) && !isNaN(ir60) && ir15 !== 0) {
      ir_ratio_val = (ir60 / ir15).toFixed(2);
    }

    const tdTopOil = parseFloat(testData['lv_td_top_oil'] || '');
    const tdBottomOil = parseFloat(testData['lv_td_bottom_oil'] || '');
    let td_avg_temp_val = testData['lv_td_avg_temp'] || '';
    if (!td_avg_temp_val && !isNaN(tdTopOil) && !isNaN(tdBottomOil)) {
      td_avg_temp_val = ((tdTopOil + tdBottomOil) / 2).toFixed(1);
    }

    const pi15 = parseFloat(testData['lv_pi_15s'] || '');
    const pi60 = parseFloat(testData['lv_pi_60s'] || '');
    const pi600 = parseFloat(testData['lv_pi_600s'] || '');
    let pi_ir_ratio_val = testData['lv_pi_ir_ratio'] || '';
    if (!pi_ir_ratio_val && !isNaN(pi15) && !isNaN(pi60) && pi15 !== 0) {
      pi_ir_ratio_val = (pi60 / pi15).toFixed(2);
    }
    let pi_pi_ratio_val = testData['lv_pi_pi_ratio'] || '';
    if (!pi_pi_ratio_val && !isNaN(pi60) && !isNaN(pi600) && pi60 !== 0) {
      pi_pi_ratio_val = (pi600 / pi60).toFixed(2);
    }

    const piTopOil = parseFloat(testData['lv_pi_top_oil'] || '');
    const piBottomOil = parseFloat(testData['lv_pi_bottom_oil'] || '');
    let pi_avg_oil_val = testData['lv_pi_avg_oil'] || '';
    if (!pi_avg_oil_val && !isNaN(piTopOil) && !isNaN(piBottomOil)) {
      pi_avg_oil_val = ((piTopOil + piBottomOil) / 2).toFixed(1);
    }

    const windingMf = parseFloat(testData['lv_td_winding_mf'] || '');
    const winding5Tan = parseFloat(testData['lv_td_winding_5_tan'] || '');
    const winding10Tan = parseFloat(testData['lv_td_winding_10_tan'] || '');
    let winding_5_tan20_val = testData['lv_td_winding_5_tan20'] || '';
    if (!winding_5_tan20_val && !isNaN(windingMf) && !isNaN(winding5Tan)) {
      winding_5_tan20_val = (windingMf * winding5Tan).toFixed(4);
    }
    let winding_10_tan20_val = testData['lv_td_winding_10_tan20'] || '';
    if (!winding_10_tan20_val && !isNaN(windingMf) && !isNaN(winding10Tan)) {
      winding_10_tan20_val = (windingMf * winding10Tan).toFixed(4);
    }

    return `
      <div class="space-y-8">
        <div class="space-y-6">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">1. Measurement of IR Values</h4>
          <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1]">
            <div class="grid grid-cols-2 gap-4">
              ${f('lv_date', '-', 'Date')}
              ${f('lv_time', '-', 'Time')}
              ${f('lv_amb_temp', '-', 'Amb. Temp (⁰C)')}
              ${f('lv_humidity', '-', 'Relative Humidity (%)')}
              ${f('lv_top_oil_temp', '-', 'Top Oil Temp (⁰C)')}
              ${f('lv_bottom_oil_temp', '-', 'Bottom oil Temp (⁰C)')}
              <div class="col-span-2">
                ${f('lv_avg_oil_temp', avg_oil_val, 'Avg oil Temp (⁰C)', 'font-bold bg-slate-50')}
              </div>
            </div>
            <div>
              <h6 class="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 mb-2 text-left">Insulation Tester Details</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('lv_ir_make', '', 'Make')}
                ${f('lv_ir_sr_no', '', 'Sr. No')}
                ${f('lv_ir_range', '', 'Range')}
                ${f('lv_ir_voltage', '-', 'Voltage Level (V)')}
              </div>
            </div>
          </div>
          <div class="space-y-4 mt-4">
            <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
              <table class="w-full text-xs font-mono">
                <thead class="bg-[#f8fafc]">
                  <tr class="border-b border-[#cbd5e1]">
                    <th class="p-4 border-r border-[#cbd5e1] text-left">Description</th>
                    <th class="p-4 border-r border-[#cbd5e1] text-center">15 Sec (MΩ)</th>
                    <th class="p-4 border-r border-[#cbd5e1] text-center">60 Sec (MΩ)</th>
                    <th class="p-4 text-center">Ratio of 60 Sec/ 15 Sec</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">WINDING-EARTH</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f('lv_ir_15s')}</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f('lv_ir_60s')}</td>
                    <td class="p-1 text-center font-bold bg-slate-50">${ir_ratio_val || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="border border-[#cbd5e1] rounded-xl overflow-hidden max-w-md">
              <table class="w-full text-xs font-mono">
                <tbody>
                  <tr class="border-b border-[#cbd5e1]">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-right w-1/2">core to frame :</td>
                    <td class="p-1 border-r border-[#cbd5e1] w-1/3">${f('lv_ir_core_to_frame')}</td>
                    <td class="p-4 text-center font-bold text-slate-500 bg-[#f8fafc] w-1/6">(MΩ)</td>
                  </tr>
                  <tr class="border-b border-[#cbd5e1]">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-right">core to tank :</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f('lv_ir_core_to_tank')}</td>
                    <td class="p-4 text-center font-bold text-slate-500 bg-[#f8fafc]">(MΩ)</td>
                  </tr>
                  <tr>
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-right">frame to tank :</td>
                    <td class="p-1 border-r border-[#cbd5e1]">${f('lv_ir_frame_to_tank')}</td>
                    <td class="p-4 text-center font-bold text-slate-500 bg-[#f8fafc]">(MΩ)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">2. Ratio Test</h4>
          <div class="grid grid-cols-2 gap-8 bg-[#f8fafc] p-6 rounded-xl border border-[#cbd5e1] text-xs mb-4">
            <div class="space-y-4">
              <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 text-left">Ratio Meter Details</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('lv_ratio_meter_make', '', 'Meter Make')}
                ${f('lv_ratio_meter_sr_no', '', 'Sr. No.')}
              </div>
            </div>
            <div class="space-y-4">
              <h6 class="font-bold text-[#2563eb] uppercase tracking-widest border-b pb-1 text-left">Test Date & Time</h6>
              <div class="grid grid-cols-2 gap-4">
                ${f('lv_ratio_date', '-', 'Test Date')}
                ${f('lv_ratio_time', '-', 'Test Time')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-left">Terminals</th>
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-center">CAL. RATIO</th>
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-center">MEASURED RATIO</th>
                  <th class="p-4 text-center">DEVIATION %</th>
                </tr>
              </thead>
              <tbody>
                ${TERMINALS.map(term => {
                  const lvRatios: Record<string, string> = {
                    '1.1-2': '2',
                    '1.1-2.1': '2',
                    '2.1-2': '1'
                  };
                  const calVal = parseFloat(testData[`lv_ratio_${term}_cal`] || lvRatios[term] || '');
                  const measVal = parseFloat(testData[`lv_ratio_${term}_measured`] || '');
                  let devVal = testData[`lv_ratio_${term}_dev`];
                  if (!devVal && !isNaN(calVal) && !isNaN(measVal) && calVal !== 0) {
                     devVal = (((measVal - calVal) / calVal) * 100).toFixed(2);
                  }
                  return `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-b border-[#cbd5e1]">${f(`lv_ratio_${term}_cal`, lvRatios[term])}</td>
                    <td class="p-1 border-r border-b border-[#cbd5e1]">${f(`lv_ratio_${term}_measured`)}</td>
                    <td class="p-1">${devVal ? `<div class="p-2 text-sm font-bold text-center text-industrial-text">${devVal}</div>` : f(`lv_ratio_${term}_dev`)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">3. Voltage Ratio Test</h4>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc] text-[#64748b] uppercase font-bold">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-center w-1/3">APPLIED VOLTAGE (V)</th>
                  <th colSpan="2" class="p-4 border-[#cbd5e1] text-[#2563eb] text-center">MEASURED VOLTAGE (V)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-[#f1f5f9] border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2.1</td>
                  <td class="p-3 bg-[#f8fafc]">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1]">${f('lv_vratio_applied_11_2')}</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('lv_vratio_m1_11_2')}</td>
                  <td class="p-1">${f('lv_vratio_m2_11_2')}</td>
                </tr>

                <tr class="bg-[#f1f5f9] border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2.1</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 bg-[#f8fafc]">2-2.1</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1]">${f('lv_vratio_applied_11_21')}</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('lv_vratio_m1_11_21')}</td>
                  <td class="p-1">${f('lv_vratio_m2_11_21')}</td>
                </tr>

                <tr class="bg-[#f1f5f9] border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1]">2.1-2</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 bg-[#f8fafc]">1.1-2.1</td>
                </tr>
                <tr class="last:border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1]">${f('lv_vratio_applied_21_2')}</td>
                  <td class="p-1 border-r border-[#cbd5e1]">${f('lv_vratio_m1_21_2')}</td>
                  <td class="p-1">${f('lv_vratio_m2_21_2')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">4. Magnetizing Current Test</h4>
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-6 rounded-xl space-y-4 mb-4 text-xs">
            <!-- Header 1: Applied Voltage, Date, Time -->
            <div class="border border-[#cbd5e1] grid grid-cols-6 items-center text-xs rounded-t-lg overflow-hidden">
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                APPLIED VOLTAGE (V) :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('lv_mag_applied', '')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                DATE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('lv_mag_date', '')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                TIME :
              </div>
              <div class="p-1 col-span-1">
                ${f('lv_mag_time', '')}
              </div>
            </div>

            <!-- Header 2: Meter details -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                METER MAKE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('lv_mag_meter_make', 'HTC')}
              </div>
              <div class="p-2 bg-[#f1f5f9] border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                SR. NO:
              </div>
              <div class="p-1 col-span-1">
                ${f('lv_mag_meter_sr_no', 'HTC2406CG0244')}
              </div>
            </div>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc]">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-left">TERMINALS</th>
                  <th class="p-4 border-r border-b border-[#cbd5e1] text-center">APPLIED VOLTAGE (V)</th>
                  <th class="p-4 border-b border-[#cbd5e1] text-center">MEASURED CURRENT <span class="normal-case">(mA)</span></th>
                </tr>
              </thead>
              <tbody>
                ${TERMINALS.map(term => `
                  <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                    <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${term}</td>
                    <td class="p-1 border-r border-b border-[#cbd5e1]">${f(`lv_mag_${term}_voltage`)}</td>
                    <td class="p-1">${f(`lv_mag_${term}_current`)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">5. Short Circuit Test</h4>
          
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-6 rounded-xl space-y-4 mb-4 text-xs">
            <!-- Header 1: Process | Short Circuit Test -->
            <div class="border border-[#cbd5e1] grid grid-cols-5 text-center font-bold text-xs uppercase bg-[#dbeafe] rounded-t-lg overflow-hidden">
              <div class="p-3 border-r border-[#cbd5e1] bg-[#dbeafe] font-bold text-slate-800 col-span-1">
                PROCESS
              </div>
              <div class="p-3 bg-[#e0f2fe] text-blue-900 font-extrabold col-span-4 tracking-wider">
                SHORT CIRCUIT TEST
              </div>
            </div>

            <!-- Header 2: Applied Voltage, Date, Time -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-6 items-center text-xs">
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                APPLIED VOLTAGE (V) :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('lv_sc_applied', '', '', '', '1Φ 20 VOLT APPLIED')}
              </div>
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                DATE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('lv_sc_date', '', '', '', 'DD/MM/YYYY')}
              </div>
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                TIME :
              </div>
              <div class="p-1 col-span-1">
                ${f('lv_sc_time', '', '', '', 'HH:MM')}
              </div>
            </div>

            <!-- Header 3: Meter details -->
            <div class="border-x border-b border-[#cbd5e1] grid grid-cols-4 items-center text-xs rounded-b-lg overflow-hidden">
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                METER MAKE :
              </div>
              <div class="p-1 border-r border-[#cbd5e1] col-span-1">
                ${f('lv_sc_meter_make', '', '', '', '')}
              </div>
              <div class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2 col-span-1">
                SR.NO.:
              </div>
              <div class="p-1 col-span-1">
                ${f('lv_sc_sr_no', '', '', '', '')}
              </div>
            </div>
          </div>

          <!-- Table exactly matching excel layout -->
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono border-collapse text-center">
              <thead>
                <tr class="bg-slate-200 border-b border-[#cbd5e1] font-bold">
                  <th class="p-3 border-r border-[#cbd5e1] w-[10%] bg-slate-50"></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider w-[30%]">APPLIED VOLTAGE (V)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider w-[30%]">MEASURED CURRENT (A)</th>
                  <th class="p-3 text-center text-slate-700 uppercase tracking-wider w-[30%]">MEASURED CURRENT (A)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Row 1 static text -->
                <tr class="bg-slate-50 border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50/70" rowspan="2">-</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1</td>
                  <td class="p-3 bg-slate-50/20 font-bold text-center">2-2.1 (Short)</td>
                </tr>
                <!-- Row 1 subheader / user inputs -->
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('lv_sc_v1', '', '', '', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('lv_sc_c1', '', '', '', '')}
                  </td>
                  <td class="p-1 bg-white">
                    ${f('lv_sc_c2', '', '', '', '')}
                  </td>
                </tr>

                <!-- Row 2 static text -->
                <tr class="bg-slate-50 border-b border-[#cbd5e1] text-center font-bold">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50/70" rowspan="2">-</td>
                  <td class="p-3 border-r border-[#cbd5e1]">1.1-2</td>
                  <td class="p-3 border-r border-[#cbd5e1]">2</td>
                  <td class="p-3 bg-slate-50/20 font-bold text-center">1.1-2.1 (Short)</td>
                </tr>
                <!-- Row 2 subheader / user inputs -->
                <tr class="border-b-0">
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('lv_sc_v2', '', '', '', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white">
                    ${f('lv_sc_c3', '', '', '', '')}
                  </td>
                  <td class="p-1 bg-white">
                    ${f('lv_sc_c4', '', '', '', '')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Impedance box matching excel -->
          <div class="flex flex-col items-center mt-6">
            <div class="w-1/2">
              <div class="bg-[#cbd5e1]/40 border border-[#cbd5e1] rounded-t-lg p-2 text-center text-xs font-black uppercase text-slate-800 tracking-wider">
                % IMPEDANCE
              </div>
              <div class="grid grid-cols-3 bg-slate-100 border-x border-b border-[#cbd5e1] rounded-b-lg text-center items-center font-bold text-sm">
                <div class="p-3 border-r border-b border-[#cbd5e1] font-extrabold text-slate-800">
                  % Z =
                </div>
                <div class="p-1 border-r border-b border-[#cbd5e1] bg-white">
                  ${f('lv_sc_z', sc_z_val, '', '', '')}
                </div>
                <div class="p-3 border-b border-[#cbd5e1] font-extrabold text-slate-800">
                  %
                </div>
                <div class="p-3 border-r border-[#cbd5e1] font-extrabold text-slate-800">
                  % Z =
                </div>
                <div class="p-1 border-r border-[#cbd5e1] bg-white">
                  ${f('lv_sc_z2', sc_z2_val, '', '', '')}
                </div>
                <div class="p-3 font-extrabold text-slate-800">
                  %
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">6. Winding Resistance Test</h4>
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-4 rounded-xl space-y-0 mb-4 overflow-hidden">
            <table class="w-full text-xs font-mono border border-[#cbd5e1] border-collapse mb-0" style="table-layout: fixed;">
              <tbody>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] bg-white" style="width: 33%;">
                    <span class="font-bold">METER USED:</span>
                    <div class="mt-1">${f('lv_wr_meter_used', 'PRESTIGE ELECTRONICS', '', 'text-center', 'PRESTIGE ELECTRONICS')}</div>
                  </td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-white" style="width: 33%;">
                    <span class="font-bold">DATE:</span>
                    <div class="mt-1">${f('lv_wr_date', '', '', 'text-center', 'DD/MM/YYYY')}</div>
                  </td>
                  <td class="p-2 bg-white" style="width: 33%;">
                    <span class="font-bold">TIME :</span>
                    <div class="mt-1">${f('lv_wr_time', '', '', 'text-center', 'HH:MM')}</div>
                  </td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] bg-white">
                    <span class="font-bold">METER MAKE SR. NO :</span>
                    <div class="mt-1">${f('lv_wr_meter_sr_no', 'PE/040/MAR/2023', '', 'text-center', 'PE/040/MAR/2023')}</div>
                  </td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-white">
                    <span class="font-bold">TOP OIL TEMP °C :</span>
                    <div class="mt-1">${f('lv_wr_top_oil', '', '', 'text-center', '')}</div>
                  </td>
                  <td class="p-2 bg-white">
                    <span class="font-bold">BOTTOM OIL TEMP °C :</span>
                    <div class="mt-1">${f('lv_wr_bottom_oil', '', '', 'text-center', '')}</div>
                  </td>
                </tr>
                <tr>
                  <td class="p-2 border-r border-[#cbd5e1] bg-white">
                    <span class="font-bold">RANGE :</span>
                    <div class="mt-1">${f('lv_wr_range', '1999.9 μΩ-19.999Ω', '', 'text-center', '1999.9 μΩ-19.999Ω')}</div>
                  </td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-white">
                    <span class="font-bold">AMBIENT °C :</span>
                    <div class="mt-1">${f('lv_wr_ambient', '', '', 'text-center', '')}</div>
                  </td>
                  <td class="p-2 bg-white">
                    <span class="font-bold">AVERAGE OIL TEMP °C :</span>
                    <div class="mt-1">${f('lv_wr_avg_oil', wr_avg_oil_val, '', 'text-center font-bold bg-slate-50')}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <table class="w-full text-xs font-mono border-x border-b border-[#cbd5e1] border-collapse" style="table-layout: fixed;">
              <tbody>
                <tr>
                  <td class="p-2 border-r border-[#cbd5e1] bg-white" style="width: 50%;">
                    <span class="font-bold">Avg. Oil Temp °C :</span>
                    <div class="mt-1">${f('lv_wr_avg_oil', wr_avg_oil_val, '', 'text-center font-bold bg-slate-50')}</div>
                  </td>
                  <td class="p-2 bg-white" style="width: 50%;">
                    <span class="font-bold">Humidity (%):</span>
                    <div class="mt-1">${f('lv_wr_humidity', '', '', 'text-center', '')}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table class="w-full text-xs font-mono">
              <thead class="bg-[#f8fafc] text-slate-500 uppercase text-[11px] tracking-wider">
                <tr class="border-b border-[#cbd5e1]">
                  <th class="p-3 border-r border-[#cbd5e1] text-left font-black">TEMINALS</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center font-black">
                    <div>RESISTANCE @ AMB.</div>
                    <div class="text-[10px] font-normal text-slate-400">Ω</div>
                  </th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center bg-orange-50/60 text-orange-800 font-black">
                    <div>RESISTANCE @75°C</div>
                    <div class="text-[10px] font-normal text-orange-500">Ω</div>
                  </th>
                  <th class="p-3 border-[#cbd5e1] text-center font-black">
                    <div>MAX. GUARANTEED @75°C</div>
                    <div class="text-[10px] font-normal text-slate-400">Ω</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const rows = [
                    { term: '1.1-2' },
                    { term: '1.1-2.1' },
                    { term: '2.1-2' }
                  ];
                  return rows.map(row => {
                    const max = getFinalLvWindingResMaxGuaranteed(row.term, jobMeta?.type, jobMeta?.capacity);
                    const termKey = row.term.replace('.', '_');
                    const rAmb = parseFloat(testData[`lv_wr_${termKey}_amb`] || '');
                    const windingT = parseFloat(testData['lv_wr_avg_oil'] || wr_avg_oil_val);
                    let calculatedR75 = '';
                    if (!isNaN(rAmb) && !isNaN(windingT)) {
                      calculatedR75 = (((235 + 75) / (235 + windingT)) * rAmb).toFixed(4);
                    }
                    const display75 = testData[`lv_wr_${termKey}_75c`] || calculatedR75;
                    return `
                      <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-[#f1f5f9]/40">
                        <td class="p-4 border-r border-[#cbd5e1] font-bold bg-[#f8fafc] text-left">${row.term}</td>
                        <td class="p-1 border-r border-[#cbd5e1] text-center">${f(`lv_wr_${termKey}_amb`, '', '', 'text-center font-bold')}</td>
                        <td class="p-1 border-r border-[#cbd5e1] bg-orange-50/10 text-center">${f(`lv_wr_${termKey}_75c`, display75, '', 'text-center text-orange-600 font-black')}</td>
                        <td class="p-1 text-center">${f(`lv_wr_${termKey}_max`, max, '', 'text-center font-bold text-slate-700')}</td>
                      </tr>
                    `;
                  }).join('');
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">7. Tan Delta and Capacitance Test on Bushing</h4>
          
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-4 rounded-xl space-y-0 mb-4 overflow-hidden">
            <table class="w-full text-xs font-mono border border-[#cbd5e1] border-collapse mb-0" style="table-layout: fixed;">
              <tbody>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" style="width: 15%;">METER USED</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 20%;">${f('lv_td_meter', '', '', 'text-center', 'MEGGER')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2" style="width: 10%;">Date:</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 20%;">${f('lv_td_date', '', '', 'text-center', 'DD/MM/YYYY')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2" style="width: 10%;">Time:</td>
                  <td class="p-1 bg-white text-center" style="width: 25%;">${f('lv_td_time', '', '', 'text-center', 'HH:MM')}</td>
                </tr>
                <tr>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">MODEL & S. NO</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_model', '', '', 'text-center', '1100205')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2">OTI:</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_oti', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2">WTI:</td>
                  <td class="p-1 bg-white text-center">${f('lv_td_wti', '', '', 'text-center', '')}</td>
                </tr>
              </tbody>
            </table>
            <table class="w-full text-xs font-mono border-x border-b border-[#cbd5e1] border-collapse" style="table-layout: fixed;">
              <tbody>
                <tr>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2" style="width: 10%;">Top Oil(&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 15%;">${f('lv_td_top_oil', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2" style="width: 12%;">Bottom Oil(&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 13%;">${f('lv_td_bottom_oil', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2" style="width: 15%;">Amb. Temp.(&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 10%;">${f('lv_td_amb_temp', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2" style="width: 10%;">Humi.(%):</td>
                  <td class="p-1 bg-white text-center" style="width: 15%;">${f('lv_td_humi', '', '', 'text-center', '')}</td>
                </tr>
                <tr>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-right pr-2">Avg. Temp (°C) :</td>
                  <td class="p-1 bg-white text-left" colspan="7">${f('lv_td_avg_temp', td_avg_temp_val, '', 'text-center font-bold bg-slate-50')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono text-center border-collapse" style="table-layout: fixed;">
              <thead>
                <tr class="bg-slate-200 border-b border-[#cbd5e1] font-bold">
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">TERMINAL</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">Sr. No. / Make</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 14%;">Applied Voltage <span style="text-transform: none; font-family: sans-serif; font-weight: normal;">(kV)</span></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 14%;">TAN DELTA (%)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 14%;">CAPACITANCE <span style="text-transform: none; font-family: sans-serif; font-weight: normal;">(pf)</span></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider bg-slate-100" style="width: 14%;">EXCITATION CURRENT <span style="text-transform: none; font-family: sans-serif; font-weight: normal;">(mA)</span></th>
                  <th class="p-3 text-center text-slate-700 uppercase tracking-wider" style="width: 14%;">DIELECTRIC LOSS (W)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold text-center" rowspan="2">
                    <div>1.1</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 4px;">mode:</div>
                    <div style="font-size: 11px; margin-top: 4px;">UST <span style="color: #dc2626; font-weight: 800;">-R</span><span style="color: #2563eb; font-weight: 800;">/B</span></div>
                  </td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50 text-center">
                    <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px;">Sr. No.</div>
                    ${f('lv_td_1_1_5_sr', '', '', 'text-center', '')}
                  </td>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold">5</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_1_1_5_tan', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_1_1_5_cap', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">${f('lv_td_1_1_5_exc', '', '', 'text-center', '')}</td>
                  <td class="p-1 bg-white text-center">${f('lv_td_1_1_5_loss', '', '', 'text-center', '')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50 text-center">
                    <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px;">Make</div>
                    ${f('lv_td_1_1_10_make', '', '', 'text-center', '')}
                  </td>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold">10</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_1_1_10_tan', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_1_1_10_cap', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">${f('lv_td_1_1_10_exc', '', '', 'text-center', '')}</td>
                  <td class="p-1 bg-white text-center">${f('lv_td_1_1_10_loss', '', '', 'text-center', '')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold text-center" rowspan="2">
                    <div>2</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 4px;">mode:</div>
                    <div style="font-size: 11px; margin-top: 4px;">UST <span style="color: #dc2626; font-weight: 800;">R</span><span style="color: #2563eb; font-weight: 800;">/B</span></div>
                  </td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50 text-center">
                    <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px;">Sr. No.</div>
                    ${f('lv_td_2_5_sr', '', '', 'text-center', '')}
                  </td>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold">5</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_2_5_tan', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_2_5_cap', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">${f('lv_td_2_5_exc', '', '', 'text-center', '')}</td>
                  <td class="p-1 bg-white text-center">${f('lv_td_2_5_loss', '', '', 'text-center', '')}</td>
                </tr>
                <tr>
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50 text-center">
                    <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px;">Make</div>
                    ${f('lv_td_2_10_make', '', '', 'text-center', '')}
                  </td>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold">10</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_2_10_tan', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_td_2_10_cap', '', '', 'text-center', '')}</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">${f('lv_td_2_10_exc', '', '', 'text-center', '')}</td>
                  <td class="p-1 bg-white text-center">${f('lv_td_2_10_loss', '', '', 'text-center', '')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">8. Tan Delta and Capacitance Test on Winding</h4>
          
          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono text-center border-collapse" style="table-layout: fixed;">
              <thead>
                <tr class="bg-slate-200 border-b border-[#cbd5e1] font-bold">
                  <th class="p-1 border-r border-[#cbd5e1]" colspan="6"></th>
                  <th class="p-1 text-center text-slate-700 font-bold bg-white" style="text-transform: none;">
                    <span style="display: block; margin-bottom: 4px;">MF:</span>
                    ${f('lv_td_winding_mf', '', '', 'text-center', '')}
                  </th>
                </tr>
                <tr class="bg-slate-200 border-b border-[#cbd5e1] font-bold">
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider">TERMINAL</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider">Applied Voltage <span style="text-transform: none; font-family: sans-serif; font-weight: normal;">(kV)</span></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider">TAN DELTA (%)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider">CAPACITANCE <span style="text-transform: none; font-family: sans-serif; font-weight: normal;">(pf)</span></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider bg-slate-100">EXCITATION CURRENT <span style="text-transform: none; font-family: sans-serif; font-weight: normal;">(mA)</span></th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider">DIELECTRIC LOSS (W)</th>
                  <th class="p-3 text-center text-slate-700 uppercase tracking-wider">TanΔ (%) at 20 °C</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold text-center" rowspan="2">
                    <div>WINDING</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 4px;">mode:</div>
                    <div style="font-size: 11px; margin-top: 4px; font-weight: 800; color: #334155;">GST-GND</div>
                  </td>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold">5</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_5_tan', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_5_cap', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_5_exc', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_5_loss', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 bg-slate-100 text-center">
                    ${f('lv_td_winding_5_tan20', winding_5_tan20_val, '', 'text-center font-bold bg-slate-50')}
                  </td>
                </tr>
                <tr>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold">10</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_10_tan', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_10_cap', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_10_exc', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-100 text-center">
                    ${f('lv_td_winding_10_loss', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 bg-slate-100 text-center">
                    ${f('lv_td_winding_10_tan20', winding_10_tan20_val, '', 'text-center font-bold bg-slate-50')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-4 mt-8">
          <h4 class="text-xs font-bold uppercase tracking-widest text-[#2563eb] pb-2 border-b text-left">9. Polarization Index</h4>
          
          <div class="bg-[#f8fafc] border border-[#cbd5e1] p-4 rounded-xl space-y-0 mb-4 overflow-hidden">
            <table class="w-full text-xs font-mono border border-[#cbd5e1] border-collapse mb-0" style="table-layout: fixed;">
              <tbody>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" style="width: 20%;">Date:</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 20%;">${f('lv_pi_date', '', '', 'text-center', 'DD/MM/YYYY')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" style="width: 10%;">Time:</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center" style="width: 15%;">${f('lv_pi_time', '', '', 'text-center', 'HH:MM')}</td>
                  <td class="p-2 bg-slate-100 font-bold text-center" style="width: 35%;">Details of Insulation Tester</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Ambiant Temp (&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_pi_amb_temp', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Make:</td>
                  <td class="p-1 bg-white text-center">${f('lv_pi_make', '', '', 'text-center', 'MEGGER')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Top Oil Temp (&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_pi_top_oil', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Sr. No:</td>
                  <td class="p-1 bg-white text-center">${f('lv_pi_sr_no', '', '', 'text-center', 'A01148D22')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Bottom Oil Temp (&deg;C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_pi_bottom_oil', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Range:</td>
                  <td class="p-1 bg-white text-center">${f('lv_pi_range', '', '', 'text-center', '1-TO-5 Kv')}</td>
                </tr>
                <tr class="border-b border-[#cbd5e1]">
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Avg. Oil Temp (⁰C):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-slate-50 text-center">${f('lv_pi_avg_oil', pi_avg_oil_val, '', 'text-center font-bold bg-slate-50')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2">Voltage Level (V):</td>
                  <td class="p-1 bg-white text-center">${f('lv_pi_applied', '', '', 'text-center', '')}</td>
                </tr>
                <tr>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center">Relative Humidity (%):</td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">${f('lv_pi_humidity', '', '', 'text-center', '')}</td>
                  <td class="p-2 bg-slate-50 border-r border-[#cbd5e1] font-bold text-center" colspan="2"></td>
                  <td class="p-1 bg-white text-center"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
            <table class="w-full text-xs font-mono text-center border-collapse" style="table-layout: fixed;">
              <thead>
                <tr class="bg-slate-200 border-b border-[#cbd5e1] font-bold">
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 25%;">WINDING -EARTH</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">15 Sec (M&Omega;)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">60 Sec (M&Omega;)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">600 Sec (M&Omega;)</th>
                  <th class="p-3 border-r border-[#cbd5e1] text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">Ratio of 60 Sec/<br/>15 Sec</th>
                  <th class="p-3 text-center text-slate-700 uppercase tracking-wider" style="width: 15%;">Ratio of 600 Sec/<br/>60 Sec</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border-r border-[#cbd5e1] bg-slate-50 font-bold text-center">
                    WINDING - EARTH
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('lv_pi_15s', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('lv_pi_60s', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('lv_pi_600s', '', '', 'text-center', '')}
                  </td>
                  <td class="p-1 border-r border-[#cbd5e1] bg-white text-center">
                    ${f('lv_pi_ir_ratio', pi_ir_ratio_val, '', 'text-center font-bold bg-slate-50 text-indigo-700')}
                  </td>
                  <td class="p-1 bg-white text-center">
                    ${f('lv_pi_pi_ratio', pi_pi_ratio_val, '', 'text-center font-bold bg-slate-50 text-indigo-700')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // 11. Checklist for TFR BEFORE HV
  if (testName === 'Checklist for TFR BEFORE HV') {
    const getStatusValue = (idx: number) => {
      const key = `chk_status_${idx + 1}`;
      if (testData[key] !== undefined) {
        return testData[key];
      }
      if (idx === 4 || idx === 19) return 'PENDING';
      return 'DONE';
    };

    const getConfValue = (idx: number) => {
      const key = `chk_conf_${idx + 1}`;
      if (testData[key] !== undefined) {
        return testData[key];
      }
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

    return `
      <div class="border border-[#cbd5e1] rounded-xl overflow-hidden mt-4">
        <table class="w-full text-xs font-mono border-collapse" style="table-layout: fixed;">
          <thead class="bg-[#f8fafc] text-[#64748b] uppercase font-bold border-b border-[#cbd5e1]">
            <tr>
              <th class="p-4 border-r border-[#cbd5e1] text-center" style="width: 10%;">SR. NO</th>
              <th class="p-4 border-r border-[#cbd5e1] text-left" style="width: 50%;">PROCESS COMPLIANCE</th>
              <th class="p-4 border-r border-[#cbd5e1] text-center" style="width: 25%;">CONFIRMATION VALUES</th>
              <th class="p-4 text-center" style="width: 15%;">REMARK</th>
            </tr>
          </thead>
          <tbody>
            ${CHECKLIST_ITEMS.map((item, idx) => {
              const statusVal = getStatusValue(idx);
              const isChecked = statusVal === 'DONE';

              const hasConfCheckbox = idx === 3 || (idx >= 7 && idx <= 19);
              const isConfChecked = getConfValue(idx) === 'DONE';

              let confirmationValuesHtml = '';
              if (idx === 0) {
                confirmationValuesHtml = `
                  <div class="flex flex-col gap-1 text-[11px] p-2 text-left">
                    <div><span class="font-bold text-slate-500">BDV (kV):</span> <span class="font-bold text-slate-800">${testData['chk_val_1_bdv'] || '-'}</span></div>
                    <div><span class="font-bold text-slate-500">PPM :</span> <span class="font-bold text-slate-800">${testData['chk_val_1_ppm'] || '-'}</span></div>
                  </div>
                `;
              } else if (idx === 1) {
                confirmationValuesHtml = `
                  <div class="p-2 font-bold text-center text-slate-800">
                    ${testData['chk_val_2'] || 'NA'}
                  </div>
                `;
              } else if (idx === 2) {
                confirmationValuesHtml = `
                  <div class="flex flex-col gap-1 text-[11px] p-2 text-left">
                    <div><span class="font-bold text-slate-500">1.1 (MΩ) :</span> <span class="font-bold text-slate-800">${testData['chk_val_3_1_1'] || 'NA'}</span></div>
                    <div><span class="font-bold text-slate-500">2 (MΩ) :</span> <span class="font-bold text-slate-800">${testData['chk_val_3_2'] || 'NA'}</span></div>
                  </div>
                `;
              } else if (idx >= 4 && idx <= 6) {
                confirmationValuesHtml = `
                  <div class="p-2 font-bold text-center text-slate-800">
                    ${testData[`chk_val_${idx + 1}`] || 'NA'}
                  </div>
                `;
              } else if (hasConfCheckbox) {
                confirmationValuesHtml = `
                  <div class="flex items-center justify-center p-2">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 2px solid ${isConfChecked ? '#2563eb' : '#cbd5e1'}; border-radius: 4px; background-color: ${isConfChecked ? '#2563eb' : '#ffffff'}; color: #ffffff; font-weight: bold; font-size: 11px; line-height: 14px;">
                      ${isConfChecked ? '&#10003;' : ''}
                    </span>
                  </div>
                `;
              } else {
                confirmationValuesHtml = `
                  <div class="text-slate-400 text-xs italic text-center">-</div>
                `;
              }

              const remarkHtml = `
                <div class="p-2 text-center text-slate-800 font-bold">
                  ${testData[`chk_remark_${idx+1}`] || '-'}
                </div>
              `;

              return `
                <tr class="border-b border-[#cbd5e1] last:border-0 hover:bg-slate-50">
                  <td class="p-4 border-r border-[#cbd5e1] text-center font-bold bg-[#f8fafc]">${idx + 1}</td>
                  <td class="p-4 border-r border-[#cbd5e1] font-medium text-left leading-relaxed text-[#1e293b]">${item}</td>
                  <td class="p-2 border-r border-[#cbd5e1] bg-slate-50/50">
                    ${confirmationValuesHtml}
                  </td>
                  <td class="p-4 text-center">
                    ${remarkHtml}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // OIL SOAKING SERVICING PLANNING
  if (testName === 'OIL SOAKING SERVICING PLANNING') {
    const OIL_STAGES = ['BEFORE', 'AFTER'] as const;
    const OIL_ROWS = ['Core- Frame', 'Frame-Frame', 'Frame-Tank', 'CORE-Tank'] as const;
    const rowKey = (stage: string, row: string, suffix: string) =>
      `${stage.toLowerCase()}_${row.toLowerCase().replace(' ', '_')}_${suffix}`;

    return `
      <div class="space-y-8">
        <div class="p-4 border border-[#cbd5e1] rounded-xl">
          <h5 class="text-[10px] font-bold uppercase tracking-widest text-[#2563eb] border-b border-[#cbd5e1] pb-2 mb-4 text-left">Details of Insulation Tester</h5>
          <div class="grid grid-cols-4 gap-4">
            ${f('oil_tester_make', 'MEGGER', 'Make')}
            ${f('oil_tester_range', '1-TO-5 kV', 'Range')}
            ${f('oil_tester_sr_no', 'A01148D22', 'Sr. No')}
            ${f('oil_tester_v_level', '1000V', 'Voltage Level')}
          </div>
        </div>

        <div class="bg-green-600 text-white text-center py-2 font-bold uppercase tracking-[0.3em] rounded">
          IR TEST
        </div>

        ${OIL_STAGES.map(stage => `
          <div class="space-y-4">
            <div class="bg-[#f8fafc] px-6 py-2 border-b border-[#cbd5e1] text-center">
              <span class="text-sm font-black uppercase tracking-[0.2em]">${stage} SERVICING</span>
            </div>

            <div class="grid grid-cols-3 gap-4 p-4 border border-[#cbd5e1] rounded-lg">
              ${f(`${stage.toLowerCase()}_date`, '', 'Date')}
              ${f(`${stage.toLowerCase()}_time`, '', 'Time')}
              ${f(`${stage.toLowerCase()}_amb_temp`, '', 'Amb. Temp (°C)')}
              ${f(`${stage.toLowerCase()}_wdg_temp`, '', 'Wdg. Temp (°C)')}
              ${f(`${stage.toLowerCase()}_humidity`, '', 'Relative Humidity (%)')}
              ${f(`${stage.toLowerCase()}_core_temp`, '', 'Core Temp (°C)')}
            </div>

            <div class="border border-[#cbd5e1] rounded-xl overflow-hidden">
              <table class="w-full text-xs font-mono border-collapse">
                <thead class="bg-[#f8fafc] text-[#64748b] uppercase">
                  <tr>
                    <th class="p-3 border-r border-b border-[#cbd5e1] text-left"></th>
                    <th class="p-3 border-r border-b border-[#cbd5e1] text-center normal-case">Voltage Applied (kV)</th>
                    <th class="p-3 border-r border-b border-[#cbd5e1] text-center">Duration (Sec)</th>
                    <th class="p-3 border-b border-[#cbd5e1] text-center">M&ohm;</th>
                  </tr>
                </thead>
                <tbody>
                  ${OIL_ROWS.map(row => `
                    <tr>
                      <td class="p-3 border-r border-b border-[#cbd5e1] font-bold bg-[#f8fafc] text-center">${row}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1]">${f(rowKey(stage, row, 'v'), '1')}</td>
                      <td class="p-1 border-r border-b border-[#cbd5e1]">${f(rowKey(stage, row, 'sec'), '60')}</td>
                      <td class="p-1 border-b border-[#cbd5e1]">${f(rowKey(stage, row, 'mohm'))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Fallback Table View
  let fallbackHtml = `
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-[#f8fafc] text-[#64748b] text-xs font-bold uppercase tracking-wider border-b border-[#cbd5e1]">
          <th class="p-3 text-left w-1/3">Parameter Description</th>
          <th class="p-3 text-left">Measured Value / Details</th>
        </tr>
      </thead>
      <tbody>
  `;
  Object.entries(testData).forEach(([key, val]) => {
    if (['tested_at', 'tested_by', 'reviewed_at', 'reviewed_by', 'authorized_at', 'authorized_by', 'pct_tested_by', 'pct_tested_date', 'pct_reviewed_by', 'pct_reviewed_date', 'pct_authorized_by', 'pct_authorized_date', 'status'].includes(key)) {
      return;
    }
    const humanKey = key.replace(/_/g, ' ').replace(/\b([a-z])/g, char => char.toUpperCase());
    fallbackHtml += `
      <tr class="border-b border-[#cbd5e1] last:border-none">
        <td class="p-3 font-semibold text-[#64748b] uppercase text-[10px] text-left">${humanKey}</td>
        <td class="p-3 font-mono text-sm text-[#1e293b] font-bold text-left">${val || '-'}</td>
      </tr>
    `;
  });
  fallbackHtml += `
      </tbody>
    </table>
  `;
  return fallbackHtml;
}
