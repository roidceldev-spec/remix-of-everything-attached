import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  type AppAccount,
  fetchMyAccounts,
  readActiveAccountId,
  storeActiveAccountId,
} from "@/lib/cloud-accounts";
import { supabase } from "@/integrations/supabase/client";

type AccountContextValue = {
  user: User | null;
  account: AppAccount | null;
  accounts: AppAccount[];
  loading: boolean;
  refresh: () => Promise<void>;
  switchAccount: (account: AppAccount) => void;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<AppAccount | null>(null);
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);
    if (!nextUser) {
      storeActiveAccountId(null);
      setAccounts([]);
      setAccount(null);
      setLoading(false);
      return;
    }

    try {
      const nextAccounts = await fetchMyAccounts(nextUser.id);
      const storedAccountId = readActiveAccountId();
      const selected =
        nextAccounts.find((candidate) => candidate.id === storedAccountId) ??
        nextAccounts.find((candidate) => !candidate.isPreview) ??
        nextAccounts[0] ??
        null;
      storeActiveAccountId(selected?.id ?? null);
      setAccounts(nextAccounts);
      setAccount(selected);
    } catch (error) {
      console.error("Failed to load the authenticated account", error);
      setAccounts([]);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Failed to load the Google session", error);
      await loadAccounts(null);
      return;
    }
    await loadAccounts(data.session?.user ?? null);
  }, [loadAccounts]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Failed to initialize the Google session", error);
      void loadAccounts(error ? null : (data.session?.user ?? null));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      window.setTimeout(() => {
        if (active) void loadAccounts(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAccounts]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`no-more-copium-my-accounts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_accounts" },
        () => void loadAccounts(user),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadAccounts, user]);

  const value = useMemo<AccountContextValue>(
    () => ({
      user,
      account,
      accounts,
      loading,
      refresh,
      switchAccount: (next) => {
        if (!accounts.some((candidate) => candidate.id === next.id)) return;
        storeActiveAccountId(next.id);
        setAccount(next);
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
        storeActiveAccountId(null);
        setUser(null);
        setAccounts([]);
        setAccount(null);
      },
    }),
    [account, accounts, loading, refresh, user],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

// The provider and hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside AccountProvider");
  return value;
}
