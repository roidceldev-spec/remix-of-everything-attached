import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronRight, MessageCircle, RotateCw } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type CoachChatConversation, fetchCoachChatInbox } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { useChat } from "./ChatProvider";

export function CoachChatInbox() {
  const { account } = useAccount();
  const { refreshUnread } = useChat();
  const [conversations, setConversations] = useState<CoachChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (account?.role !== "coach") return;
    setError(null);
    try {
      setConversations(await fetchCoachChatInbox(account.id));
      await refreshUnread();
    } catch (nextError) {
      console.error(nextError);
      setError("Chats could not be loaded from Cloud.");
    } finally {
      setLoading(false);
    }
  }, [account, refreshUnread]);

  useEffect(() => {
    void load();
    if (account?.role !== "coach") return;
    const channel = supabase
      .channel(`coach-chat-inbox-${account.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [account, load]);

  if (account?.role !== "coach") return null;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read and reply to messages from your clients.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading chats…</p>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 p-4">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => void load()}
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-medium text-foreground">No clients yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Client conversations will appear here automatically.
          </p>
        </div>
      ) : (
        <ul role="list" className="overflow-hidden rounded-lg border border-border">
          {conversations.map((conversation) => {
            const unread = conversation.unreadMessages > 0;
            return (
              <li key={conversation.client.id} className="border-b border-border last:border-b-0">
                <Link
                  to="/coach/chat/$clientId"
                  params={{ clientId: conversation.client.id }}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    unread && "bg-primary/10",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}
                      >
                        {conversation.client.name}
                      </p>
                      {unread && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                          {conversation.unreadMessages > 99 ? "99+" : conversation.unreadMessages}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{conversation.client.username}
                    </p>
                    <p
                      className={cn(
                        "mt-1 truncate text-sm",
                        unread ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {conversation.lastMessageBody
                        ? `${conversation.lastMessageSenderId === account.id ? "You: " : ""}${conversation.lastMessageBody}`
                        : "No messages yet"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {conversation.lastMessageAt && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatInboxTime(conversation.lastMessageAt)}
                      </p>
                    )}
                    <ChevronRight
                      className="ml-auto mt-1 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatInboxTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
