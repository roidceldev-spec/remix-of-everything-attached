import {
  appendLocalChatMessages,
  createChatMessageId,
  ensureChatThread,
  fetchCoachAccount,
} from "./chat";
import { fetchAccount, updateLocalAccount } from "./cloud-accounts";

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
  const client = await requireClient(clientId);
  const coach = await requireCoach();
  const threadId = await ensureChatThread(clientId);
  if (client.onboardingStep === 0 && !client.onboardingCompletedAt) {
    const now = Date.now();
    await appendLocalChatMessages([
      {
        id: createChatMessageId(),
        threadId,
        senderAccountId: coach.id,
        body: `Welcome to No More Copium, ${client.name}.`,
        createdAt: new Date(now).toISOString(),
      },
      {
        id: createChatMessageId(),
        threadId,
        senderAccountId: coach.id,
        body: CLIENT_ONBOARDING_QUESTIONS[1].prompt,
        createdAt: new Date(now + 1).toISOString(),
      },
    ]);
    await updateLocalAccount(clientId, { onboardingStep: 1 });
    return { threadId, step: 1 };
  }
  return {
    threadId,
    step: normalizeStep(client.onboardingStep),
    completedAt: client.onboardingCompletedAt,
  };
}

export async function answerClientOnboarding(
  clientId: string,
  answer: string,
): Promise<ClientOnboardingState> {
  const client = await requireClient(clientId);
  const coach = await requireCoach();
  const step = normalizeStep(client.onboardingStep);
  if (client.onboardingCompletedAt) throw new Error("Onboarding is already complete.");
  if (step < 1 || step > 4) throw new Error("This onboarding answer is not expected.");
  const question = CLIENT_ONBOARDING_QUESTIONS[step as 1 | 2 | 3 | 4];
  if (!question.options.includes(answer)) throw new Error("Choose one of the available options.");

  const threadId = await ensureChatThread(clientId);
  const nextStep = (step + 1) as ClientOnboardingStep;
  const nextMessage =
    nextStep <= 4
      ? CLIENT_ONBOARDING_QUESTIONS[nextStep as 1 | 2 | 3 | 4].prompt
      : ONBOARDING_FINAL_MESSAGE;
  const now = Date.now();
  await appendLocalChatMessages([
    {
      id: createChatMessageId(),
      threadId,
      senderAccountId: clientId,
      body: answer,
      createdAt: new Date(now).toISOString(),
    },
    {
      id: createChatMessageId(),
      threadId,
      senderAccountId: coach.id,
      body: nextMessage,
      createdAt: new Date(now + 1).toISOString(),
    },
  ]);
  await updateLocalAccount(clientId, { onboardingStep: nextStep });
  return { threadId, step: nextStep };
}

export async function completeClientOnboarding(clientId: string): Promise<string> {
  const client = await requireClient(clientId);
  if (client.onboardingStep !== 5) throw new Error("Answer every onboarding question first.");
  const completedAt = client.onboardingCompletedAt ?? new Date().toISOString();
  await updateLocalAccount(clientId, { onboardingStep: 5, onboardingCompletedAt: completedAt });
  return completedAt;
}

function normalizeStep(value: number): ClientOnboardingStep {
  return Math.max(0, Math.min(5, Math.floor(value || 0))) as ClientOnboardingStep;
}

async function requireClient(clientId: string) {
  const client = await fetchAccount(clientId);
  if (!client || client.role !== "client") throw new Error("Local Client account was not found.");
  return client;
}

async function requireCoach() {
  const coach = await fetchCoachAccount();
  if (!coach) throw new Error("Create a local Coach account before Client onboarding.");
  return coach;
}
