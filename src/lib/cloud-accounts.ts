import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "coach" | "client";

export type AppAccount = {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
  isPreview: boolean;
  assignedProgramId?: string;
  createdAt: string;
};

export const ACTIVE_ACCOUNT_STORAGE_KEY = "no-more-copium:active-account:v2";
export const USERNAME_PATTERN = /^[a-z0-9]+(?: [a-z0-9]+)*$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const ACCOUNT_COLUMNS =
  "id, name, username, role, is_preview, assigned_program_id, created_at" as const;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Use only lowercase letters, numbers, and single spaces between words.";
  }
  return null;
}

function mapAccount(row: Record<string, unknown>): AppAccount {
  return {
    id: String(row.id),
    name: String(row.name),
    username: String(row.username),
    role: row.role === "coach" ? "coach" : "client",
    isPreview: row.is_preview === true,
    assignedProgramId:
      typeof row.assigned_program_id === "string" ? row.assigned_program_id : undefined,
    createdAt: String(row.created_at),
  };
}

export async function fetchMyAccounts(authUserId: string): Promise<AppAccount[]> {
  const { data, error } = await supabase
    .from("app_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("auth_user_id", authUserId)
    .order("is_preview", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapAccount(row as Record<string, unknown>));
}

export async function fetchAccounts(): Promise<AppAccount[]> {
  const { data, error } = await supabase
    .from("app_accounts")
    .select(ACCOUNT_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapAccount(row as Record<string, unknown>));
}

export async function fetchAccount(accountId: string): Promise<AppAccount | null> {
  const { data, error } = await supabase
    .from("app_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAccount(data as Record<string, unknown>) : null;
}

export async function fetchPublicCoachAccount(): Promise<AppAccount | null> {
  const { data, error } = await supabase.rpc("get_coach_profile");
  if (error) throw error;
  const row = data?.[0];
  return row ? mapAccount(row as Record<string, unknown>) : null;
}

export async function createAuthenticatedAccount(input: {
  name: string;
  username: string;
}): Promise<void> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const username = normalizeUsername(input.username);
  if (!name || name.length > 80) throw new Error("Enter your name using 80 characters or fewer.");
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);

  const { data, error } = await supabase.functions.invoke("account-bootstrap", {
    body: { name, username },
  });
  if (error) {
    throw new Error(await readFunctionError(error, data));
  }
  if (!data || typeof data !== "object" || (data as { ok?: unknown }).ok !== true) {
    throw new Error("Account creation returned an unexpected response.");
  }
}

async function readFunctionError(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : undefined;
  if (context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as { error?: unknown };
      if (typeof payload.error === "string") return payload.error;
    } catch {
      // Fall back to the Functions client message.
    }
  }
  return error instanceof Error ? error.message : "Account creation failed.";
}

export async function updateCloudClientAssignment(
  clientId: string,
  assignedProgramId: string | undefined,
): Promise<AppAccount> {
  const { data, error } = await supabase
    .from("app_accounts")
    .update({ assigned_program_id: assignedProgramId ?? null })
    .eq("id", clientId)
    .eq("role", "client")
    .select(ACCOUNT_COLUMNS)
    .single();
  if (error) throw error;
  return mapAccount(data as Record<string, unknown>);
}

export function readActiveAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
}

export function storeActiveAccountId(accountId: string | null): void {
  if (typeof window === "undefined") return;
  if (accountId) window.localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, accountId);
  else window.localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
}
