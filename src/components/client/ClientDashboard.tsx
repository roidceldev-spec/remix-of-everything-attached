import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/account/AccountProvider";
import { ProgressPicturesDashboardSection } from "@/components/client/progress-pictures/ProgressPicturesDashboardSection";
import { useChat } from "@/components/chat/ChatProvider";
import {
  type DayAssignment,
  type ProgramSummary,
  loadPrograms,
  weekdayFromDate,
} from "@/lib/coach-programs";
import { type ProgramWorkout, loadWorkouts } from "@/lib/coach-workouts";
import { getClientGreeting } from "@/lib/client-greeting";
import { useProgressPictureBatches } from "@/hooks/use-progress-picture-batches";

export function ClientDashboard() {
  const { account: client, refresh } = useAccount();
  const { summary: chatSummary } = useChat();
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [hydrated, setHydrated] = useState(false);
  const progressPictures = useProgressPictureBatches(
    client?.role === "client" ? client.id : undefined,
  );

  useEffect(() => {
    const loadCachedCoachData = () => {
      setPrograms(loadPrograms());
      setWorkouts(loadWorkouts());
    };

    void refresh();
    loadCachedCoachData();
    setNow(new Date());
    setHydrated(true);

    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    window.addEventListener("no-more-copium:cloud-cache-refreshed", loadCachedCoachData);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("no-more-copium:cloud-cache-refreshed", loadCachedCoachData);
    };
  }, [refresh]);

  const assignedProgram = useMemo(
    () => programs.find((program) => program.id === client?.assignedProgramId),
    [client?.assignedProgramId, programs],
  );
  const weekday = weekdayFromDate(now);
  const assignment: DayAssignment | undefined = assignedProgram?.dayAssignments[weekday];
  const todayWorkout = useMemo(() => {
    if (!assignedProgram || assignment?.type !== "workout") return undefined;
    return workouts.find((workout) => workout.id === assignment.workoutId);
  }, [assignedProgram, assignment, workouts]);

  if (!hydrated || !client || client.role !== "client") return null;

  return (
    <section>
      {chatSummary.unreadMessages > 0 && (
        <Link
          to="/client/chat"
          className="mb-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>
            You have {chatSummary.unreadMessages} unread message
            {chatSummary.unreadMessages === 1 ? "" : "s"} from your coach.
          </span>
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {getClientGreeting(client.name, now)}
      </h1>

      <section aria-labelledby="today-workout-heading" className="mt-10 space-y-3">
        <h2 id="today-workout-heading" className="text-sm font-medium text-muted-foreground">
          Today&apos;s workout
        </h2>

        {todayWorkout && assignedProgram ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3
              className="truncate text-xl font-semibold text-card-foreground"
              title={todayWorkout.name}
            >
              {todayWorkout.name}
            </h3>
            <Button asChild className="mt-5 w-full sm:w-auto">
              <Link
                to="/client/programs/$programId/workouts/$workoutId"
                params={{ programId: assignedProgram.id, workoutId: todayWorkout.id }}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Start workout
              </Link>
            </Button>
          </div>
        ) : (
          <TodayState assignment={assignment} hasAssignedProgram={assignedProgram !== undefined} />
        )}
      </section>

      <ProgressPicturesDashboardSection
        clientId={client.id}
        batches={progressPictures.batches}
        loading={progressPictures.loading}
        error={progressPictures.error}
        onRetry={() => void progressPictures.refresh()}
        onUploaded={progressPictures.refresh}
      />
    </section>
  );
}

function TodayState({
  assignment,
  hasAssignedProgram,
}: {
  assignment: DayAssignment | undefined;
  hasAssignedProgram: boolean;
}) {
  let title = "No program assigned";
  let description = "Your coach has not assigned a training program yet.";

  if (hasAssignedProgram && assignment?.type === "rest") {
    title = "Rest day";
    description = "No workout is scheduled for today.";
  } else if (hasAssignedProgram && assignment?.type === "workout") {
    title = "Workout unavailable";
    description = "The workout assigned for today could not be found.";
  } else if (hasAssignedProgram) {
    title = "No workout scheduled";
    description = "Your program does not have a workout assigned for today.";
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
