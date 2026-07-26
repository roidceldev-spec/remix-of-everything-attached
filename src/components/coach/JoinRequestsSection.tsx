import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ImageIcon, UserCheck } from "lucide-react";
import { type AppAccount, fetchAccount } from "@/lib/cloud-accounts";
import {
  LOCAL_JOIN_REQUESTS_CHANGED_EVENT,
  type LocalJoinRequest,
  fetchPendingJoinRequests,
} from "@/lib/local-join-requests";

export function JoinRequestsSection() {
  const [requests, setRequests] = useState<
    Array<{ request: LocalJoinRequest; client: AppAccount }>
  >([]);

  const load = useCallback(async () => {
    const pending = await fetchPendingJoinRequests();
    const hydrated = await Promise.all(
      pending.map(async (request) => ({ request, client: await fetchAccount(request.clientId) })),
    );
    setRequests(
      hydrated.filter((entry): entry is { request: LocalJoinRequest; client: AppAccount } =>
        Boolean(entry.client),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(LOCAL_JOIN_REQUESTS_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LOCAL_JOIN_REQUESTS_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [load]);

  return (
    <section aria-labelledby="join-requests-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="join-requests-heading" className="text-lg font-semibold text-foreground">
            Join Requests
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review Clients who finished onboarding and submitted images.
          </p>
        </div>
        {requests.length > 0 && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
            {requests.length}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <UserCheck className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">No pending join requests.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border">
          {requests.map(({ request, client }) => (
            <li key={client.id} className="border-b border-border last:border-b-0">
              <Link
                to="/coach/chat/$clientId"
                params={{ clientId: client.id }}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{client.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{client.username}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {request.imageCount} image{request.imageCount === 1 ? "" : "s"} ·{" "}
                    {formatRequestTime(request.requestedAt)}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatRequestTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
