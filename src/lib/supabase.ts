import { createClient } from '@supabase/supabase-js';
import { DAYS } from './data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types matching the normalized schema ──────────────────────────────────

export interface DbSession {
  id: number;
  timestamp: number;
  date: string;
  day_key: string;
  workout_type: string;
  focus: string;
  created_at?: string;
}

export interface DbExercise {
  id: number;
  session_id: number;
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  is_done: boolean;
}

export interface DbSet {
  id: number;
  exercise_id: number;    // FK → workout_exercises.id
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
}

// ── Assembled shape used by the UI ────────────────────────────────────────

export interface SetData {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
}

export interface ExerciseData {
  dbId: number;
  exerciseId: string;       // e.g. 'm1'
  exerciseName: string;
  prescribedSets: number;
  prescribedReps: string;
  isDone: boolean;
  sets: SetData[];
}

export interface WorkoutSession {
  dbId: number;
  timestamp: number;
  date: string;
  dayKey: string;
  workoutType: string;
  focus: string;
  exercises: ExerciseData[];
}

// ── Read: fetch full history ───────────────────────────────────────────────

export async function fetchWorkoutHistory(): Promise<WorkoutSession[]> {
  // 1. Sessions
  const { data: sessions, error: sErr } = await supabase
    .from('workout_sessions')
    .select('*')
    .order('timestamp', { ascending: false });
  if (sErr) throw sErr;
  if (!sessions?.length) return [];

  const sessionIds = sessions.map(s => s.id);

  // 2. Exercises for those sessions
  const { data: exercises, error: eErr } = await supabase
    .from('workout_exercises')
    .select('*')
    .in('session_id', sessionIds);
  if (eErr) throw eErr;

  const exerciseIds = (exercises || []).map(e => e.id);

  // 3. Sets for those exercises
  let sets: DbSet[] = [];
  if (exerciseIds.length) {
    const { data: setsData, error: setErr } = await supabase
      .from('workout_sets')
      .select('*')
      .in('exercise_id', exerciseIds)
      .order('set_number', { ascending: true });
    if (setErr) throw setErr;
    sets = setsData || [];
  }

  // 4. Assemble
  const setsByExercise = new Map<number, DbSet[]>();
  sets.forEach(s => {
    const arr = setsByExercise.get(s.exercise_id) || [];
    arr.push(s);
    setsByExercise.set(s.exercise_id, arr);
  });

  const exercisesBySession = new Map<number, DbExercise[]>();
  (exercises || []).forEach(e => {
    const arr = exercisesBySession.get(e.session_id) || [];
    arr.push(e);
    exercisesBySession.set(e.session_id, arr);
  });

  return sessions.map(s => ({
    dbId: s.id,
    timestamp: s.timestamp,
    date: s.date,
    dayKey: s.day_key,
    workoutType: s.workout_type,
    focus: s.focus,
    exercises: (exercisesBySession.get(s.id) || []).map(e => ({
      dbId: e.id,
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      prescribedSets: e.prescribed_sets,
      prescribedReps: e.prescribed_reps,
      isDone: e.is_done,
      sets: (setsByExercise.get(e.id) || []).map(st => ({
        setNumber: st.set_number,
        weightKg: st.weight_kg,
        reps: st.reps,
      })),
    })),
  }));
}

// ── Write: save a completed workout ───────────────────────────────────────

export interface DraftData {
  done: Record<string, boolean>;
  weights: Record<string, string[]>;
  reps: Record<string, string[]>;
}

export async function saveWorkoutSession(
  timestamp: number,
  date: string,
  dayKey: string,
  draft: DraftData
): Promise<WorkoutSession> {
  const day = DAYS.find(d => d.key === dayKey);
  if (!day) throw new Error('Unknown day key: ' + dayKey);

  // 1. Insert session row
  const { data: sessionRow, error: sErr } = await supabase
    .from('workout_sessions')
    .insert({
      timestamp,
      date,
      day_key: dayKey,
      workout_type: day.type,
      focus: day.focus,
    })
    .select()
    .single();
  if (sErr) throw sErr;

  // 2. Insert exercises that are marked done
  const doneIds = Object.keys(draft.done).filter(id => draft.done[id]);
  if (!doneIds.length) {
    return {
      dbId: sessionRow.id,
      timestamp,
      date,
      dayKey,
      workoutType: day.type,
      focus: day.focus,
      exercises: [],
    };
  }

  const exerciseRows = doneIds.map(exId => {
    const exDef = day.exs.find(e => e.id === exId);
    return {
      session_id: sessionRow.id,
      exercise_id: exId,
      exercise_name: exDef?.name || exId,
      prescribed_sets: exDef?.sets || 0,
      prescribed_reps: exDef?.reps || '',
      is_done: true,
    };
  });

  const { data: insertedExercises, error: eErr } = await supabase
    .from('workout_exercises')
    .insert(exerciseRows)
    .select();
  if (eErr) throw eErr;

  // 3. Insert sets
  const setRows: {
    exercise_id: number;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
  }[] = [];

  (insertedExercises || []).forEach(dbEx => {
    const wts = draft.weights[dbEx.exercise_id] || [];
    const rps = draft.reps[dbEx.exercise_id] || [];
    const exDef = day.exs.find(e => e.id === dbEx.exercise_id);
    const numSets = exDef?.sets || wts.length;

    for (let i = 0; i < numSets; i++) {
      const w = parseFloat(wts[i]);
      const r = parseInt(rps[i]);
      if (!isNaN(w) || !isNaN(r)) {
        setRows.push({
          exercise_id: dbEx.id,
          set_number: i + 1,
          weight_kg: isNaN(w) ? null : w,
          reps: isNaN(r) ? null : r,
        });
      }
    }
  });

  if (setRows.length) {
    const { error: stErr } = await supabase.from('workout_sets').insert(setRows);
    if (stErr) throw stErr;
  }

  // Assemble return value
  const setsByExId = new Map<number, typeof setRows>();
  setRows.forEach(s => {
    const arr = setsByExId.get(s.exercise_id) || [];
    arr.push(s);
    setsByExId.set(s.exercise_id, arr);
  });

  return {
    dbId: sessionRow.id,
    timestamp,
    date,
    dayKey,
    workoutType: day.type,
    focus: day.focus,
    exercises: (insertedExercises || []).map(e => ({
      dbId: e.id,
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      prescribedSets: e.prescribed_sets,
      prescribedReps: e.prescribed_reps,
      isDone: true,
      sets: (setsByExId.get(e.id) || []).map(s => ({
        setNumber: s.set_number,
        weightKg: s.weight_kg,
        reps: s.reps,
      })),
    })),
  };
}

// ── Delete a session (cascades to exercises + sets) ───────────────────────

export async function deleteWorkoutSession(timestamp: number): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('timestamp', timestamp);
  if (error) throw error;
}

// ── Helper: calc volume from assembled session ────────────────────────────

export function calcVolFromSession(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) =>
    total + ex.sets.reduce((s, set) => s + (set.weightKg || 0), 0), 0);
}
