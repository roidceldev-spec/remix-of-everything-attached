import { useRef, useState } from "react";
import { Download, HardDrive, RotateCcw, Trash2, Upload } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clearLocalPrototypeData,
  createLocalPrototypeBackup,
  importLocalPrototypeBackup,
} from "@/lib/local-backup";
import { resetClientOnboarding } from "@/lib/local-prototype-tools";

export function LocalPrototypeTools() {
  const { account, accounts, refresh } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const clients = accounts.filter((candidate) => candidate.role === "client");

  const exportData = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await createLocalPrototypeBackup();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `no-more-copium-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Local data could not be exported.",
      );
    } finally {
      setBusy(false);
    }
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm("Replace all local prototype data with this backup?")) return;
    setBusy(true);
    setError(null);
    try {
      await importLocalPrototypeBackup(file);
      window.location.assign("/access");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "The backup could not be imported.",
      );
      setBusy(false);
    }
  };

  const clearData = async () => {
    if (
      !window.confirm(
        "Delete every local account, chat, workout, picture, cover, and setting on this browser? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    await clearLocalPrototypeData();
    window.location.assign("/access");
  };

  const resetOnboarding = async (clientId: string, name: string) => {
    if (!window.confirm(`Reset onboarding and local chat history for ${name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await resetClientOnboarding(clientId);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Onboarding could not be reset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            Local prototype data
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Accounts, chats, workouts, and images exist only in this browser. Clearing site data
            removes them.
          </p>
        </div>
        <Badge variant="secondary">Local prototype</Badge>
      </div>

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          void importData(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void exportData()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => importRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Import
        </Button>
      </div>

      {account?.role === "coach" && clients.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reset Client onboarding
          </p>
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{client.name}</p>
                <p className="truncate text-xs text-muted-foreground">@{client.username}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void resetOnboarding(client.id, client.name)}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        className="w-full"
        disabled={busy}
        onClick={() => void clearData()}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Clear all local test data
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
