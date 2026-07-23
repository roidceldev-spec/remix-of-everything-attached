import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { type AppAccount, fetchAccounts, fetchPublicCoachAccount } from "./cloud-accounts";

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

export type ChatMessage = {
  id: string;
  threadId: string;
  senderAccountId: string;
  body: string;
  createdAt: string;
};

export type CoachChatConversation = {
  client: AppAccount;
  threadId?: string;
  lastMessageBody?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: string;
  unreadMessages: number;
};

export type ChatUnreadSummary = {
  unreadMessages: number;
  unreadClientCount: number;
  byClientId: Record<string, number>;
};

type ChatMessageRow = Tables<"chat_messages">;

export async function fetchChatUnreadSummary(accountId: string): Promise<ChatUnreadSummary> {
  const { data, error } = await supabase.rpc("get_chat_unread_counts", {
    p_account_id: accountId,
  });
  if (error) throw error;
  const byClientId: Record<string, number> = {};
  let unreadMessages = 0;
  for (const row of data ?? []) {
    const count = Math.max(0, Number(row.unread_messages) || 0);
    if (count > 0) {
      byClientId[row.client_id] = count;
      unreadMessages += count;
    }
  }
  return {
    unreadMessages,
    unreadClientCount: Object.keys(byClientId).length,
    byClientId,
  };
}

export async function fetchCoachChatInbox(coachId: string): Promise<CoachChatConversation[]> {
  const accountsPromise = fetchAccounts();
  const threadsPromise = supabase.from("chat_threads").select("*").eq("coach_id", coachId);
  const unreadPromise = fetchChatUnreadSummary(coachId);
  const [accounts, threadsResult, unread] = await Promise.all([
    accountsPromise,
    threadsPromise,
    unreadPromise,
  ]);
  if (threadsResult.error) throw threadsResult.error;

  const threadsByClientId = new Map(
    (threadsResult.data ?? []).map((thread) => [thread.client_id, thread]),
  );
  const conversations = accounts
    .filter((account) => account.role === "client")
    .map((client): CoachChatConversation => {
      const thread = threadsByClientId.get(client.id);
      return {
        client,
        threadId: thread?.id,
        lastMessageBody: thread?.last_message_body ?? undefined,
        lastMessageSenderId: thread?.last_message_sender_id ?? undefined,
        lastMessageAt: thread?.last_message_at ?? undefined,
        unreadMessages: unread.byClientId[client.id] ?? 0,
      };
    });

  return conversations.sort((left, right) => {
    if (left.lastMessageAt && right.lastMessageAt) {
      return right.lastMessageAt.localeCompare(left.lastMessageAt);
    }
    if (left.lastMessageAt) return -1;
    if (right.lastMessageAt) return 1;
    return left.client.name.localeCompare(right.client.name);
  });
}

export async function fetchCoachAccount(): Promise<AppAccount | null> {
  return fetchPublicCoachAccount();
}

export async function ensureChatThread(clientId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_chat_thread", {
    p_client_id: clientId,
  });
  if (error) throw error;
  return data;
}

export async function fetchChatMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendChatMessage({
  senderAccountId,
  clientId,
  body,
  messageId = createChatMessageId(),
}: {
  senderAccountId: string;
  clientId: string;
  body: string;
  messageId?: string;
}): Promise<string> {
  const normalized = body.trim();
  if (!normalized || normalized.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error(`Messages must be 1–${MAX_CHAT_MESSAGE_LENGTH} characters.`);
  }
  const { data, error } = await supabase.rpc("send_chat_message", {
    p_message_id: messageId,
    p_sender_account_id: senderAccountId,
    p_client_id: clientId,
    p_body: normalized,
  });
  if (error) throw error;
  return data;
}

export async function markChatRead(accountId: string, clientId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_chat_read", {
    p_account_id: accountId,
    p_client_id: clientId,
  });
  if (error) throw error;
}

export function createChatMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex
    .slice(12, 16)
    .join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderAccountId: row.sender_account_id,
    body: row.body,
    createdAt: row.created_at,
  };
}
