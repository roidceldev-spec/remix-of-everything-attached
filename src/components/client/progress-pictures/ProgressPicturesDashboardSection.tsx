import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Camera, Check, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ProgressPictureBatch,
  formatProgressPictureDate,
  getProgressPicturePreview,
  latestProgressPictureBatches,
  localProgressPictureDate,
  progressPictureHabitDays,
} from "@/lib/progress-pictures";
import { cn } from "@/lib/utils";
import { ProgressPictureTile } from "./ProgressPictureTile";
import { ProgressPictureUploadDialog } from "./ProgressPictureUploadDialog";

export function ProgressPicturesDashboardSection({
  clientId,
  batches,
  loading,
  error,
  onRetry,
  onUploaded,
}: {
  clientId: string;
  batches: ProgressPictureBatch[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onUploaded: () => Promise<void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const latest = latestProgressPictureBatches(batches, 3);
  const habitDays = progressPictureHabitDays(batches);
  const habitComplete = habitDays >= 7;
  const hasTodayBatch = batches.some((batch) => batch.captureDate === localProgressPictureDate());

  return (
    <section aria-labelledby="progress-pictures-heading" className="mt-10 space-y-3">
      <Link
        to="/client/progress-pictures"
        className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Open Progress Pictures"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="progress-pictures-heading" className="text-lg font-semibold text-foreground">
              Progress Pictures
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {habitComplete
                ? "Click to see Progress Pictures and adjust preview"
                : "Take progress pictures for seven days to start building the habit."}
            </p>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>

        {habitComplete ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {latest.map((batch) => {
              const preview = getProgressPicturePreview(batch);
              return (
                <ProgressPictureTile
                  key={batch.id}
                  imageUrl={preview?.imageUrl}
                  alt={`Progress picture from ${formatProgressPictureDate(batch.captureDate, "long")}`}
                  eager
                  className="transition-colors group-hover:border-primary/40"
                />
              );
            })}
          </div>
        ) : (
          <HabitProgress completedDays={habitDays} />
        )}
      </Link>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 px-3 py-2">
          <p className="flex min-w-0 items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {!hasTodayBatch && (
        <>
          <Button
            type="button"
            className="w-full"
            disabled={loading || error !== null}
            aria-describedby="progress-upload-status"
            onClick={() => setUploadOpen(true)}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Take today&apos;s progress pictures
          </Button>
          <p id="progress-upload-status" className="text-xs text-muted-foreground">
            {loading
              ? "Checking today’s progress pictures…"
              : "Choose your camera or gallery. Pictures are optimized before upload."}
          </p>
        </>
      )}

      <ProgressPictureUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clientId={clientId}
        batches={batches}
        initialCaptureDate={localProgressPictureDate()}
        onUploaded={onUploaded}
      />
    </section>
  );
}

function HabitProgress({ completedDays }: { completedDays: number }) {
  return (
    <div
      className="mt-3"
      role="progressbar"
      aria-label={`${completedDays} of 7 progress-picture days complete`}
      aria-valuemin={0}
      aria-valuemax={7}
      aria-valuenow={completedDays}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 6 }, (_, index) => {
          const complete = index < completedDays;
          return (
            <div
              key={index}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border",
                complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-dashed border-border bg-muted/30 text-muted-foreground",
              )}
              aria-label={`Day ${index + 1} ${complete ? "complete" : "not complete"}`}
            >
              {complete ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
      <div
        className={cn(
          "mt-1.5 flex h-12 items-center justify-center rounded-md border",
          completedDays >= 7
            ? "border-primary bg-primary text-primary-foreground"
            : "border-dashed border-border bg-muted/30 text-muted-foreground",
        )}
        aria-label={`Day 7 ${completedDays >= 7 ? "complete" : "not complete"}`}
      >
        {completedDays >= 7 ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4" aria-hidden="true" />
            Seven-day habit complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-medium">
            <Camera className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Day 7
          </span>
        )}
      </div>
      <p className="mt-2 text-right text-xs font-medium text-muted-foreground">
        {completedDays}/7 days
      </p>
    </div>
  );
}
