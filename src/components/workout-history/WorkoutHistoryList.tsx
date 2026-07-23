import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatElapsed } from "@/lib/coach-workout-preview";
import {
  type WorkoutHistorySession,
  type WorkoutSessionSetSnapshot,
  fetchWorkoutSessions,
} from "@/lib/workout-history";

export function WorkoutHistoryList({ clientId }: { clientId: string }) {
  const [sessions, setSessions] = useState<WorkoutHistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await fetchWorkoutSessions(clientId));
    } catch (nextError) {
      console.error(nextError);
      setError("Workout history could not be loaded from Cloud.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`workout-history-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workout_sessions",
          filter: `client_id=eq.${clientId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clientId, load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading workout history…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void load()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Dumbbell className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-3 text-sm font-medium text-foreground">No completed workouts yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Finished workouts will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {sessions.map((session) => {
        const expanded = session.id === expandedId;
        const detailsId = `workout-session-${session.id}`;
        return (
          <li key={session.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : session.id)}
              aria-expanded={expanded}
              aria-controls={detailsId}
              className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-card-foreground">
                  {session.workoutName}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatCompletedAt(session.completedAt)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatElapsed(session.durationSeconds)} · {session.completedSets}/
                  {session.totalSets} sets · {session.totalReps} reps
                </p>
              </div>
              {expanded ? (
                <ChevronUp
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </button>
            {expanded && <WorkoutSessionDetails id={detailsId} session={session} />}
          </li>
        );
      })}
    </ol>
  );
}

function WorkoutSessionDetails({ id, session }: { id: string; session: WorkoutHistorySession }) {
  const volume = useMemo(() => formatVolume(session), [session]);
  return (
    <div id={id} className="space-y-4 border-t border-border p-4">
      <dl className="grid grid-cols-2 gap-2">
        <HistoryStat label="Duration" value={formatElapsed(session.durationSeconds)} />
        <HistoryStat
          label="Completed sets"
          value={`${session.completedSets}/${session.totalSets}`}
        />
        <HistoryStat label="Total reps" value={`${session.totalReps}`} />
        <HistoryStat label="Total volume" value={volume || "0"} />
      </dl>

      <div className="space-y-4">
        {session.data.exercises.map((exercise, exerciseIndex) => (
          <section key={exercise.exerciseInstanceId} className="space-y-2">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                <span className="text-muted-foreground">{exerciseIndex + 1}.</span>{" "}
                {exercise.exerciseName}
              </h4>
              {exercise.coachNotes && (
                <HistoryNote label="Notes from coach" value={exercise.coachNotes} />
              )}
            </div>
            <ol className="space-y-2">
              {exercise.sets.map((set) => (
                <li key={set.setId} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Set {set.setNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {set.completed ? "Completed" : "Not completed"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatPrescription(set)}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <HistoryStat
                      label="Weight done"
                      value={`${formatNumber(set.weightDone)} ${set.weightDoneUnit.shortForm}`}
                      compact
                    />
                    <HistoryStat label="Reps done" value={`${set.repsDone}`} compact />
                  </dl>
                  {set.coachNotes && (
                    <HistoryNote label="Notes from coach" value={set.coachNotes} />
                  )}
                  {set.notesToCoach && (
                    <HistoryNote label="Notes to coach" value={set.notesToCoach} emphasized />
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function HistoryStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={compact ? "mt-0.5 text-sm font-medium" : "mt-1 text-base font-semibold"}>
        {value}
      </dd>
    </div>
  );
}

function HistoryNote({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className={`mt-2 rounded-md px-3 py-2 ${emphasized ? "bg-primary/10" : "bg-muted/50"}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-xs text-foreground">{value}</p>
    </div>
  );
}

function formatCompletedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPrescription(set: WorkoutSessionSetSnapshot): string {
  const parts: string[] = [];
  parts.push(set.setType.replaceAll("_", " "));
  if (set.intensity) parts.push(set.intensity.toUpperCase());
  if (set.suggestedWeightMin !== undefined && set.suggestedWeightMax !== undefined) {
    parts.push(
      `suggested ${formatNumber(set.suggestedWeightMin)}–${formatNumber(set.suggestedWeightMax)} ${set.suggestedWeightUnit.shortForm}`,
    );
  }
  if (set.targetReps !== undefined) parts.push(`${set.targetReps} reps`);
  else if (set.repRangeMin !== undefined && set.repRangeMax !== undefined) {
    parts.push(`${set.repRangeMin}–${set.repRangeMax} reps`);
  }
  return parts.join(" · ");
}

function formatVolume(session: WorkoutHistorySession): string {
  const unitLabels = new Map<string, string>();
  for (const exercise of session.data.exercises) {
    for (const set of exercise.sets) {
      unitLabels.set(set.weightDoneUnit.id, set.weightDoneUnit.shortForm);
    }
  }
  return Object.entries(session.volumeByUnitId)
    .map(([unitId, value]) => `${formatNumber(value)} ${unitLabels.get(unitId) ?? unitId}`)
    .join(" · ");
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`;
}
