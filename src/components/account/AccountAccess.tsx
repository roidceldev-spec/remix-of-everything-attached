import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AccountRole,
  type AppAccount,
  createAccount,
  fetchAccounts,
} from "@/lib/cloud-accounts";
import { useAccount } from "./AccountProvider";

export function AccountAccess() {
  const navigate = useNavigate();
  const { login } = useAccount();
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"details" | "role">("details");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts()
      .then((next) => {
        setAccounts(next);
        setCreating(next.length === 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const coachExists = accounts.some((account) => account.role === "coach");

  const enterAccount = (account: AppAccount) => {
    login(account);
    void navigate({
      to:
        account.role === "coach"
          ? "/coach/dashboard"
          : account.onboardingCompletedAt
            ? "/client/dashboard"
            : "/onboarding",
    });
  };

  const submitDetails = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setUsername(username.trim().toLowerCase().replace(/\s+/g, " "));
    setError(null);
    setStep("role");
  };

  const chooseRole = async (role: AccountRole) => {
    setSubmitting(true);
    setError(null);
    try {
      const account = await createAccount({ name, username, role });
      setAccounts((previous) => [...previous, account]);
      enterAccount(account);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Account creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading local accounts">
        <div className="h-10 w-32 rounded-lg bg-muted/60 skeleton-shimmer" />
        <div className="h-14 w-full rounded-xl bg-muted/60 skeleton-shimmer" />
        <div className="h-14 w-full rounded-xl bg-muted/60 skeleton-shimmer" />
        <div className="h-10 w-full rounded-xl bg-muted/60 skeleton-shimmer" />
      </div>
    );
  }

  if (creating) {
    return step === "details" ? (
      <form onSubmit={submitDetails} className="space-y-4" noValidate>
        <div className="space-y-1.5 text-left">
          <Label htmlFor="local-account-name">Your name</Label>
          <Input
            id="local-account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoFocus
          />
        </div>
        <div className="space-y-1.5 text-left">
          <Label htmlFor="local-account-username">Username</Label>
          <Input
            id="local-account-username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            placeholder="your username"
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            3–30 lowercase letters, numbers, and spaces. Unique on this device.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">
          Continue
        </Button>
        {accounts.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setCreating(false)}
          >
            Back to accounts
          </Button>
        )}
      </form>
    ) : (
      <div className="space-y-4">
        <div className="text-left">
          <h2 className="text-lg font-semibold">Choose account type</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This local prototype choice is permanent.
          </p>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={submitting || coachExists}
          onClick={() => void chooseRole("coach")}
        >
          Coach Mode
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={submitting || !coachExists}
          onClick={() => void chooseRole("client")}
        >
          Client Mode
        </Button>
        <p className="text-xs text-muted-foreground">
          {coachExists
            ? "A local Coach already exists. Additional accounts can be Clients."
            : "Create the local Coach first so Client onboarding and chat have a Coach."}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("details")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => enterAccount(account)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-accent"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{account.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                @{account.username}
              </span>
            </span>
            <Badge variant={account.role === "coach" ? "default" : "secondary"}>
              {account.role === "coach" ? "Coach" : "Client"}
            </Badge>
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          setCreating(true);
          setStep("details");
          setError(null);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create a new local account
      </Button>
    </div>
  );
}
