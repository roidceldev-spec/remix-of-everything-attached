import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_CHAT_MESSAGE_LENGTH,
  type ChatMessage,
  createChatMessageId,
  ensureChatThread,
  fetchChatMessages,
  fetchCoachAccount,
  markChatRead,
  sendChatMessage,
} from "@/lib/chat";
import { fetchAccount, type AppAccount } from "@/lib/cloud-accounts";
import { cn } from "@/lib/utils";
import { useChat } from "./ChatProvider";

export function ChatConversation({ clientId }: { clientId: string }) {
  const { account } = useAccount();
  const { refreshUnread } = useChat();
  const [peer, setPeer] = useState<AppAccount | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (id: string) => {
    const next = await fetchChatMessages(id);
    setMessages(next);
  }, []);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      ensureChatThread(clientId),
      account.role === "coach" ? fetchAccount(clientId) : fetchCoachAccount(),
    ])
      .then(async ([nextThreadId, nextPeer]) => {
        if (cancelled) return;
        setThreadId(nextThreadId);
        setPeer(nextPeer);
        await loadMessages(nextThreadId);
        await markChatRead(account.id, clientId);
        await refreshUnread();
      })
      .catch((nextError: unknown) => {
        console.error(nextError);
        if (!cancelled) setError("This conversation could not be loaded from Cloud.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account, clientId, loadMessages, refreshUnread]);

  useEffect(() => {
    if (!threadId || !account) return;
    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            thread_id: string;
            sender_account_id: string;
            body: string;
            created_at: string;
          };
          setMessages((current) =>
            current.some((message) => message.id === row.id)
              ? current
              : [
                  ...current,
                  {
                    id: row.id,
                    threadId: row.thread_id,
                    senderAccountId: row.sender_account_id,
                    body: row.body,
                    createdAt: row.created_at,
                  },
                ],
          );
          void markChatRead(account.id, clientId).then(refreshUnread).catch(console.error);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [account, clientId, refreshUnread, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (!account) return null;

  const send = async () => {
    const body = draft.trim();
    if (!body || !threadId || sending) return;
    const messageId = createChatMessageId();
    setSending(true);
    setError(null);
    try {
      await sendChatMessage({
        senderAccountId: account.id,
        clientId,
        body,
        messageId,
      });
      setDraft("");
      await loadMessages(threadId);
    } catch (nextError) {
      console.error(nextError);
      setError("The message could not be sent. Try again.");
    } finally {
      setSending(false);
    }
  };

  const backTo = account.role === "coach" ? "/coach/chat" : "/client/dashboard";

  return (
    <section className="flex min-h-[calc(100dvh-11rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link
            to={backTo}
            aria-label={account.role === "coach" ? "Back to chats" : "Back to Dashboard"}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {peer?.name ?? (account.role === "coach" ? "Client" : "Coach")}
          </h1>
          {peer && <p className="truncate text-xs text-muted-foreground">@{peer.username}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-3 py-4" aria-live="polite">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send the first message to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const own = message.senderAccountId === account.id;
            return (
              <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2",
                    own
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] tabular-nums",
                      own ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mb-2 flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-lg border border-border bg-background p-2 shadow-sm">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Write a message"
            rows={1}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            disabled={loading || sending || !threadId}
            className="min-h-10 resize-none py-2"
            aria-label="Message"
          />
          <Button
            type="button"
            size="icon"
            disabled={!draft.trim() || loading || sending || !threadId}
            onClick={() => void send()}
            aria-label="Send message"
            className="h-10 w-10 shrink-0"
          >
            {sending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        <p className="mt-1 px-1 text-right text-[10px] text-muted-foreground">
          {draft.length}/{MAX_CHAT_MESSAGE_LENGTH}
        </p>
      </div>
    </section>
  );
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
