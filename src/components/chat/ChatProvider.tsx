import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAccount } from "@/components/account/AccountProvider";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccount } from "@/lib/cloud-accounts";
import { type ChatUnreadSummary, fetchChatUnreadSummary, fetchCoachAccount } from "@/lib/chat";

const EMPTY_SUMMARY: ChatUnreadSummary = {
  unreadMessages: 0,
  unreadClientCount: 0,
  byClientId: {},
};

const ChatContext = createContext<{
  summary: ChatUnreadSummary;
  badgeCount: number;
  refreshUnread: () => Promise<void>;
} | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();
  const accountId = account?.id;
  const accountRole = account?.role;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [summary, setSummary] = useState<ChatUnreadSummary>(EMPTY_SUMMARY);

  const refreshUnread = useCallback(async () => {
    if (!accountId) {
      setSummary(EMPTY_SUMMARY);
      return;
    }
    try {
      setSummary(await fetchChatUnreadSummary(accountId));
    } catch (error) {
      console.error("Failed to refresh chat unread state", error);
    }
  }, [accountId]);

  useEffect(() => {
    void refreshUnread();
    if (!accountId || !accountRole) return;

    const channel = supabase
      .channel(`chat-notifications-${accountId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const message = payload.new as {
            body?: unknown;
            sender_account_id?: unknown;
            thread_id?: unknown;
          };
          void refreshUnread();
          if (
            pathname === "/onboarding" ||
            typeof message.sender_account_id !== "string" ||
            message.sender_account_id === accountId ||
            typeof message.body !== "string"
          ) {
            return;
          }
          void showIncomingToast({
            accountRole,
            senderId: message.sender_account_id,
            threadId: typeof message.thread_id === "string" ? message.thread_id : undefined,
            body: message.body,
            navigate,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads" },
        () => void refreshUnread(),
      )
      .subscribe();

    const refreshOnFocus = () => void refreshUnread();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [accountId, accountRole, navigate, pathname, refreshUnread]);

  const value = useMemo(
    () => ({
      summary,
      badgeCount: accountRole === "coach" ? summary.unreadClientCount : summary.unreadMessages,
      refreshUnread,
    }),
    [accountRole, refreshUnread, summary],
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
      <Toaster position="top-center" closeButton richColors />
    </ChatContext.Provider>
  );
}

async function showIncomingToast({
  accountRole,
  senderId,
  threadId,
  body,
  navigate,
}: {
  accountRole: "coach" | "client";
  senderId: string;
  threadId?: string;
  body: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  try {
    const sender =
      accountRole === "coach" ? await fetchAccount(senderId) : await fetchCoachAccount();
    let clientId = accountRole === "coach" ? senderId : undefined;
    if (accountRole === "coach" && threadId) {
      const { data } = await supabase
        .from("chat_threads")
        .select("client_id")
        .eq("id", threadId)
        .maybeSingle();
      if (data?.client_id) clientId = data.client_id;
    }
    toast(sender?.name ?? (accountRole === "coach" ? "Client" : "Coach"), {
      description: body.length > 120 ? `${body.slice(0, 117)}…` : body,
      action: {
        label: "Open",
        onClick: () => {
          if (accountRole === "coach" && clientId) {
            void navigate({ to: "/coach/chat/$clientId", params: { clientId } });
          } else {
            void navigate({ to: "/client/chat" });
          }
        },
      },
    });
  } catch (error) {
    console.error("Failed to show chat notification", error);
  }
}

// The provider and hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside ChatProvider");
  return value;
}
