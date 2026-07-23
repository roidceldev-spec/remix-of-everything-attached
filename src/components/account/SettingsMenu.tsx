import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAccount } from "./AccountProvider";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { account, accounts, switchAccount, signOut } = useAccount();
  const alternateAccount = useMemo(() => {
    if (!account) return null;
    return account.role === "coach"
      ? (accounts.find((candidate) => candidate.isPreview) ?? null)
      : account.isPreview
        ? (accounts.find((candidate) => candidate.role === "coach") ?? null)
        : null;
  }, [account, accounts]);

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
      setOpen(false);
      void navigate({ to: "/", replace: true });
    } catch (nextError) {
      console.error("Sign-out failed", nextError);
      setError("Could not sign out. Please try again.");
    }
  };

  const handleSwitchAccount = () => {
    if (!alternateAccount) return;
    switchAccount(alternateAccount);
    setOpen(false);
    void navigate({
      to: alternateAccount.role === "coach" ? "/coach/dashboard" : "/client/dashboard",
      replace: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open settings" className="shrink-0">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          {account && (
            <DialogDescription>
              {account.name} · @{account.username}
            </DialogDescription>
          )}
        </DialogHeader>
        {alternateAccount && (
          <Button variant="outline" className="w-full justify-start" onClick={handleSwitchAccount}>
            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            {alternateAccount.role === "coach" ? "Switch to Coach" : "Switch to Client Preview"}
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
