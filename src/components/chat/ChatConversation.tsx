import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { LOCAL_CHAT_CHANGED_EVENT } from "@/lib/local-events";
import {
  LOCAL_JOIN_REQUESTS_CHANGED_EVENT,
  approveJoinRequest,
  fetchJoinRequest,
} from "@/lib/local-join-requests";
import { ChatImageUploadDialog } from "./ChatImageUploadDialog";
import { ChatMessageBubble } from "./ChatMessageBubble";
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
  const [approving, setApproving] = useState(false);
  const [joinRequestPending, setJoinRequestPending] = useState(false);
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
        if (account.role === "coach") {
          const request = await fetchJoinRequest(clientId);
          setJoinRequestPending(request?.status === "pending");
        }
        await refreshUnread();
      })
      .catch((nextError: unknown) => {
        console.error(nextError);
        if (!cancelled) setError("This local conversation could not be loaded.");
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
    const onChatChanged = () => {
      void loadMessages(threadId);
      void markChatRead(account.id, clientId).then(refreshUnread).catch(console.error);
    };
    window.addEventListener(LOCAL_CHAT_CHANGED_EVENT, onChatChanged);
    window.addEventListener("storage", onChatChanged);
    return () => {
      window.removeEventListener(LOCAL_CHAT_CHANGED_EVENT, onChatChanged);
      window.removeEventListener("storage", onChatChanged);
    };
  }, [account, clientId, loadMessages, refreshUnread, threadId]);

  useEffect(() => {
    if (account?.role !== "coach") return;
    const refreshRequest = async () => {
      const request = await fetchJoinRequest(clientId);
      setJoinRequestPending(request?.status === "pending");
    };
    window.addEventListener(LOCAL_JOIN_REQUESTS_CHANGED_EVENT, refreshRequest);
    window.addEventListener("storage", refreshRequest);
    return () => {
      window.removeEventListener(LOCAL_JOIN_REQUESTS_CHANGED_EVENT, refreshRequest);
      window.removeEventListener("storage", refreshRequest);
    };
  }, [account?.role, clientId]);

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

  const approve = async () => {
    if (account.role !== "coach" || !joinRequestPending || approving) return;
    if (!window.confirm("Approve this Client and unlock the app?")) return;
    setApproving(true);
    setError(null);
    try {
      await approveJoinRequest({ clientId, coachId: account.id });
      setJoinRequestPending(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "The Join Request could not be approved.",
      );
    } finally {
      setApproving(false);
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

      {account.role === "coach" && joinRequestPending && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Pending Join Request</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review the complete onboarding conversation and submitted images.
            </p>
          </div>
          <Button type="button" disabled={approving} onClick={() => void approve()}>
            {approving ? "Approving…" : "Approve Client"}
          </Button>
        </div>
      )}

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

      {error && (
        <p className="mb-2 flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-lg border border-border bg-background p-2 shadow-sm">
        <div className="flex items-end gap-2">
          {account.role === "client" && (
            <ChatImageUploadDialog
              clientId={clientId}
              senderAccountId={account.id}
              iconOnly
              onSent={async () => {
                if (threadId) await loadMessages(threadId);
                await refreshUnread();
              }}
            />
          )}
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
