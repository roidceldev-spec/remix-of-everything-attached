import { createFileRoute } from "@tanstack/react-router";
import { CoachChatInbox } from "@/components/chat/CoachChatInbox";

export const Route = createFileRoute("/coach/chat/")({
  head: () => ({
    meta: [
      { title: "Chats — No More Copium" },
      { name: "description", content: "Read and reply to Client messages." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachChatInbox,
});
