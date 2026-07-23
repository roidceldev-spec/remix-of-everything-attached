import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleAuthButton } from "@/components/account/GoogleAuthButton";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAuthenticatedAccount,
  normalizeUsername,
  validateUsername,
} from "@/lib/cloud-accounts";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your account — No More Copium" },
      { name: "description", content: "Continue with Google and create your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, account, loading, refresh, signOut } = useAccount();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || name) return;
    const suggestedName = user.user_metadata?.full_name ?? user.user_metadata?.name;
    if (typeof suggestedName === "string") setName(suggestedName.slice(0, 80));
  }, [name, user]);

  useEffect(() => {
    if (!loading && account) {
      void navigate({
        to: account.role === "coach" ? "/coach/dashboard" : "/client/dashboard",
        replace: true,
      });
    }
  }, [account, loading, navigate]);

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, " ");
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedName) {
      setError("Enter your name.");
      return;
    }
    if (normalizedName.length > 80) {
      setError("Your name must be 80 characters or fewer.");
      return;
    }
    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createAuthenticatedAccount({ name: normalizedName, username: normalizedUsername });
      await refresh();
    } catch (nextError) {
      console.error("Account creation failed", nextError);
      setError(nextError instanceof Error ? nextError.message : "Account creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseAnotherGoogleAccount = async () => {
    setError(null);
    try {
      await signOut();
    } catch (nextError) {
      console.error("Sign-out failed", nextError);
      setError("Could not sign out. Please try again.");
    }
  };

  if (loading || account) {
    return <main className="min-h-[100dvh] bg-black" aria-label="Loading account" />;
  }

  if (!user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">No More Copium</h1>
          <p className="mt-3 text-sm text-white/60">Use your Google account to continue.</p>
          <GoogleAuthButton className="mt-7" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-500">
            One last step
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Create your account</h1>
          <p className="mt-3 text-sm text-white/60">Choose how your name appears in the app.</p>
        </div>

        <form onSubmit={submitProfile} className="mt-8 space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-white">
              Your name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              maxLength={80}
              autoComplete="name"
              className="border-white/15 bg-white/8 text-white placeholder:text-white/35"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-username" className="text-white">
              Username
            </Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value.toLowerCase());
                if (error) setError(null);
              }}
              placeholder="your username"
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="border-white/15 bg-white/8 text-white placeholder:text-white/35"
            />
            <p className="text-xs leading-relaxed text-white/45">
              3–30 characters. Lowercase letters, numbers, and spaces only. Usernames are unique.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-full bg-red-600 text-white hover:bg-red-500"
          >
            {submitting ? "Creating account…" : "Create account"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            className="w-full text-white/60 hover:bg-white/8 hover:text-white"
            onClick={() => void handleUseAnotherGoogleAccount()}
          >
            Use another Google account
          </Button>
        </form>
      </div>
    </main>
  );
}
