"use client";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronRightIcon, MessageSquareTextIcon, MicIcon, PhoneIcon } from "lucide-react";
import { contactSessionIdAtomFamily, conversationIdAtom, errorMessageAtom, hasVapiSecretsAtom, organizationIdAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";
import { WidgetFooter } from "../components/widget-footer";

export const WidgetSelectionScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const hasVapiSecrets = useAtomValue(hasVapiSecretsAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);

  const handleNewConversation = async () => {
    if (!organizationId) {
      setScreen("error");
      setErrorMessage("Missing Organization ID");
      return;
    }
    
    if (!contactSessionId) {
      setScreen("auth");
      return;
    }
    
    setIsPending(true);
    try {
      const conversationId = await createConversation({
        contactSessionId,
        organizationId,
      });

      setConversationId(conversationId);
      setScreen("chat");
    } catch {
      setScreen("auth");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <WidgetHeader className="shadow-sm">
        <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold animate-in fade-in-50 slide-in-from-top-4 duration-500">
          <p className="text-3xl">
            Hi there! 👋
          </p>
          <p className="text-lg text-primary-foreground/90">
            Let&apos;s get you started
          </p>
        </div>
      </WidgetHeader>
      <div className="flex flex-1 flex-col gap-y-3 p-4 overflow-y-auto">
        <Button
          className="h-16 w-full justify-between hover:shadow-md transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-4"
          variant="outline"
          onClick={handleNewConversation}
          disabled={isPending}
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex items-center gap-x-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareTextIcon className="size-5 text-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Start chat</span>
              <span className="text-xs text-muted-foreground">Text conversation</span>
            </div>
          </div>
          <ChevronRightIcon className="size-5 text-muted-foreground" />
        </Button>
        {hasVapiSecrets && widgetSettings?.vapiSettings?.assistantId && (
          <Button
            className="h-16 w-full justify-between hover:shadow-md transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-4"
            variant="outline"
            onClick={() => setScreen("voice")}
            disabled={isPending}
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-x-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <MicIcon className="size-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">Start voice call</span>
                <span className="text-xs text-muted-foreground">Voice conversation</span>
              </div>
            </div>
            <ChevronRightIcon className="size-5 text-muted-foreground" />
          </Button>
        )}
        {hasVapiSecrets && widgetSettings?.vapiSettings?.phoneNumber && (
          <Button
            className="h-16 w-full justify-between hover:shadow-md transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-4"
            variant="outline"
            onClick={() => setScreen("contact")}
            disabled={isPending}
            style={{ animationDelay: "300ms" }}
          >
            <div className="flex items-center gap-x-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <PhoneIcon className="size-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">Call us</span>
                <span className="text-xs text-muted-foreground">Phone support</span>
              </div>
            </div>
            <ChevronRightIcon className="size-5 text-muted-foreground" />
          </Button>
        )}
      </div>
      <WidgetFooter />
    </>
  );
};
