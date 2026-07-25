import { Bot, MessagesSquare, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoachChatInbox } from "./CoachChatInbox";

export function CoachMessagingPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Messaging</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Client conversations, automated messages, and broadcasts.
        </p>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="conversations" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <Bot className="h-4 w-4" aria-hidden="true" />
            Automations
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <Radio className="h-4 w-4" aria-hidden="true" />
            Broadcasts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="mt-6">
          <CoachChatInbox showHeader={false} />
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Final Sequence</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Customize the ordered Coach messages Clients receive at the end of onboarding.
                </p>
              </div>
              <Badge variant="secondary">Next feature</Badge>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              The editor, message ordering, links, popup lines, preview, and Save changes workflow
              are documented and will be implemented next.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="broadcasts" className="mt-6">
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Radio className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-medium text-foreground">Broadcasts are planned</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Recipient selection, scheduling, confirmation, and delivery behavior will be finalized
              before implementation.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
