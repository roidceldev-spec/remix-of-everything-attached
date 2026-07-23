import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type GoogleAuthButtonProps = {
  className?: string;
  tabIndex?: number;
};

export function GoogleAuthButton({ className, tabIndex }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (sessionData.session) {
        window.location.assign("/onboarding");
        return;
      }

      const redirectTo = new URL("/onboarding", window.location.origin).toString();
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectTo,
      });
      if (result.error) throw result.error;
      if (!result.redirected) window.location.assign("/onboarding");
    } catch (nextError) {
      console.error("Google authentication could not start", nextError);
      setError("Google sign-in could not start. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => void continueWithGoogle()}
        disabled={loading}
        tabIndex={tabIndex}
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white px-6 text-sm font-semibold text-[#1f1f1f] shadow-sm transition-colors hover:bg-[#f8f8f8] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <GoogleMark />
        <span>{loading ? "Connecting…" : "Continue with Google"}</span>
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.711H.956v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.71A5.42 5.42 0 0 1 3.682 9c0-.593.102-1.168.281-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.163 6.656 3.579 9 3.579Z"
      />
    </svg>
  );
}
