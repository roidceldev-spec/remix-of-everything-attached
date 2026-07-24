import { supabase } from "@/integrations/supabase/client";

export const ONBOARDING_FINAL_MESSAGE = "placeholder\nplaceholder";

export type ClientOnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export type ClientOnboardingState = {
  threadId: string;
  step: ClientOnboardingStep;
  completedAt?: string;
};

export type ClientOnboardingQuestion = {
  prompt: string;
  options: readonly string[];
};

export const CLIENT_ONBOARDING_QUESTIONS: Record<1 | 2 | 3 | 4, ClientOnboardingQuestion> = {
  1: {
    prompt: "How many times a week do you usually train?",
    options: ["0–2 times a week", "3–4 times a week", "5–6 times a week"],
  },
  2: {
    prompt: "Do you work out at the gym or at home with no equipment?",
    options: ["Gym", "Home"],
  },
  3: {
    prompt: "How long is your usual workout?",
    options: ["Below 30 minutes", "Around one hour", "1.5–2 hours"],
  },
  4: {
    prompt: "How is your exercise technique/form?",
    options: ["Beginner / not the best", "Experienced / correct form and technique"],
  },
};

export async function initializeClientOnboarding(clientId: string): Promise<ClientOnboardingState> {
  const { data, error } = await supabase.rpc("initialize_client_onboarding", {
    p_client_id: clientId,
  });
  if (error) throw error;
  return mapState(data?.[0]);
}

export async function answerClientOnboarding(
  clientId: string,
  answer: string,
): Promise<ClientOnboardingState> {
  const { data, error } = await supabase.rpc("advance_client_onboarding", {
    p_client_id: clientId,
    p_answer: answer,
  });
  if (error) throw error;
  return mapState(data?.[0]);
}

export async function completeClientOnboarding(clientId: string): Promise<string> {
  const { data, error } = await supabase.rpc("complete_client_onboarding", {
    p_client_id: clientId,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("Onboarding completion returned no timestamp.");
  return data;
}

function mapState(
  row:
    | {
        thread_id: string;
        onboarding_step: number;
        onboarding_completed_at: string | null;
      }
    | undefined,
): ClientOnboardingState {
  if (!row?.thread_id) throw new Error("Onboarding returned no Coach conversation.");
  const rawStep = Math.max(0, Math.min(5, Math.floor(Number(row.onboarding_step) || 0)));
  return {
    threadId: row.thread_id,
    step: rawStep as ClientOnboardingStep,
    completedAt: row.onboarding_completed_at ?? undefined,
  };
}
