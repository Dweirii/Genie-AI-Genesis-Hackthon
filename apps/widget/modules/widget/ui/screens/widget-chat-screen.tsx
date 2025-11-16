"use client"
import { useAtomValue, useSetAtom } from "jotai";
import { WidgetHeader } from "../components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { useForm } from "react-hook-form";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { api } from "@workspace/backend/_generated/api"
import { useAction, useQuery } from "convex/react";
import { toUIMessages, useThreadMessages} from "@convex-dev/agent/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AIConversation, AIConversationContent} from "@workspace/ui/components/ai/conversation";
import { AIMessage, AIMessageContent } from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import { Form, FormField } from "@workspace/ui/components/form";
import { AIInput, AIInputSubmit, AIInputTextarea, AIInputToolbar, AIInputTools } from "@workspace/ui/components/ai/input";

export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);
  
  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtomFamily(organizationId || ""))
  
  const formSchema = z.object({
    messages: z.string().min(1, "Message is required"),
  });

  const onBack = () => {
    setConversationId(null);
    setScreen("selection");
  }

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
        conversationId,
        contactSessionId,
      } : "skip"
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId 
    ? {
        threadId: conversation.threadId,
        contactSessionId,
      }
    : "skip",
    { initialNumItems: 10 },
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues:{ 
      messages: "",
    },
  });

  const createMessage = useAction(api.public.messages.create);
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if(!conversation || !contactSessionId) {
      return;
    }

    form.reset();

    await createMessage({
      threadId: conversation.threadId,
      prompt: values.messages,
      contactSessionId,
    });
  };


  return (
    <>
      <WidgetHeader className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Button size="icon" variant="transparent" onClick={onBack}>
            <ArrowLeftIcon />
          </Button>
          <p> Chat</p>
        </div>
        <Button size="icon" variant="transparent">
          <MenuIcon />
        </Button>
      </WidgetHeader>
      <AIConversation>
          <AIConversationContent>
            {toUIMessages(messages.results ?? [])?.map((message) => {
              return (
                <AIMessage
                  from={message.role === "user" ? "user" : "assistant"}
                  key={message.id}
                >
                  <AIMessageContent>
                    <AIResponse>{message.content}</AIResponse>
                  </AIMessageContent>

                </AIMessage>
              )
            })}
          </AIConversationContent>
      </AIConversation>
      <Form {...form}>
            <AIInput
              className="rounded-none border-x-0 border-b-0"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                  control={form.control}
                  disabled={conversation?.status === "resolved"}
                  name="messages"
                  render={({ field }) => (
                    <AIInputTextarea
                      disabled={conversation?.status === "resolved"}
                      onChange={field.onChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          form.handleSubmit(onSubmit);
                        }
                      }}
                      placeholder={
                        conversation?.status === "resolved"
                          ? "This conversation has been resolved."
                          : "Type your message..."
                      }
                      value={field.value}
                        />
                      )}
                  />
                    <AIInputToolbar>
                      <AIInputTools/>
                      <AIInputSubmit
                        disabled={conversation?.status === "resolved" || !form.formState.isValid}
                        status="ready"
                        type="submit"
                      />
                    </AIInputToolbar>
           
            </AIInput>
      </Form>
    </>
  )
};