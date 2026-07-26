import { Bot, MessagesSquare, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BroadcastComposer } from "./BroadcastComposer";
import { CoachChatInbox } from "./CoachChatInbox";
import { FinalSequenceEditor } from "./FinalSequenceEditor";

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
          <FinalSequenceEditor />
        </TabsContent>

        <TabsContent value="broadcasts" className="mt-6">
          <BroadcastComposer />
        </TabsContent>
      </Tabs>
    </section>
  );
}
