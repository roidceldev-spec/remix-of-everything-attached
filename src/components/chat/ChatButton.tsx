import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/button";
import { useChat } from "./ChatProvider";

export function ChatButton() {
  const { account } = useAccount();
  const { badgeCount } = useChat();
  if (!account) return null;

  const label = badgeCount > 0 ? `Open chat, ${badgeCount} unread` : "Open chat";
  const badge = badgeCount > 99 ? "99+" : `${badgeCount}`;

  return (
    <Button asChild variant="ghost" size="icon" className="relative shrink-0">
      <Link to={account.role === "coach" ? "/coach/chat" : "/client/chat"} aria-label={label}>
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
            {badge}
          </span>
        )}
      </Link>
    </Button>
  );
}
