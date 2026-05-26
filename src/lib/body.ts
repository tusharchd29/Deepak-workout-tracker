import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────

export interface DailyStep {
  id: string;
  log_date: string;
  steps_count: number | null;
  steps_goal: number;
  notes: string | null;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  log_date: string;
  weight_kg: number | null;
  height_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  neck_cm: number | null;
  shoulders_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  left_calf_cm: number | null;
  right_calf_cm: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  waist_hip_ratio: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Auto-calculation helpers ──────────────────────────────────────────────

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

// US Navy formula — Male
// BF% = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
export function calcBodyFat(waistCm: number, neckCm: number, heightCm: number): number | null {
  const diff = waistCm - neckCm;
  if (diff <= 0) return null;
  const bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450;
  return Math.round(bf * 10) / 10;
}

export function calcWHR(waistCm: number, hipsCm: number): number {
  return Math.round((waistCm / hipsCm) * 100) / 100;
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#4fc3f7' };
  if (bmi < 25)   return { label: 'Normal', color: '#00e676' };
  if (bmi < 30)   return { label: 'Overweight', color: '#ffab00' };
  return { label: 'Obese', color: '#ff5252' };
}

export function bfCategory(bf: number): { label: string; color: string } {
  if (bf < 6)  return { label: 'Essential', color: '#4fc3f7' };
  if (bf < 14) return { label: 'Athletic', color: '#00e676' };
  if (bf < 18) return { label: 'Fit', color: '#00e676' };
  if (bf < 25) return { label: 'Average', color: '#ffab00' };
  return { label: 'Obese', color: '#ff5252' };
}

export function whrCategory(whr: number): { label: string; color: string } {
  // Male thresholds
  if (whr < 0.85) return { label: 'Low Risk', color: '#00e676' };
  if (whr < 0.95) return { label: 'Moderate', color: '#ffab00' };
  return { label: 'High Risk', color: '#ff5252' };
}

// ── Daily Steps ───────────────────────────────────────────────────────────

export async function fetchDailySteps(limit = 30): Promise<DailyStep[]> {
  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .order('log_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchStepsByDate(date: string): Promise<DailyStep | null> {
  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .eq('log_date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDailySteps(row: {
  log_date: string;
  steps_count: number | null;
  steps_goal: number;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('daily_steps')
    .upsert(row, { onConflict: 'log_date' });
  if (error) throw error;
}

// ── Body Measurements ─────────────────────────────────────────────────────

export async function fetchMeasurements(limit = 20): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .order('log_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchMeasurementByDate(date: string): Promise<BodyMeasurement | null> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('log_date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMeasurement(row: Partial<BodyMeasurement> & { log_date: string }): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .upsert(row, { onConflict: 'log_date' });
  if (error) throw error;
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftDate(iso: string, days: number): string {
  // Use local date math — avoids UTC timezone shift (important for India UTC+5:30)
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1, day + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatDisplayDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function daysSince(iso: string): number {
  const then = new Date(iso + 'T00:00:00').getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
