import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProgressPictureBatches } from "@/lib/cloud-progress-pictures";
import type { ProgressPictureBatch } from "@/lib/progress-pictures";

export function useProgressPictureBatches(clientId: string | undefined) {
  const [batches, setBatches] = useState<ProgressPictureBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (showLoading = false) => {
      if (!clientId) {
        setBatches([]);
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      setError(null);
      try {
        setBatches(await fetchProgressPictureBatches(clientId));
      } catch (nextError) {
        console.error("Failed to load progress pictures", nextError);
        setError("Progress pictures could not be loaded from Cloud.");
      } finally {
        setLoading(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    void refresh(true);
    if (!clientId) return;

    const channel = supabase
      .channel(`progress-pictures-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "progress_picture_batches",
          filter: `client_id=eq.${clientId}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progress_pictures" },
        () => void refresh(),
      )
      .subscribe();

    const refreshOnFocus = () => void refresh();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [clientId, refresh]);

  return { batches, loading, error, refresh: () => refresh(true) };
}
