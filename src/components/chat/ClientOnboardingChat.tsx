import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { type ChatMessage, fetchChatMessages, fetchCoachAccount, markChatRead } from "@/lib/chat";
import { LOCAL_CHAT_CHANGED_EVENT } from "@/lib/local-events";
import {
  CLIENT_ONBOARDING_QUESTIONS,
  type ClientOnboardingState,
  answerClientOnboarding,
  completeClientOnboarding,
  initializeClientOnboarding,
} from "@/lib/client-onboarding";
import type { AppAccount } from "@/lib/cloud-accounts";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { useChat } from "./ChatProvider";

export function ClientOnboardingChat({
  account,
  onCompleted,
}: {
  account: AppAccount;
  onCompleted: () => Promise<void>;
}) {
  const { refresh } = useAccount();
  const { refreshUnread } = useChat();
  const [coach, setCoach] = useState<AppAccount | null>(null);
  const [flow, setFlow] = useState<ClientOnboardingState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (threadId: string) => {
    setMessages(await fetchChatMessages(threadId));
  }, []);

  const loadOnboarding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextFlow, nextCoach] = await Promise.all([
        initializeClientOnboarding(account.id),
        fetchCoachAccount(),
      ]);
      setFlow(nextFlow);
      setCoach(nextCoach);
      await loadMessages(nextFlow.threadId);
      await markChatRead(account.id, account.id);
      await refreshUnread();
      if (nextFlow.completedAt) await onCompleted();
    } catch (nextError) {
      console.error("Client onboarding could not be loaded", nextError);
      setError("Local onboarding could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [account.id, loadMessages, onCompleted, refreshUnread]);

  useEffect(() => {
    void loadOnboarding();
  }, [loadOnboarding]);

  useEffect(() => {
    if (!flow?.threadId) return;
    const threadId = flow.threadId;
    const onChatChanged = () => {
      void loadMessages(threadId);
      void markChatRead(account.id, account.id).then(refreshUnread).catch(console.error);
    };
    window.addEventListener(LOCAL_CHAT_CHANGED_EVENT, onChatChanged);
    window.addEventListener("storage", onChatChanged);
    return () => {
      window.removeEventListener(LOCAL_CHAT_CHANGED_EVENT, onChatChanged);
      window.removeEventListener("storage", onChatChanged);
    };
  }, [account.id, flow?.threadId, loadMessages, refreshUnread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const chooseAnswer = async (answer: string) => {
    if (!flow || flow.step < 1 || flow.step > 5 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextFlow = await answerClientOnboarding(account.id, answer);
      setFlow(nextFlow);
      await loadMessages(nextFlow.threadId);
      await markChatRead(account.id, account.id);
      await refreshUnread();
    } catch (nextError) {
      console.error("Client onboarding answer failed", nextError);
      setError("That answer could not be saved. Please try again.");
      await loadOnboarding();
    } finally {
      setSubmitting(false);
    }
  };

  const enterApp = async () => {
    if (!flow || flow.step !== 6 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeClientOnboarding(account.id);
      await refresh();
      await onCompleted();
    } catch (nextError) {
      console.error("Client onboarding completion failed", nextError);
      setError("The app could not be opened. Please try again.");
      setSubmitting(false);
    }
  };

  const question =
    flow && flow.step >= 1 && flow.step <= 5
      ? CLIENT_ONBOARDING_QUESTIONS[flow.step as 1 | 2 | 3 | 4 | 5]
      : null;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{coach?.name ?? "Coach"}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {coach ? `@${coach.username}` : "No More Copium onboarding"}
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-5" aria-live="polite">
          {loading && messages.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading conversation…
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                own={message.senderAccountId === account.id}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer
        className="shrink-0 border-t border-border bg-background px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p>{error}</p>
                {!flow && (
                  <button
                    type="button"
                    className="mt-1 font-medium underline underline-offset-4"
                    onClick={() => void loadOnboarding()}
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {question && (
            <div className="grid gap-2" aria-label={question.prompt}>
              {question.options.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  disabled={loading || submitting}
                  className="min-h-12 h-auto justify-start rounded-2xl px-4 py-3 text-left whitespace-normal"
                  onClick={() => void chooseAnswer(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {flow?.step === 6 && !flow.completedAt && (
            <Button
              type="button"
              disabled={submitting}
              className="min-h-12 w-full rounded-full"
              onClick={() => void enterApp()}
            >
              {submitting ? "Opening app…" : "Enter app"}
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
