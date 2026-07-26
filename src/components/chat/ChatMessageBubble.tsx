import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ChatMessage } from "@/lib/chat";
import { ONBOARDING_FINAL_MESSAGE } from "@/lib/client-onboarding";
import { decodeFinalSequenceMessage, type FinalSequenceLine } from "@/lib/final-sequence";
import { cn } from "@/lib/utils";

export function ChatMessageBubble({ message, own }: { message: ChatMessage; own: boolean }) {
  return (
    <div className={cn("flex", own ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3 py-2",
          own
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.body && <ChatMessageBody body={message.body} interactive={!own} />}
        {message.attachments && message.attachments.length > 0 && (
          <div
            className={cn(
              "grid gap-1.5",
              message.attachments.length === 1 ? "grid-cols-1" : "grid-cols-2",
              message.body && "mt-2",
            )}
          >
            {message.attachments.map((attachment) => (
              <Dialog key={attachment.id}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="overflow-hidden rounded-lg bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {attachment.imageUrl ? (
                      <img
                        src={attachment.imageUrl}
                        alt="Chat attachment"
                        className="aspect-square h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex aspect-square items-center justify-center px-2 text-xs text-muted-foreground">
                        Image unavailable
                      </span>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent className="h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl rounded-2xl bg-black p-2">
                  <DialogTitle className="sr-only">Chat image</DialogTitle>
                  <DialogDescription className="sr-only">
                    Full-size local chat image.
                  </DialogDescription>
                  {attachment.imageUrl && (
                    <img
                      src={attachment.imageUrl}
                      alt="Full-size chat attachment"
                      className="h-full w-full object-contain"
                    />
                  )}
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
        <p
          className={cn(
            "mt-1 text-[10px] tabular-nums",
            own ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ChatMessageBody({ body, interactive }: { body: string; interactive: boolean }) {
  const structured = decodeFinalSequenceMessage(body);
  if (structured) {
    return (
      <div className="space-y-1 break-words text-sm">
        {structured.lines.map((line) => (
          <StructuredLine key={line.id} line={line} />
        ))}
      </div>
    );
  }

  if (interactive && body === ONBOARDING_FINAL_MESSAGE) {
    return (
      <div className="break-words text-sm">
        <p>placeholder</p>
        <PopupLink text="placeholder" />
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words text-sm">{body}</p>;
}

function StructuredLine({ line }: { line: FinalSequenceLine }) {
  if (line.type === "external_link" && line.url) {
    return (
      <a
        href={line.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block font-medium text-blue-500 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {line.text}
      </a>
    );
  }
  if (line.type === "popup_link") return <PopupLink text={line.text} />;
  return <p className="whitespace-pre-wrap">{line.text}</p>;
}

function PopupLink({ text }: { text: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="block font-medium text-blue-500 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {text}
        </button>
      </DialogTrigger>
      <DialogContent className="h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl rounded-2xl p-0">
        <DialogTitle className="sr-only">{text}</DialogTitle>
        <DialogDescription className="sr-only">Empty placeholder popup.</DialogDescription>
        <div className="h-full w-full" aria-hidden="true" />
      </DialogContent>
    </Dialog>
  );
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
