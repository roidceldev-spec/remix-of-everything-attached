import type { Exercise } from "./coach-exercises";
import type { WeightUnit } from "./coach-weight-units";
import { getWeightUnit } from "./coach-weight-units";
import type { ProgramWorkout } from "./coach-workouts";
import type { SessionResultsMap } from "./coach-workout-preview";
import { computeSummary, resultKey } from "./coach-workout-preview";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

export type WorkoutSessionUnitSnapshot = {
  id: string;
  longForm: string;
  shortForm: string;
};

export type WorkoutSessionSetSnapshot = {
  setId: string;
  setNumber: number;
  setType: string;
  intensity?: string;
  suggestedWeightMin?: number;
  suggestedWeightMax?: number;
  suggestedWeightUnit: WorkoutSessionUnitSnapshot;
  targetReps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  restSeconds?: number;
  coachNotes?: string;
  completed: boolean;
  weightDone: number;
  weightDoneUnit: WorkoutSessionUnitSnapshot;
  repsDone: number;
  notesToCoach?: string;
};

export type WorkoutSessionExerciseSnapshot = {
  exerciseInstanceId: string;
  exerciseId: string;
  exerciseName: string;
  coachNotes?: string;
  sets: WorkoutSessionSetSnapshot[];
};

export type WorkoutSessionData = {
  version: 1;
  exercises: WorkoutSessionExerciseSnapshot[];
};

export type WorkoutHistorySession = {
  id: string;
  clientId: string;
  programId?: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  completedSets: number;
  totalSets: number;
  totalReps: number;
  volumeByUnitId: Record<string, number>;
  data: WorkoutSessionData;
};

type WorkoutSessionRow = Tables<"workout_sessions">;

export function createWorkoutSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex
    .slice(12, 16)
    .join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function unitSnapshot(unit: WeightUnit): WorkoutSessionUnitSnapshot {
  return { id: unit.id, longForm: unit.longForm, shortForm: unit.shortForm };
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function volumeRecord(value: Json): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0) {
      normalized[key] = candidate;
    }
  }
  return normalized;
}

function sessionData(value: Json): WorkoutSessionData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: 1, exercises: [] };
  }
  const raw = value as Record<string, Json | undefined>;
  if (raw.version !== 1 || !Array.isArray(raw.exercises)) {
    return { version: 1, exercises: [] };
  }
  return value as unknown as WorkoutSessionData;
}

function mapSession(row: WorkoutSessionRow): WorkoutHistorySession {
  return {
    id: row.id,
    clientId: row.client_id,
    programId: row.program_id ?? undefined,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: nonNegativeInteger(row.duration_seconds),
    completedSets: nonNegativeInteger(row.completed_sets),
    totalSets: nonNegativeInteger(row.total_sets),
    totalReps: nonNegativeInteger(row.total_reps),
    volumeByUnitId: volumeRecord(row.volume_by_unit),
    data: sessionData(row.session_data),
  };
}

export function buildWorkoutSessionData({
  workout,
  exercises,
  weightUnits,
  results,
}: {
  workout: ProgramWorkout;
  exercises: Exercise[];
  weightUnits: WeightUnit[];
  results: SessionResultsMap;
}): WorkoutSessionData {
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return {
    version: 1,
    exercises: workout.exercises.map((exercise) => {
      const definition = exercisesById.get(exercise.exerciseId);
      return {
        exerciseInstanceId: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseName: definition?.name ?? "Unknown exercise",
        coachNotes: exercise.notes,
        sets: exercise.sets.map((set, setIndex) => {
          const result = results[resultKey(exercise.id, set.id)];
          const suggestedUnit = getWeightUnit(weightUnits, set.weightUnitId);
          const doneUnit = getWeightUnit(
            weightUnits,
            result?.actualWeightUnitId ?? set.weightUnitId,
          );
          return {
            setId: set.id,
            setNumber: setIndex + 1,
            setType: set.setType,
            intensity: set.intensity,
            suggestedWeightMin: set.suggestedWeightMin,
            suggestedWeightMax: set.suggestedWeightMax,
            suggestedWeightUnit: unitSnapshot(suggestedUnit),
            targetReps: set.targetReps,
            repRangeMin: set.repRangeMin,
            repRangeMax: set.repRangeMax,
            restSeconds: set.restSeconds,
            coachNotes: set.coachNotes,
            completed: result?.completed ?? false,
            weightDone: result?.actualWeight ?? 0,
            weightDoneUnit: unitSnapshot(doneUnit),
            repsDone: result?.actualReps ?? 0,
            notesToCoach: result?.notesToCoach,
          };
        }),
      };
    }),
  };
}

export async function saveWorkoutSession({
  sessionId = createWorkoutSessionId(),
  clientId,
  programId,
  workout,
  exercises,
  weightUnits,
  results,
  durationSeconds,
  completedAt = new Date(),
}: {
  sessionId?: string;
  clientId: string;
  programId?: string;
  workout: ProgramWorkout;
  exercises: Exercise[];
  weightUnits: WeightUnit[];
  results: SessionResultsMap;
  durationSeconds: number;
  completedAt?: Date;
}): Promise<WorkoutHistorySession> {
  const normalizedDuration = nonNegativeInteger(durationSeconds);
  const summary = computeSummary(workout, results);
  const totalSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedAtIso = completedAt.toISOString();
  const startedAtIso = new Date(completedAt.getTime() - normalizedDuration * 1000).toISOString();
  const data = buildWorkoutSessionData({ workout, exercises, weightUnits, results });

  const { data: inserted, error } = await supabase
    .from("workout_sessions")
    .insert({
      id: sessionId,
      client_id: clientId,
      program_id: programId ?? null,
      workout_id: workout.id,
      workout_name: workout.name,
      started_at: startedAtIso,
      completed_at: completedAtIso,
      duration_seconds: normalizedDuration,
      completed_sets: summary.completedSets,
      total_sets: totalSets,
      total_reps: summary.totalReps,
      volume_by_unit: asJson(summary.volumeByUnitId),
      session_data: asJson(data),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: fetchError } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (!fetchError && existing) return mapSession(existing);
    }
    throw error;
  }
  return mapSession(inserted);
}

export async function fetchWorkoutSessions(clientId: string): Promise<WorkoutHistorySession[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("client_id", clientId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSession);
}
