'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DAYS, DAY_KEYS, TYPE_BADGE, TYPE_EMOJI, CLIENT_CONFIG,
  getRandomQuote, Day,
} from '@/lib/data';
import {
  fetchWorkoutHistory, saveWorkoutSession, deleteWorkoutSession,
  calcVolFromSession, WorkoutSession, DraftData,
} from '@/lib/supabase';
import BodyTab from '@/components/BodyTab';
import { fetchDailySteps, fetchMeasurements, DailyStep, BodyMeasurement } from '@/lib/body';

// ── Local-only state (drafts + timer prefs + used quotes) ─────────────────
interface LocalState {
  draft: Record<string, DraftData>;
  usedQuotes: number[];
  timerConfig: { restTimer: number; hiitWork: number; hiitRest: number };
}

const LS_KEY = 'pms_local_' + CLIENT_CONFIG.id;

function loadLocal(): LocalState {
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return {
    draft: {},
    usedQuotes: [],
    timerConfig: {
      restTimer: CLIENT_CONFIG.restTimer,
      hiitWork: CLIENT_CONFIG.hiitWork,
      hiitRest: CLIENT_CONFIG.hiitRest,
    },
  };
}
function saveLocal(s: LocalState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

// ── Timer helpers ─────────────────────────────────────────────────────────
interface TimerState {
  running: boolean; phase: string; remaining: number;
  hiitMode: boolean; hiitIsWork: boolean;
}
function formatTime(s: number) {
  const m = Math.floor(Math.max(s, 0) / 60);
  return String(m).padStart(2, '0') + ':' + String(Math.max(s, 0) % 60).padStart(2, '0');
}
function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.3);
  } catch {}
}

// ══════════════════════════════════════════════════════════════════════════
export default function PMSApp() {
  const todayKey = DAY_KEYS[new Date().getDay()];
  const [activeTab, setActiveTab] = useState(todayKey);
  const [local, setLocal] = useState<LocalState>(() => ({
    draft: {}, usedQuotes: [],
    timerConfig: { restTimer: CLIENT_CONFIG.restTimer, hiitWork: CLIENT_CONFIG.hiitWork, hiitRest: CLIENT_CONFIG.hiitRest },
  }));
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [bodySteps, setBodySteps] = useState<DailyStep[]>([]);
  const [bodyMeas, setBodyMeas] = useState<BodyMeasurement[]>([]);
  const [expandedHist, setExpandedHist] = useState<Set<number>>(new Set());
  const [quote, setQuote] = useState('');
  const [timer, setTimer] = useState<TimerState>({ running: false, phase: 'REST', remaining: 0, hiitMode: false, hiitIsWork: true });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(loadLocal()); }, []);
  useEffect(() => {
    fetchDailySteps(30).then(setBodySteps).catch(() => {});
    fetchMeasurements(10).then(setBodyMeas).catch(() => {});
  }, []);
  useEffect(() => {
    fetchWorkoutHistory().then(setHistory).catch(() => showToast('⚠️ Could not load history')).finally(() => setHistLoading(false));
  }, []);
  useEffect(() => { saveLocal(local); }, [local]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const day = DAYS.find(d => d.key === activeTab);
    if (day && day.exs.length > 0) {
      const { quote: q, newUsed } = getRandomQuote(local.usedQuotes);
      setQuote(q);
      setLocal(prev => ({ ...prev, usedQuotes: newUsed }));
    }
  }, [activeTab]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2400);
  }

  // ── Draft ────────────────────────────────────────────────────────────
  const getDraft = (dk: string): DraftData => local.draft[dk] || { done: {}, weights: {}, reps: {} };

  function updateDraft(dk: string, fn: (d: DraftData) => DraftData) {
    setLocal(prev => ({ ...prev, draft: { ...prev.draft, [dk]: fn(getDraft(dk)) } }));
  }
  const toggleEx = (dk: string, id: string) =>
    updateDraft(dk, d => ({ ...d, done: { ...d.done, [id]: !d.done[id] } }));
  const updateWeight = (dk: string, id: string, i: number, v: string) =>
    updateDraft(dk, d => { const w = [...(d.weights[id] || [])]; w[i] = v; return { ...d, weights: { ...d.weights, [id]: w } }; });
  const updateReps = (dk: string, id: string, i: number, v: string) =>
    updateDraft(dk, d => { const r = [...(d.reps[id] || [])]; r[i] = v; return { ...d, reps: { ...d.reps, [id]: r } }; });

  // ── Finish workout ───────────────────────────────────────────────────
  async function finishWorkout(dk: string) {
    if (!confirm('Save this workout to history?')) return;
    const draft = getDraft(dk);
    const dc = Object.values(draft.done).filter(Boolean).length;
    setSaving(true);
    try {
      const session = await saveWorkoutSession(
        Date.now(),
        new Date().toLocaleDateString('en-IN'),
        dk,
        draft,
      );
      setLocal(prev => { const d = { ...prev.draft }; delete d[dk]; return { ...prev, draft: d }; });
      setHistory(prev => [session, ...prev]);
      showToast(`🏆 Beast mode! ${dc} exercises logged.`);
      setTimeout(() => setActiveTab('history'), 1600);
    } catch {
      showToast('❌ Failed to save. Check connection.');
    } finally {
      setSaving(false);
    }
  }

  function resetDraft(dk: string) {
    if (!confirm('Clear all entries for this day?')) return;
    setLocal(prev => { const d = { ...prev.draft }; delete d[dk]; return { ...prev, draft: d }; });
  }

  async function deleteHistory(timestamp: number) {
    if (!confirm('Delete this session?')) return;
    try {
      await deleteWorkoutSession(timestamp);
      setHistory(prev => prev.filter(h => h.timestamp !== timestamp));
      showToast('🗑 Session deleted');
    } catch { showToast('❌ Failed to delete'); }
  }

  // ── Timer ────────────────────────────────────────────────────────────
  const runCountdown = useCallback((sec: number, phase: string, hiitMode = false, hiitIsWork = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer({ running: true, phase, remaining: sec, hiitMode, hiitIsWork });
    let rem = sec;
    timerRef.current = setInterval(() => {
      rem--;
      setTimer(prev => ({ ...prev, remaining: rem }));
      if (rem <= 0) {
        if (hiitMode) {
          beep();
          const nw = !hiitIsWork;
          runCountdown(nw ? local.timerConfig.hiitWork : local.timerConfig.hiitRest, nw ? 'WORK' : 'REST', true, nw);
        } else stopTimer();
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.timerConfig]);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer({ running: false, phase: 'REST', remaining: 0, hiitMode: false, hiitIsWork: true });
  }

  const todayDay = DAYS.find(d => d.key === todayKey);
  const navTabs = [
    ...DAYS,
    { key: 'progress', label: '📈', type: '', focus: '', exs: [] },
    { key: 'history', label: 'History', type: '', focus: '', exs: [] },
    { key: 'settings', label: '⚙️', type: '', focus: '', exs: [] },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="hdr">
          <div>
            <div className="hdr-name">{CLIENT_CONFIG.name} <span className="vbadge">V3</span></div>
            <div className="hdr-sub">Today: {todayDay?.type} — {todayDay?.focus}</div>
          </div>
          <button className="gear-btn" onClick={() => setActiveTab('settings')}>⚙️</button>
        </div>
        {/* Day pills — only visible on workout day tabs */}
        {DAYS.find(d => d.key === activeTab) && (
          <div className="day-pills">
            {DAYS.map(d => (
              <button key={d.key} className={`day-pill${activeTab === d.key ? ' active' : ''}`} onClick={() => setActiveTab(d.key)}>{d.label}</button>
            ))}
          </div>
        )}
        <div style={{ padding: 0, maxWidth: 600, margin: '0 auto', width: '100%' }}>
          {activeTab === 'history' && <HistoryTab history={history} loading={histLoading} expanded={expandedHist} onToggle={ts => setExpandedHist(prev => { const n = new Set(prev); n.has(ts) ? n.delete(ts) : n.add(ts); return n; })} onDelete={deleteHistory} />}
          {activeTab === 'progress' && <ProgressTab history={history} loading={histLoading} bodySteps={bodySteps} bodyMeas={bodyMeas} />}
          {activeTab === 'settings' && <SettingsTab config={local.timerConfig} onSave={(r, w, h) => { setLocal(prev => ({ ...prev, timerConfig: { restTimer: r, hiitWork: w, hiitRest: h } })); showToast('✅ Settings saved!'); }} />}
          {activeTab === 'body' && <BodyTab showToast={showToast} />}
          {DAYS.find(d => d.key === activeTab) && (
            <WorkoutTab
              day={DAYS.find(d => d.key === activeTab)!}
              draft={getDraft(activeTab)}
              quote={quote}
              saving={saving}
              onToggleEx={id => toggleEx(activeTab, id)}
              onUpdateWeight={(id, i, v) => updateWeight(activeTab, id, i, v)}
              onUpdateReps={(id, i, v) => updateReps(activeTab, id, i, v)}
              onSaveDraft={() => showToast('✅ Progress saved — keep pushing!')}
              onFinish={() => finishWorkout(activeTab)}
              onReset={() => resetDraft(activeTab)}
              onStartRest={() => runCountdown(local.timerConfig.restTimer, 'REST')}
            />
          )}
        </div>

        {/* ── Bottom Navigation ── */}
        <nav className="bottom-nav">
          <button className={`bnav-item${['mon','tue','wed','thu','fri','sat','sun'].includes(activeTab) ? ' active' : ''}`} onClick={() => setActiveTab(todayKey)}>
            <span className="bnav-icon">🏋️</span><span className="bnav-label">Workout</span>
            {['mon','tue','wed','thu','fri','sat','sun'].includes(activeTab) && <span className="bnav-dot"/>}
          </button>
          <button className={`bnav-item${activeTab === 'progress' ? ' active' : ''}`} onClick={() => setActiveTab('progress')}>
            <span className="bnav-icon">📈</span><span className="bnav-label">Progress</span>
            {activeTab === 'progress' && <span className="bnav-dot"/>}
          </button>
          <button className={`bnav-item${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>
            <span className="bnav-icon">🕐</span><span className="bnav-label">History</span>
            {activeTab === 'history' && <span className="bnav-dot"/>}
          </button>
          <button className={`bnav-item${activeTab === 'body' ? ' active-green' : ''}`} onClick={() => setActiveTab('body')}>
            <span className="bnav-icon">🏃</span><span className="bnav-label">Body</span>
            {activeTab === 'body' && <span className="bnav-dot green"/>}
          </button>
          <button className={`bnav-item${activeTab === 'settings' ? ' active' : ''}`} onClick={() => setActiveTab('settings')}>
            <span className="bnav-icon">⚙️</span><span className="bnav-label">Settings</span>
            {activeTab === 'settings' && <span className="bnav-dot"/>}
          </button>
        </nav>
      </div>

      {timer.running && (
        <div className="timer-overlay">
          <div className="timer-phase">{timer.phase}</div>
          <div className="timer-display">{formatTime(timer.remaining)}</div>
          <div className="timer-btns">
            <button className={`tbtn${timer.hiitMode ? ' hiit-active' : ''}`} onClick={() => {
              if (timer.hiitMode && timer.running) stopTimer();
              else runCountdown(local.timerConfig.hiitWork, 'WORK', true, true);
            }}>HIIT</button>
            <button className="tbtn" onClick={stopTimer}>Stop</button>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// WorkoutTab
// ══════════════════════════════════════════════════════════════════════════
function WorkoutTab({ day, draft, quote, saving, onToggleEx, onUpdateWeight, onUpdateReps, onSaveDraft, onFinish, onReset, onStartRest }: {
  day: Day; draft: DraftData; quote: string; saving: boolean;
  onToggleEx: (id: string) => void;
  onUpdateWeight: (id: string, i: number, v: string) => void;
  onUpdateReps: (id: string, i: number, v: string) => void;
  onSaveDraft: () => void; onFinish: () => void; onReset: () => void; onStartRest: () => void;
}) {
  const total = day.exs.length;
  const done = Object.keys(draft.done).filter(k => draft.done[k]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const emoji = TYPE_EMOJI[day.type] || '💪';

  if (!total) return (
    <div className="content">
      <div className="day-hero">
        <div className="day-hero-type">{emoji} {day.type}</div>
        <div className="day-hero-title">{day.focus}</div>
      </div>
      <div className="motiv">{quote}</div>
      <div className="empty-state">
        <div style={{ fontSize: 52, marginBottom: 16 }}>😴</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 10 }}>Rest Day</div>
        <div style={{ lineHeight: 1.6 }}>Your muscles are repairing and growing right now.<br />Eat clean, hydrate, and come back stronger.</div>
      </div>
    </div>
  );

  return (
    <div className="content">
      <div className="day-hero">
        <div className="day-hero-type">{emoji} {day.type} <span className={`type-badge ${TYPE_BADGE[day.type] || 'br'}`}>{day.type}</span></div>
        <div className="day-hero-title">{day.focus}</div>
        <div className="day-hero-sub">{total} exercises · {day.exs.reduce((a, e) => a + e.sets, 0)} total sets</div>
      </div>
      <div className="motiv">{quote}</div>
      <div className="prog-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Session Progress</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: pct === 100 ? 'var(--green)' : 'var(--accent)' }}>{done} / {total}</span>
        </div>
        <div className="prog-bar-track"><div className="prog-bar-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {day.exs.map((ex, i) => {
        const isDone = !!draft.done[ex.id];
        const wts = draft.weights[ex.id] || [];
        const rps = draft.reps[ex.id] || [];
        return (
          <div key={ex.id} className={`ex-card${isDone ? ' done' : ''}`}>
            <div className="ex-top" onClick={() => onToggleEx(ex.id)}>
              <div className="checkbtn">{isDone ? '✓' : i + 1}</div>
              <div style={{ flex: 1 }}>
                <div className="ex-name">{ex.name}</div>
                <div className="ex-meta">{ex.sets} sets · {ex.reps} reps</div>
              </div>
              {isDone && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 800 }}>DONE ✓</span>}
            </div>
            <div className="log-panel">
              {Array.from({ length: ex.sets }, (_, s) => (
                <div key={s} className="set-row">
                  <span className="set-lbl">S{s + 1}</span>
                  <input className="set-input" type="number" inputMode="decimal" placeholder="kg" defaultValue={wts[s] || ''} onBlur={e => onUpdateWeight(ex.id, s, e.target.value)} />
                  <span className="set-unit">kg</span>
                  <input className="set-input" type="number" inputMode="numeric" placeholder="reps" defaultValue={rps[s] || ''} onBlur={e => onUpdateReps(ex.id, s, e.target.value)} />
                  <span className="set-unit">reps</span>
                  <button className="rest-btn" onClick={onStartRest}>⏱ REST</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="footer-actions">
        <button className="btn-finish" onClick={onFinish} disabled={saving}>
          {saving ? <><span className="spinner" />Saving...</> : '🏆 Workout Complete — Save to History'}
        </button>
        <button className="btn-draft" onClick={onSaveDraft}>💾 Save Progress (Keep Logging)</button>
        <button className="btn-reset" onClick={onReset}>↺ Reset This Day&apos;s Log</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HistoryTab
// ══════════════════════════════════════════════════════════════════════════
function HistoryTab({ history, loading, expanded, onToggle, onDelete }: {
  history: WorkoutSession[]; loading: boolean; expanded: Set<number>;
  onToggle: (ts: number) => void; onDelete: (ts: number) => void;
}) {
  if (loading) return <div className="content"><div className="empty-state"><div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div><div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Loading history...</div></div></div>;
  if (!history.length) return <div className="content"><div className="empty-state"><div style={{ fontSize: 52, marginBottom: 16 }}>📭</div><div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 10 }}>No sessions yet</div><div>Complete a workout to start building your history.</div></div></div>;

  return (
    <div className="content">
      {history.map(h => {
        const vol = calcVolFromSession(h);
        const totalSets = h.exercises.reduce((a, e) => a + e.sets.length, 0);
        const isOpen = expanded.has(h.timestamp);
        return (
          <div key={h.timestamp} className="hist-item">
            <div className="hist-hdr" onClick={() => onToggle(h.timestamp)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="hist-date">{h.date}</span>
                  <span className={`type-badge ${TYPE_BADGE[h.workoutType] || 'br'}`}>{h.workoutType}</span>
                </div>
                <div className="hist-meta" style={{ marginTop: 4 }}>
                  {h.exercises.length} exercises · {totalSets} sets · {vol.toFixed(0)}kg total
                </div>
              </div>
              <button className="del-btn" onClick={e => { e.stopPropagation(); onDelete(h.timestamp); }}>🗑</button>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '0 14px 14px' }}>
                {h.exercises.map(ex => (
                  <div key={ex.dbId} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{ex.exerciseName}</div>
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {ex.sets.map(s => (
                        <div key={s.setNumber} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 24 }}>S{s.setNumber}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 52 }}>{s.weightKg != null ? `${s.weightKg}kg` : '—'}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>×</span>
                          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.reps != null ? `${s.reps} reps` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ProgressTab
// ══════════════════════════════════════════════════════════════════════════
function ProgressTab({ history, loading, bodySteps, bodyMeas }: { 
  history: WorkoutSession[]; loading: boolean;
  bodySteps: DailyStep[]; bodyMeas: BodyMeasurement[];
}) {
  if (loading) return <div className="content"><div className="empty-state"><div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div><div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Loading data...</div></div></div>;
  if (!history.length) return <div className="content"><div className="empty-state"><div style={{ fontSize: 52, marginBottom: 16 }}>📊</div><div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 10 }}>No data yet</div><div>Log workouts to see your progress charts.</div></div></div>;

  let tv = 0, ts = 0, te = 0, tw = 0;
  const sv: number[] = [];
  const wa = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lm: Record<string, { name: string; best: number; bestReps: number }> = {};

  history.forEach(h => {
    const v = calcVolFromSession(h);
    tv += v; sv.push(v);
    if (h.timestamp > wa) tw++;
    te += h.exercises.length;
    h.exercises.forEach(ex => {
      ts += ex.sets.length;
      ex.sets.forEach(s => {
        if (s.weightKg != null && s.weightKg > 0) {
          if (!lm[ex.exerciseId]) lm[ex.exerciseId] = { name: ex.exerciseName, best: 0, bestReps: 0 };
          if (s.weightKg > lm[ex.exerciseId].best) {
            lm[ex.exerciseId].best = s.weightKg;
            lm[ex.exerciseId].bestReps = s.reps || 0;
          }
        }
      });
    });
  });

  const n = history.length;
  const vols = sv.slice(0, 7).reverse();
  const maxV = Math.max(...vols, 1);
  const topLifts = Object.values(lm).filter(l => l.best > 0).sort((a, b) => b.best - a.best).slice(0, 6);

  return (
    <div className="content">
      <div className="stat-grid">
        <div className="stat-cell"><div className="stat-label">Sessions</div><div className="stat-val">{n}</div></div>
        <div className="stat-cell"><div className="stat-label">This Week</div><div className="stat-val">{tw}<span className="stat-unit">/ 6</span></div></div>
        <div className="stat-cell"><div className="stat-label">Total Volume</div><div className="stat-val">{(tv / 1000).toFixed(1)}<span className="stat-unit">t</span></div></div>
        <div className="stat-cell"><div className="stat-label">Avg / Session</div><div className="stat-val">{(tv / n).toFixed(0)}<span className="stat-unit">kg</span></div></div>
        <div className="stat-cell"><div className="stat-label">Total Sets</div><div className="stat-val">{ts}</div></div>
        <div className="stat-cell"><div className="stat-label">Exercises Done</div><div className="stat-val">{te}</div></div>
      </div>
      <div className="section-card">
        <div className="section-title">Volume Trend — Last {vols.length} Sessions</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 90, gap: 5 }}>
          {vols.map((v, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
              <div style={{ width: '100%', borderRadius: '5px 5px 0 0', minHeight: 3, background: v === Math.max(...vols) ? 'var(--green)' : 'var(--accent)', height: Math.round((v / maxV) * 84), opacity: 0.4 + 0.6 * (v / maxV) }} />
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
      {topLifts.length > 0 && (
        <div className="section-card">
          <div className="section-title">Top Lifts — Best Weight × Reps</div>
          {topLifts.map(l => (
            <div key={l.name} className="lift-row">
              <span className="lift-name">{l.name}</span>
              <span className="lift-val">{l.best}kg × {l.bestReps || '—'} reps</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Body Stats ── */}
      {bodySteps.length > 0 && (
        <div className="section-card">
          <div className="section-title">Steps — Last 7 Days</div>
          {bodySteps.slice(0, 7).map(s => {
            const pct = s.steps_goal ? Math.round((s.steps_count || 0) / s.steps_goal * 100) : 0;
            const hit = pct >= 100;
            return (
              <div key={s.log_date} className="lift-row">
                <span className="lift-name" style={{ fontSize: 12 }}>{new Date(s.log_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="lift-val" style={{ color: hit ? 'var(--green)' : 'var(--muted)' }}>
                  {(s.steps_count || 0).toLocaleString()} <span style={{ fontWeight: 400, fontSize: 10 }}>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {bodyMeas.length > 0 && (
        <div className="section-card">
          <div className="section-title">Body — Latest vs Previous</div>
          {(() => {
            const cur = bodyMeas[0];
            const prev = bodyMeas[1];
            const rows = [
              { label: 'Weight', cur: cur.weight_kg, prev: prev?.weight_kg, unit: 'kg' },
              { label: 'BMI', cur: cur.bmi, prev: prev?.bmi, unit: '' },
              { label: 'Body Fat', cur: cur.body_fat_pct, prev: prev?.body_fat_pct, unit: '%' },
              { label: 'Waist', cur: cur.waist_cm, prev: prev?.waist_cm, unit: 'cm' },
              { label: 'Chest', cur: cur.chest_cm, prev: prev?.chest_cm, unit: 'cm' },
            ].filter(r => r.cur != null);
            return rows.map(r => {
              const diff = (r.cur != null && r.prev != null) ? Math.round((Number(r.cur) - Number(r.prev)) * 10) / 10 : null;
              const isGoodDown = ['Weight','Waist','Body Fat'].includes(r.label);
              const diffColor = diff === null ? '' : diff === 0 ? 'var(--muted)' : (diff < 0 === isGoodDown ? 'var(--green)' : 'var(--red)');
              return (
                <div key={r.label} className="lift-row">
                  <span className="lift-name">{r.label}</span>
                  <span className="lift-val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{r.cur}{r.unit}</span>
                    {diff !== null && <span style={{ fontSize: 11, color: diffColor, fontWeight: 700 }}>{diff > 0 ? '+' : ''}{diff}{r.unit}</span>}
                  </span>
                </div>
              );
            });
          })()}
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
            {bodyMeas[1] ? `vs ${new Date(bodyMeas[1].log_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SettingsTab
// ══════════════════════════════════════════════════════════════════════════
function SettingsTab({ config, onSave }: {
  config: { restTimer: number; hiitWork: number; hiitRest: number };
  onSave: (r: number, w: number, h: number) => void;
}) {
  const [rest, setRest] = useState(config.restTimer);
  const [work, setWork] = useState(config.hiitWork);
  const [hr, setHr] = useState(config.hiitRest);
  return (
    <div className="content">
      <div className="settings-section">
        <div className="section-title">Cloud Sync Status</div>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <span>Supabase Integration</span>
          <div style={{ fontSize: 10, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Workout history synced to Supabase (normalized tables)</div>
        </div>
      </div>
      <div className="settings-section">
        <div className="section-title">Timer Settings</div>
        <div className="settings-row"><span>Rest Timer (sec)</span><input className="settings-input" type="number" value={rest} min={10} max={300} onChange={e => setRest(+e.target.value || 90)} /></div>
        <div className="settings-row"><span>HIIT Work (sec)</span><input className="settings-input" type="number" value={work} min={10} max={180} onChange={e => setWork(+e.target.value || 40)} /></div>
        <div className="settings-row"><span>HIIT Rest (sec)</span><input className="settings-input" type="number" value={hr} min={10} max={120} onChange={e => setHr(+e.target.value || 20)} /></div>
      </div>
      <button style={{ background: 'linear-gradient(135deg,var(--accent),var(--blue))', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer' }} onClick={() => onSave(rest, work, hr)}>
        Save Timer Settings
      </button>
    </div>
  );
}

// ── All CSS in one place ──────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0f13;--card:#1a1a22;--card2:#22222e;--border:#2e2e3e;--accent:#6c63ff;--green:#00e676;--amber:#ffab00;--red:#ff5252;--text:#f0f0ff;--muted:#7878a0;--blue:#4fc3f7}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:72px}
.app{display:flex;flex-direction:column;min-height:100vh;position:relative}
.hdr{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)}
.hdr-name{font-size:20px;font-weight:700;letter-spacing:-0.3px;color:var(--text)}
.hdr-sub{font-size:11px;color:var(--muted);margin-top:3px}
.vbadge{background:var(--green);color:#000;font-size:8px;font-weight:800;padding:2px 7px;border-radius:20px;margin-left:8px;letter-spacing:0.5px;vertical-align:middle}
.gear-btn{background:var(--card2);color:var(--muted);border:1px solid var(--border);padding:7px 10px;border-radius:10px;cursor:pointer;font-size:12px}
.nav{display:flex;background:var(--card);border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none;padding:0 8px}
.nav::-webkit-scrollbar{display:none}
.nav-tab{padding:12px 13px;font-size:12px;font-weight:600;color:var(--muted);border:none;border-bottom:2px solid transparent;background:none;white-space:nowrap;cursor:pointer;flex-shrink:0;letter-spacing:0.3px}
.nav-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.content{padding:16px 16px 90px;max-width:600px;margin:0 auto;width:100%}
.day-hero{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%);border-radius:16px;padding:18px 20px;margin-bottom:16px;position:relative;overflow:hidden;border:1px solid rgba(108,99,255,0.3)}
.day-hero::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(108,99,255,0.15)}
.day-hero-type{font-size:11px;font-weight:700;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:6px}
.day-hero-title{font-size:20px;font-weight:800;letter-spacing:-0.5px;color:var(--text)}
.day-hero-sub{font-size:12px;color:rgba(240,240,255,0.65);margin-top:6px}
.motiv{padding:14px 16px;border-radius:12px;font-size:12px;line-height:1.65;margin-bottom:16px;background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);color:rgba(240,240,255,0.85)}
.prog-wrap{background:var(--card);border-radius:12px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--border)}
.prog-bar-track{background:var(--border);border-radius:20px;height:6px;margin-top:8px;overflow:hidden}
.prog-bar-fill{height:100%;border-radius:20px;background:linear-gradient(90deg,var(--accent),var(--green));transition:width 0.4s}
.ex-card{background:var(--card);border:1px solid var(--border);border-radius:16px;margin-bottom:12px;overflow:hidden;transition:border-color 0.2s}
.ex-card.done{border-color:var(--green)}
.ex-card.done .ex-top{background:linear-gradient(135deg,rgba(0,230,118,0.07),transparent)}
.ex-top{padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer}
.checkbtn{width:28px;height:28px;border:2px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;background:var(--card2);cursor:pointer;color:var(--muted);font-weight:700;transition:all 0.2s}
.ex-card.done .checkbtn{background:var(--green);border-color:var(--green);color:#000}
.ex-name{font-weight:700;font-size:14px;color:var(--text)}
.ex-meta{font-size:11px;color:var(--muted);margin-top:3px}
.log-panel{background:var(--card2);padding:12px 14px;border-top:1px solid var(--border)}
.set-row{display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:8px 12px;margin-bottom:8px}
.set-row:last-child{margin-bottom:0}
.set-lbl{font-size:11px;color:var(--accent);min-width:18px;font-weight:700}
.set-input{width:50px;padding:6px;border:1px solid var(--border);border-radius:8px;font-size:13px;text-align:center;background:var(--card);color:var(--text)}
.set-input::placeholder{color:var(--muted)}
.set-unit{font-size:10px;color:var(--muted);flex-shrink:0}
.rest-btn{background:var(--accent);color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:10px;cursor:pointer;margin-left:auto;flex-shrink:0;font-weight:700;letter-spacing:0.3px}
.footer-actions{padding:4px 0 70px}
.btn-finish{background:linear-gradient(135deg,#00c853,#00e676);color:#000;border:none;padding:18px;border-radius:16px;font-size:16px;font-weight:800;width:100%;cursor:pointer;letter-spacing:0.3px}
.btn-finish:disabled{opacity:0.6;cursor:not-allowed}
.btn-draft{background:var(--card);color:var(--blue);border:1px solid var(--blue);padding:13px;border-radius:12px;font-size:14px;font-weight:600;width:100%;margin-top:10px;cursor:pointer}
.btn-reset{background:var(--card);color:var(--muted);border:1px solid var(--border);padding:11px;border-radius:12px;font-size:13px;width:100%;margin-top:10px;cursor:pointer}
.timer-overlay{position:fixed;bottom:20px;right:16px;background:#1a1a2e;color:var(--text);padding:14px 18px;border-radius:20px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:100;min-width:140px;border:1px solid var(--accent)}
.timer-phase{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--accent)}
.timer-display{font-weight:800;font-size:30px;font-variant-numeric:tabular-nums;color:var(--text)}
.timer-btns{display:flex;gap:6px;width:100%}
.tbtn{background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:8px;cursor:pointer;font-size:10px;flex:1;font-weight:600}
.tbtn.hiit-active{background:var(--amber);border-color:var(--amber);color:#000}
.toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:var(--text);padding:10px 20px;border-radius:20px;font-size:13px;z-index:200;white-space:nowrap;border:1px solid var(--accent)}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.stat-cell{background:var(--card);border-radius:12px;padding:14px;border:1px solid var(--border)}
.stat-label{font-size:10px;color:var(--muted);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px}
.stat-val{font-size:22px;font-weight:800;color:var(--text)}
.stat-unit{font-size:11px;font-weight:400;color:var(--muted);margin-left:2px}
.section-card{background:var(--card);padding:16px;border-radius:16px;border:1px solid var(--border);margin-bottom:14px}
.section-title{font-weight:700;font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:14px}
.lift-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.lift-row:last-child{border-bottom:none}
.lift-name{color:var(--text)}
.lift-val{font-weight:700;color:var(--accent)}
.hist-item{background:var(--card);border-radius:14px;border:1px solid var(--border);margin-bottom:10px;overflow:hidden}
.hist-hdr{display:flex;align-items:center;padding:13px 14px;cursor:pointer}
.hist-date{font-weight:700;font-size:13px;color:var(--text)}
.hist-meta{font-size:11px;color:var(--muted);margin-top:3px}
.del-btn{background:none;border:none;color:var(--red);font-size:15px;padding:2px 8px;cursor:pointer;flex-shrink:0}
.type-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-left:6px;vertical-align:middle}
.bp{background:rgba(255,82,82,0.15);color:#ff8a80}
.bl{background:rgba(79,195,247,0.15);color:var(--blue)}
.bg{background:rgba(0,230,118,0.15);color:var(--green)}
.bc{background:rgba(255,171,0,0.15);color:var(--amber)}
.br{background:rgba(120,120,160,0.15);color:var(--muted)}
.empty-state{text-align:center;padding:60px 20px;color:var(--muted);font-size:13px}
.settings-section{background:var(--card);padding:16px;border-radius:16px;border:1px solid var(--border);margin-bottom:14px}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text)}
.settings-row:last-child{border-bottom:none}
.settings-input{width:64px;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:13px;text-align:center;background:var(--card2);color:var(--text)}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.day-pills{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 16px 0;background:var(--card);border-bottom:1px solid var(--border)}
.day-pills::-webkit-scrollbar{display:none}
.day-pill{padding:8px 14px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0;cursor:pointer;background:var(--card2);color:var(--muted);border:1px solid var(--border)}
.day-pill.active{background:var(--accent);color:white;border-color:var(--accent)}
.bottom-nav{display:flex;background:#13131c;border-top:1px solid var(--border);padding:8px 0 16px;flex-shrink:0;position:fixed;bottom:0;left:0;right:0;z-index:200;width:100%}
.bnav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 0;background:none;border:none;cursor:pointer}
.bnav-icon{font-size:20px;line-height:1}
.bnav-label{font-size:10px;font-weight:600;color:var(--muted)}
.bnav-item.active .bnav-label{color:var(--accent)}
.bnav-item.active-green .bnav-label{color:var(--green)}
.bnav-dot{width:4px;height:4px;border-radius:50%;background:var(--accent);margin-top:-1px}
.bnav-dot.green{background:var(--green)}
.body-toggle{display:flex;background:var(--card2);border-radius:12px;padding:4px;gap:3px;margin-bottom:16px}
.bt-btn{flex:1;text-align:center;padding:9px 4px;border-radius:9px;font-size:11px;font-weight:700;color:var(--muted);cursor:pointer;background:none;border:none}
.bt-btn.active{background:var(--card);color:var(--text)}
.date-nav{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:14px}
.date-nav-btn{background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:7px 13px;font-size:15px;cursor:pointer}
.date-nav-val{background:var(--card);border:1px solid var(--accent);color:var(--accent);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600}
.steps-hero{background:linear-gradient(135deg,#0d1f12,#112218);border:1px solid rgba(0,230,118,0.2);border-radius:16px;padding:18px;margin-bottom:14px;display:flex;align-items:center;gap:16px}
.ring-wrap{position:relative;width:80px;height:80px;flex-shrink:0}
.ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring-pct{font-size:14px;font-weight:800;color:var(--green)}
.ring-lbl{font-size:9px;color:var(--muted)}
.steps-num{font-size:28px;font-weight:800;color:var(--text);line-height:1}
.steps-sub{font-size:11px;color:var(--muted);margin-top:3px}
.steps-bar{background:var(--border);border-radius:20px;height:4px;margin-top:10px}
.steps-bar-fill{height:100%;border-radius:20px;background:var(--green);transition:width 0.4s}
.input-group{margin-bottom:12px}
.input-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.body-input{width:100%;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:11px 12px;font-size:14px;font-weight:600;outline:none;transition:border-color .15s}
.body-input:focus{border-color:var(--accent)}
.body-input.blue{border-color:var(--blue);color:var(--blue)}
.body-input.dim{color:var(--muted);font-weight:400}
.body-input.filled{border-color:rgba(108,99,255,0.4)}
.body-input.meas-input{padding:8px 10px;font-size:13px}
.btn-body-save{width:100%;padding:15px;border-radius:13px;font-size:14px;font-weight:800;border:none;cursor:pointer;letter-spacing:0.3px}
.btn-body-save:disabled{opacity:0.5;cursor:not-allowed}
.btn-body-save.green{background:linear-gradient(135deg,#00c853,var(--green));color:#000}
.btn-body-save.purple{background:linear-gradient(135deg,var(--accent),#9c8fff);color:white}
.reminder-banner{background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.25);border-radius:12px;padding:11px 13px;margin-bottom:14px;display:flex;gap:10px;align-items:center}
.auto-panel{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:14px}
.auto-panel-title{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.calc-cell{background:var(--bg);border-radius:10px;padding:10px;border:1px solid var(--border)}
.cc-lbl{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.7px}
.cc-val{font-size:20px;font-weight:800;color:var(--text);margin-top:2px;line-height:1}
.cc-tag{font-size:9px;font-weight:700;margin-top:4px;padding:2px 7px;border-radius:20px;display:inline-block}
.cc-hint{font-size:9px;color:var(--muted);margin-top:4px;font-style:italic}
.sec-hdr{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin:12px 0 8px;display:flex;align-items:center;gap:6px}
.sec-hdr::before{content:'';width:3px;height:11px;background:var(--accent);border-radius:2px;flex-shrink:0}
.meas-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px}
.meas-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:4px}
.meas-field{display:flex;flex-direction:column;gap:4px}
.meas-label{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.7px}
.hist-tabs{display:flex;gap:8px;margin-bottom:12px}
.hist-tab{padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:none}
.hist-tab.active{background:var(--accent);color:white}
.hist-tab:not(.active){background:var(--card2);color:var(--muted);border:1px solid var(--border)}
.streak-card{background:linear-gradient(135deg,rgba(0,230,118,0.08),rgba(0,230,118,0.02));border:1px solid rgba(0,230,118,0.2);border-radius:14px;padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px}
.streak-num{font-size:34px;font-weight:800;color:var(--green);line-height:1}
.streak-label{font-size:13px;font-weight:700;color:var(--text)}
.streak-sub{font-size:11px;color:var(--muted);margin-top:2px}
.hist-row{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.hist-row.meas{border-color:rgba(108,99,255,0.3)}
.hr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
.hr-date{font-weight:700;font-size:12px;color:var(--text)}
.hr-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px}
.hr-badge.green{background:rgba(0,230,118,0.12);color:var(--green)}
.hr-badge.purple{background:rgba(108,99,255,0.12);color:var(--accent)}
.hr-pills{display:flex;flex-wrap:wrap;gap:5px}
.hr-pill{background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:3px 9px;font-size:11px;color:var(--muted)}
.hr-pill b{color:var(--text);font-weight:600}

`;


