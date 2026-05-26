'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DailyStep, BodyMeasurement,
  fetchStepsByDate, fetchDailySteps,
  fetchMeasurementByDate, fetchMeasurements, upsertMeasurement,
  upsertDailySteps,
  calcBMI, calcBodyFat, calcWHR,
  bmiCategory, bfCategory, whrCategory,
  todayISO, shiftDate, formatDisplayDate, daysSince,
} from '@/lib/body';

// ── Sub-tab type ──────────────────────────────────────────────────────────
type BodyView = 'steps' | 'measure' | 'history';

// ── Number input helper ───────────────────────────────────────────────────
function n(v: string): number | null {
  const x = parseFloat(v);
  return isNaN(x) ? null : x;
}

// ══════════════════════════════════════════════════════════════════════════
export default function BodyTab({ showToast }: { showToast: (msg: string) => void }) {
  const [view, setView] = useState<BodyView>('steps');
  const [stepsDate, setStepsDate] = useState(todayISO());
  const [measDate, setMeasDate] = useState(todayISO());

  // Steps state
  const [stepEntry, setStepEntry] = useState<DailyStep | null>(null);
  const [stepsCount, setStepsCount] = useState('');
  const [stepsGoal, setStepsGoal] = useState('10000');
  const [stepsNotes, setStepsNotes] = useState('');
  const [stepsSaving, setStepsSaving] = useState(false);

  // Measurements state
  const [measEntry, setMeasEntry] = useState<BodyMeasurement | null>(null);
  const [mf, setMf] = useState<Record<string, string>>({});
  const [measSaving, setMeasSaving] = useState(false);
  const [lastMeasDate, setLastMeasDate] = useState<string | null>(null);

  // History state
  const [stepHistory, setStepHistory] = useState<DailyStep[]>([]);
  const [measHistory, setMeasHistory] = useState<BodyMeasurement[]>([]);
  const [histView, setHistView] = useState<'steps' | 'meas'>('steps');
  const [histLoading, setHistLoading] = useState(false);

  // ── Load steps for date ──────────────────────────────────────────────
  const loadSteps = useCallback(async (date: string) => {
    const row = await fetchStepsByDate(date);
    setStepEntry(row);
    setStepsCount(row?.steps_count?.toString() || '');
    setStepsGoal(row?.steps_goal?.toString() || '10000');
    setStepsNotes(row?.notes || '');
  }, []);

  useEffect(() => { loadSteps(stepsDate); }, [stepsDate, loadSteps]);

  // ── Load measurements for date ───────────────────────────────────────
  const loadMeas = useCallback(async (date: string) => {
    const row = await fetchMeasurementByDate(date);
    setMeasEntry(row);
    if (row) {
      setMf({
        weight_kg: row.weight_kg?.toString() || '',
        height_cm: row.height_cm?.toString() || '',
        waist_cm: row.waist_cm?.toString() || '',
        hips_cm: row.hips_cm?.toString() || '',
        chest_cm: row.chest_cm?.toString() || '',
        neck_cm: row.neck_cm?.toString() || '',
        shoulders_cm: row.shoulders_cm?.toString() || '',
        left_arm_cm: row.left_arm_cm?.toString() || '',
        right_arm_cm: row.right_arm_cm?.toString() || '',
        left_thigh_cm: row.left_thigh_cm?.toString() || '',
        right_thigh_cm: row.right_thigh_cm?.toString() || '',
        left_calf_cm: row.left_calf_cm?.toString() || '',
        right_calf_cm: row.right_calf_cm?.toString() || '',
        notes: row.notes || '',
      });
    } else {
      setMf({});
    }
  }, []);

  useEffect(() => { loadMeas(measDate); }, [measDate, loadMeas]);

  // ── Last measurement date (for reminder) ────────────────────────────
  useEffect(() => {
    fetchMeasurements(1).then(rows => {
      if (rows.length) setLastMeasDate(rows[0].log_date);
    }).catch(() => {});
  }, []);

  // ── Load history ─────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'history') return;
    setHistLoading(true);
    Promise.all([fetchDailySteps(30), fetchMeasurements(20)])
      .then(([s, m]) => { setStepHistory(s); setMeasHistory(m); })
      .catch(() => showToast('⚠️ Could not load history'))
      .finally(() => setHistLoading(false));
  }, [view, showToast]);

  // ── Auto-calculated values ───────────────────────────────────────────
  const weight = n(mf.weight_kg || '');
  const height = n(mf.height_cm || '');
  const waist  = n(mf.waist_cm || '');
  const hips   = n(mf.hips_cm || '');
  const neck   = n(mf.neck_cm || '');

  const bmi     = weight && height ? calcBMI(weight, height) : null;
  const bf      = waist && neck && height ? calcBodyFat(waist, neck, height) : null;
  const whr     = waist && hips ? calcWHR(waist, hips) : null;

  const bmiCat  = bmi ? bmiCategory(bmi) : null;
  const bfCat   = bf  ? bfCategory(bf)   : null;
  const whrCat  = whr ? whrCategory(whr) : null;

  // Steps ring
  const stepsNum  = parseInt(stepsCount) || 0;
  const goalNum   = parseInt(stepsGoal) || 10000;
  const stepsPct  = Math.min(stepsNum / goalNum, 1);
  const ringCirc  = 214;
  const ringOffset = ringCirc - ringCirc * stepsPct;

  // Days since last measurement
  const daysSinceMeas = lastMeasDate ? daysSince(lastMeasDate) : null;

  // ── Save steps ───────────────────────────────────────────────────────
  async function saveSteps() {
    setStepsSaving(true);
    try {
      await upsertDailySteps({
        log_date: stepsDate,
        steps_count: stepsNum || null,
        steps_goal: goalNum,
        notes: stepsNotes || null,
      });
      showToast('✅ Steps saved!');
      loadSteps(stepsDate);
    } catch {
      showToast('❌ Failed to save steps');
    } finally {
      setStepsSaving(false);
    }
  }

  // ── Save measurements ────────────────────────────────────────────────
  async function saveMeasurements() {
    setMeasSaving(true);
    try {
      await upsertMeasurement({
        log_date: measDate,
        weight_kg:      n(mf.weight_kg || ''),
        height_cm:      n(mf.height_cm || ''),
        waist_cm:       n(mf.waist_cm || ''),
        hips_cm:        n(mf.hips_cm || ''),
        chest_cm:       n(mf.chest_cm || ''),
        neck_cm:        n(mf.neck_cm || ''),
        shoulders_cm:   n(mf.shoulders_cm || ''),
        left_arm_cm:    n(mf.left_arm_cm || ''),
        right_arm_cm:   n(mf.right_arm_cm || ''),
        left_thigh_cm:  n(mf.left_thigh_cm || ''),
        right_thigh_cm: n(mf.right_thigh_cm || ''),
        left_calf_cm:   n(mf.left_calf_cm || ''),
        right_calf_cm:  n(mf.right_calf_cm || ''),
        bmi,
        body_fat_pct: bf,
        waist_hip_ratio: whr,
        notes: mf.notes || null,
      });
      showToast('✅ Measurements saved!');
      setLastMeasDate(measDate);
      loadMeas(measDate);
    } catch {
      showToast('❌ Failed to save measurements');
    } finally {
      setMeasSaving(false);
    }
  }

  // ── Field updater ────────────────────────────────────────────────────
  const setField = (key: string, val: string) => setMf(prev => ({ ...prev, [key]: val }));

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="content">

      {/* Sub-tab toggle */}
      <div className="body-toggle">
        <button className={`bt-btn${view === 'steps'   ? ' active' : ''}`} onClick={() => setView('steps')}>👟 Steps</button>
        <button className={`bt-btn${view === 'measure' ? ' active' : ''}`} onClick={() => setView('measure')}>📏 Measure</button>
        <button className={`bt-btn${view === 'history' ? ' active' : ''}`} onClick={() => setView('history')}>📊 History</button>
      </div>

      {/* ── STEPS VIEW ── */}
      {view === 'steps' && (
        <>
          {/* Date nav */}
          <div className="date-nav">
            <button className="date-nav-btn" onClick={() => setStepsDate(d => shiftDate(d, -1))}>‹</button>
            <div className="date-nav-val">{formatDisplayDate(stepsDate)}</div>
            <button className="date-nav-btn" onClick={() => setStepsDate(d => shiftDate(d, 1))}>›</button>
          </div>

          {/* Steps ring hero */}
          <div className="steps-hero">
            <div className="ring-wrap">
              <svg viewBox="0 0 80 80" width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1e3a28" strokeWidth="6"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--green)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
              </svg>
              <div className="ring-center">
                <span className="ring-pct">{Math.round(stepsPct * 100)}%</span>
                <span className="ring-lbl">goal</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="steps-num">{stepsNum ? stepsNum.toLocaleString() : '—'}</div>
              <div className="steps-sub">of {goalNum.toLocaleString()} goal</div>
              <div className="steps-bar">
                <div className="steps-bar-fill" style={{ width: `${stepsPct * 100}%` }}/>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="input-group">
            <div className="input-lbl">Steps Taken</div>
            <input className="body-input" type="number" inputMode="numeric"
              placeholder="e.g. 8500"
              value={stepsCount}
              onChange={e => setStepsCount(e.target.value)}
            />
          </div>
          <div className="input-group">
            <div className="input-lbl">Daily Goal</div>
            <input className="body-input blue" type="number" inputMode="numeric"
              placeholder="e.g. 10000"
              value={stepsGoal}
              onChange={e => setStepsGoal(e.target.value)}
            />
          </div>
          <div className="input-group">
            <div className="input-lbl">Notes (optional)</div>
            <input className="body-input dim" type="text"
              placeholder="e.g. Evening walk + office"
              value={stepsNotes}
              onChange={e => setStepsNotes(e.target.value)}
            />
          </div>

          <button className="btn-body-save green" onClick={saveSteps} disabled={stepsSaving}>
            {stepsSaving ? 'Saving…' : '✓ Save Today\'s Steps'}
          </button>
        </>
      )}

      {/* ── MEASUREMENTS VIEW ── */}
      {view === 'measure' && (
        <>
          {/* Reminder banner — show if 7+ days since last entry */}
          {daysSinceMeas !== null && daysSinceMeas >= 7 && (
            <div className="reminder-banner">
              <span style={{ fontSize: 18 }}>📅</span>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                Last measured <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{daysSinceMeas} days ago</span>. Time for your weekly check-in!
              </div>
            </div>
          )}

          {/* Auto-calc panel */}
          <div className="auto-panel">
            <div className="auto-panel-title">⚡ Auto-calculated as you type</div>
            <div className="calc-grid">
              <div className="calc-cell">
                <div className="cc-lbl">BMI</div>
                <div className="cc-val">{bmi ?? '—'}</div>
                {bmiCat && <div className="cc-tag" style={{ background: bmiCat.color + '22', color: bmiCat.color }}>{bmiCat.label}</div>}
                {!bmiCat && <div className="cc-hint">needs weight + height</div>}
              </div>
              <div className="calc-cell">
                <div className="cc-lbl">Body Fat %</div>
                <div className="cc-val">{bf !== null ? `${bf}%` : '—'}</div>
                {bfCat && <div className="cc-tag" style={{ background: bfCat.color + '22', color: bfCat.color }}>{bfCat.label}</div>}
                {!bfCat && <div className="cc-hint">needs waist + neck + height</div>}
              </div>
              <div className="calc-cell">
                <div className="cc-lbl">Waist–Hip</div>
                <div className="cc-val">{whr ?? '—'}</div>
                {whrCat && <div className="cc-tag" style={{ background: whrCat.color + '22', color: whrCat.color }}>{whrCat.label}</div>}
                {!whrCat && <div className="cc-hint">needs waist + hips</div>}
              </div>
              <div className="calc-cell">
                <div className="cc-lbl">Date</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                  {formatDisplayDate(measDate).split(',')[0]}
                </div>
                <div className="cc-hint" style={{ marginTop: 4 }}>{measEntry ? 'existing entry' : 'new entry'}</div>
              </div>
            </div>
          </div>

          {/* Date picker */}
          <div className="date-nav" style={{ marginBottom: 14 }}>
            <button className="date-nav-btn" onClick={() => setMeasDate(d => shiftDate(d, -1))}>‹</button>
            <div className="date-nav-val" style={{ fontSize: 12 }}>{formatDisplayDate(measDate)}</div>
            <button className="date-nav-btn" onClick={() => setMeasDate(d => shiftDate(d, 1))}>›</button>
          </div>

          {/* Core */}
          <div className="sec-hdr">Core</div>
          <div className="meas-grid2">
            <MeasField label="Weight" unit="kg" val={mf.weight_kg} onChange={v => setField('weight_kg', v)} />
            <MeasField label="Height" unit="cm" val={mf.height_cm} onChange={v => setField('height_cm', v)} />
          </div>

          {/* Upper */}
          <div className="sec-hdr">Upper Body</div>
          <div className="meas-grid3">
            <MeasField label="Chest"     unit="cm" val={mf.chest_cm}     onChange={v => setField('chest_cm', v)} />
            <MeasField label="Waist"     unit="cm" val={mf.waist_cm}     onChange={v => setField('waist_cm', v)} />
            <MeasField label="Hips"      unit="cm" val={mf.hips_cm}      onChange={v => setField('hips_cm', v)} />
            <MeasField label="Neck"      unit="cm" val={mf.neck_cm}      onChange={v => setField('neck_cm', v)} />
            <MeasField label="Shoulders" unit="cm" val={mf.shoulders_cm} onChange={v => setField('shoulders_cm', v)} />
          </div>

          {/* Arms */}
          <div className="sec-hdr">Arms</div>
          <div className="meas-grid2">
            <MeasField label="Left Arm"  unit="cm" val={mf.left_arm_cm}  onChange={v => setField('left_arm_cm', v)} />
            <MeasField label="Right Arm" unit="cm" val={mf.right_arm_cm} onChange={v => setField('right_arm_cm', v)} />
          </div>

          {/* Legs */}
          <div className="sec-hdr">Legs</div>
          <div className="meas-grid2">
            <MeasField label="L Thigh"  unit="cm" val={mf.left_thigh_cm}  onChange={v => setField('left_thigh_cm', v)} />
            <MeasField label="R Thigh"  unit="cm" val={mf.right_thigh_cm} onChange={v => setField('right_thigh_cm', v)} />
            <MeasField label="L Calf"   unit="cm" val={mf.left_calf_cm}   onChange={v => setField('left_calf_cm', v)} />
            <MeasField label="R Calf"   unit="cm" val={mf.right_calf_cm}  onChange={v => setField('right_calf_cm', v)} />
          </div>

          {/* Notes */}
          <div className="sec-hdr">Notes</div>
          <input className="body-input dim" type="text"
            placeholder="e.g. Post-morning, fasted"
            value={mf.notes || ''}
            onChange={e => setField('notes', e.target.value)}
            style={{ marginBottom: 0 }}
          />

          <button className="btn-body-save purple" onClick={saveMeasurements} disabled={measSaving} style={{ marginTop: 16 }}>
            {measSaving ? 'Saving…' : '💾 Save Measurements'}
          </button>
        </>
      )}

      {/* ── HISTORY VIEW ── */}
      {view === 'history' && (
        <>
          <div className="hist-tabs">
            <button className={`hist-tab${histView === 'steps' ? ' active' : ''}`} onClick={() => setHistView('steps')}>👟 Steps</button>
            <button className={`hist-tab${histView === 'meas'  ? ' active' : ''}`} onClick={() => setHistView('meas')}>📏 Measurements</button>
          </div>

          {histLoading && <div className="empty-state" style={{ padding: '40px 0' }}>⏳ Loading…</div>}

          {/* Steps history */}
          {!histLoading && histView === 'steps' && (
            stepHistory.length === 0
              ? <div className="empty-state">No steps logged yet.</div>
              : <>
                  {/* Streak card */}
                  <StreakCard steps={stepHistory} />
                  {stepHistory.map(row => {
                    const pct = row.steps_goal ? Math.round((row.steps_count || 0) / row.steps_goal * 100) : null;
                    const hit = pct !== null && pct >= 100;
                    return (
                      <div key={row.log_date} className="hist-row">
                        <div className="hr-top">
                          <span className="hr-date">{formatDisplayDate(row.log_date)}</span>
                          {hit && <span className="hr-badge green">✓ Goal</span>}
                        </div>
                        <div className="hr-pills">
                          <div className="hr-pill">👟 <b>{(row.steps_count || 0).toLocaleString()}</b> steps</div>
                          {pct !== null && <div className="hr-pill">🎯 <b style={{ color: hit ? 'var(--green)' : 'var(--text)' }}>{pct}%</b></div>}
                          {row.notes && <div className="hr-pill">📝 {row.notes}</div>}
                        </div>
                      </div>
                    );
                  })}
                </>
          )}

          {/* Measurement history */}
          {!histLoading && histView === 'meas' && (
            measHistory.length === 0
              ? <div className="empty-state">No measurements yet. Do your first check-in!</div>
              : measHistory.map((row, idx) => {
                  const prev = measHistory[idx + 1];
                  const weightDiff = (row.weight_kg && prev?.weight_kg)
                    ? Math.round((row.weight_kg - prev.weight_kg) * 10) / 10
                    : null;
                  return (
                    <div key={row.log_date} className="hist-row meas">
                      <div className="hr-top">
                        <span className="hr-date">{formatDisplayDate(row.log_date)}</span>
                        <span className="hr-badge purple">📏 Measurements</span>
                      </div>
                      <div className="hr-pills">
                        {row.weight_kg   && <div className="hr-pill">⚖️ <b>{row.weight_kg}kg</b>{weightDiff !== null ? <span style={{ color: weightDiff < 0 ? 'var(--green)' : 'var(--red)', marginLeft: 4 }}>{weightDiff > 0 ? '+' : ''}{weightDiff}</span> : ''}</div>}
                        {row.bmi         && <div className="hr-pill">📊 BMI <b>{row.bmi}</b></div>}
                        {row.body_fat_pct && <div className="hr-pill">🔥 BF <b>{row.body_fat_pct}%</b></div>}
                        {row.waist_cm    && <div className="hr-pill">📏 waist <b>{row.waist_cm}cm</b></div>}
                        {row.chest_cm    && <div className="hr-pill">📏 chest <b>{row.chest_cm}cm</b></div>}
                      </div>
                    </div>
                  );
                })
          )}
        </>
      )}
    </div>
  );
}

// ── MeasField sub-component ───────────────────────────────────────────────
function MeasField({ label, unit, val, onChange }: {
  label: string; unit: string; val?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="meas-field">
      <label className="meas-label">{label}</label>
      <input
        className={`body-input meas-input${val ? ' filled' : ''}`}
        type="number" inputMode="decimal"
        placeholder={unit}
        value={val || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Streak card sub-component ─────────────────────────────────────────────
function StreakCard({ steps }: { steps: DailyStep[] }) {
  // Count consecutive days from today where steps_count > 0
  let streak = 0;
  const today = todayISO();
  for (let i = 0; i < steps.length; i++) {
    const expected = shiftDate(today, -i);
    const row = steps.find(s => s.log_date === expected);
    if (row && (row.steps_count || 0) > 0) streak++;
    else break;
  }
  const goalHits = steps.slice(0, 7).filter(s => s.steps_goal && (s.steps_count || 0) >= s.steps_goal).length;
  return (
    <div className="streak-card">
      <div className="streak-num">{streak}🔥</div>
      <div>
        <div className="streak-label">Day Streak</div>
        <div className="streak-sub">Goal hit {goalHits} of last 7 days</div>
      </div>
    </div>
  );
}

