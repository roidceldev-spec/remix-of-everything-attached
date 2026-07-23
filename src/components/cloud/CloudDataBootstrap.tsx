import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { EXERCISES_STORAGE_KEY } from "@/lib/coach-exercises";
import { PROGRAMS_STORAGE_KEY } from "@/lib/coach-programs";
import { WORKOUTS_STORAGE_KEY } from "@/lib/coach-workouts";
import { CUSTOM_WEIGHT_UNITS_STORAGE_KEY } from "@/lib/coach-weight-units";
import { CLOUD_DATA_CHANGED_EVENT, type CloudDataField } from "@/lib/cloud-events";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_BY_FIELD: Record<CloudDataField, string> = {
  programs: PROGRAMS_STORAGE_KEY,
  exercises: EXERCISES_STORAGE_KEY,
  workouts: WORKOUTS_STORAGE_KEY,
  weight_units: CUSTOM_WEIGHT_UNITS_STORAGE_KEY,
};

type CloudStateRow = {
  programs: unknown;
  exercises: unknown;
  workouts: unknown;
  weight_units: unknown;
};

function writeCloudRowToCache(row: CloudStateRow): void {
  for (const field of Object.keys(STORAGE_BY_FIELD) as CloudDataField[]) {
    const value = Array.isArray(row[field]) ? row[field] : [];
    window.localStorage.setItem(STORAGE_BY_FIELD[field], JSON.stringify(value));
  }
  window.dispatchEvent(new Event("no-more-copium:cloud-cache-refreshed"));
}

export function CloudDataBootstrap({ children }: { children: ReactNode }) {
  const { user, loading: accountLoading } = useAccount();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const timersRef = useRef<Partial<Record<CloudDataField, number>>>({});

  const load = useCallback(async () => {
    setStatus("loading");
    const { data, error } = await supabase
      .from("app_state")
      .select("programs, exercises, workouts, weight_units")
      .eq("id", "global")
      .maybeSingle();

    if (error) {
      console.error("Failed to load Cloud app state", error);
      setStatus("error");
      return;
    }

    const row: CloudStateRow = data ?? {
      programs: [],
      exercises: [],
      workouts: [],
      weight_units: [],
    };
    writeCloudRowToCache(row);
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (accountLoading) return;
    if (!user) {
      setStatus("ready");
      return;
    }

    void load();

    const channel = supabase
      .channel(`no-more-copium-app-state-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_state", filter: "id=eq.global" },
        (payload) => {
          writeCloudRowToCache(payload.new as CloudStateRow);
        },
      )
      .subscribe();

    const timers = timersRef.current;
    const onDataChanged = (event: Event) => {
      const field = (event as CustomEvent<CloudDataField>).detail;
      if (!(field in STORAGE_BY_FIELD)) return;
      const existingTimer = timers[field];
      if (existingTimer !== undefined) window.clearTimeout(existingTimer);
      timers[field] = window.setTimeout(async () => {
        const stored = window.localStorage.getItem(STORAGE_BY_FIELD[field]);
        let value: unknown[] = [];
        try {
          const parsed: unknown = stored ? JSON.parse(stored) : [];
          value = Array.isArray(parsed) ? parsed : [];
        } catch {
          value = [];
        }
        const { error } = await supabase
          .from("app_state")
          .update({ [field]: value } as never)
          .eq("id", "global");
        if (error) console.error(`Failed to sync ${field} to Cloud`, error);
      }, 300);
    };

    window.addEventListener(CLOUD_DATA_CHANGED_EVENT, onDataChanged);
    return () => {
      window.removeEventListener(CLOUD_DATA_CHANGED_EVENT, onDataChanged);
      void supabase.removeChannel(channel);
      for (const timer of Object.values(timers)) {
        if (timer !== undefined) window.clearTimeout(timer);
      }
    };
  }, [accountLoading, load, user]);

  if (accountLoading || status === "loading") {
    return <div className="min-h-[100dvh] bg-background" aria-label="Loading Cloud data" />;
  }

  if (status === "error") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-foreground">Cloud is unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app could not connect to Lovable Cloud. Check the connection and try again.
          </p>
          <Button className="mt-5" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  return children;
}
