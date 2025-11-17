"use client";

import { AISuggestion, AISuggestions } from "@workspace/ui/components/ai/suggestion";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { useAction, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Form, FormField } from "@workspace/ui/components/form";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInput,
  AIInputImageButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
  AIInputWithDragDrop,
} from "@workspace/ui/components/ai/input";
import { ImagePreview } from "@workspace/ui/components/ai/image-preview";
import { ImageDisplay } from "@workspace/ui/components/ai/image-display";
import { useImageUpload } from "@workspace/ui/hooks/use-image-upload";
import { parseMessageContent } from "@workspace/ui/lib/message-content";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import { AIActivityIndicator } from "@workspace/ui/components/ai/activity-indicator";
import { useMemo } from "react";

const formSchema = z.object({
  message: z.string(),
});

export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const onBack = () => {
    setConversationId(null);
    setScreen("selection");
  };

  const suggestions = useMemo(() => {
    if (!widgetSettings) {
      return [];
    }

    return Object.keys(widgetSettings.defaultSuggestions).map((key) => {
      return widgetSettings.defaultSuggestions[
        key as keyof typeof widgetSettings.defaultSuggestions
      ];
    });
  }, [widgetSettings]);

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        } 
      : "skip"
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
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } = useInfiniteScroll({
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 10,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const {
    selectedImages,
    previewUrls,
    errors: imageErrors,
    addImages,
    removeImage,
    clearImages,
    canAddMore,
  } = useImageUpload();

  const generateUploadUrl = useAction(api.public.files.generateUploadUrl);
  const uploadImage = useAction(api.public.files.uploadImage);
  const createMessage = useAction(api.public.messages.create);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!conversation || !contactSessionId) {
      return;
    }

    // Validate that we have either text or images
    if (!values.message.trim() && selectedImages.length === 0) {
      return;
    }

    // Upload images first
    const imageStorageIds: Id<"_storage">[] = [];
    
    if (selectedImages.length > 0) {
      try {
        for (const image of selectedImages) {
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": image.type },
            body: image,
          });
          const { storageId } = await response.json();
          
          // Validate the uploaded image
          const uploadResult = await uploadImage({ storageId });
          imageStorageIds.push(uploadResult.storageId);
        }
      } catch (error) {
        console.error("Failed to upload images:", error);
        // Error will be shown via imageErrors in ImagePreview
        return;
      }
    }

    form.reset();
    clearImages();

    await createMessage({
      threadId: conversation.threadId,
      prompt: values.message.trim() || "", // Allow empty if images present
      contactSessionId,
      imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
    });
  };

  return (
    <>
      <WidgetHeader className="flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-x-2">
          <Button
            onClick={onBack}
            size="icon"
            variant="transparent"
            className="hover:bg-white/20 transition-colors"
          >
            <ArrowLeftIcon className="size-5" />
          </Button>
          <div className="flex flex-col">
            <p className="font-semibold text-base">Chat</p>
            <p className="text-xs text-primary-foreground/80">
              {conversation?.status === "resolved" ? "Resolved" : "Active"}
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="transparent"
          className="hover:bg-white/20 transition-colors"
        >
          <MenuIcon className="size-5" />
        </Button>
      </WidgetHeader>
      <AIConversation>
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
          {toUIMessages(messages.results ?? [])?.map((message) => {
            const parsedContent = parseMessageContent(message.content);
            return (
              <AIMessage
                from={message.role === "user" ? "user" : "assistant"}
                key={message.id}
              >
                <AIMessageContent>
                  {parsedContent.images.length > 0 && (
                    <ImageDisplay imageUrls={parsedContent.images} />
                  )}
                  {parsedContent.text && (
                    <AIResponse>{parsedContent.text}</AIResponse>
                  )}
                </AIMessageContent>
                {message.role === "assistant" && (
                  <DicebearAvatar
                    imageUrl="/logo.png"
                    seed="assistant"
                    size={32}
                  />
                )}
              </AIMessage>
            )
          })}
          {messages.status === "LoadingFirstPage" && (
            <AIMessage from="assistant">
              <AIMessageContent>
                <AIActivityIndicator activity="typing" />
              </AIMessageContent>
              <DicebearAvatar
                imageUrl="/logo.png"
                seed="assistant"
                size={32}
              />
            </AIMessage>
          )}
        </AIConversationContent>
        <AIConversationScrollButton />
      </AIConversation>
      {toUIMessages(messages.results ?? [])?.length === 1 && (
        <AISuggestions className="flex w-full flex-col items-end gap-2 p-3 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
          {suggestions.map((suggestion, index) => {
            if (!suggestion) {
              return null;
            }

            return (
              <AISuggestion
                key={suggestion}
                onClick={() => {
                  form.setValue("message", suggestion, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  form.handleSubmit(onSubmit)();
                }}
                suggestion={suggestion}
                className="animate-in fade-in-50 slide-in-from-right-4"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            )
          })}
        </AISuggestions>
      )}
      <Form {...form}>
          <AIInputWithDragDrop
            onSubmit={form.handleSubmit(onSubmit)}
            onImageDrop={addImages}
            dragDropEnabled={conversation?.status !== "resolved" && canAddMore}
          >
            {(selectedImages.length > 0 || imageErrors.length > 0) && (
              <ImagePreview
                images={selectedImages}
                previewUrls={previewUrls}
                onRemove={removeImage}
                errors={imageErrors}
              />
            )}
            <FormField
              control={form.control}
              disabled={conversation?.status === "resolved"}
              name="message"
              render={({ field }) => (
                <AIInputTextarea
                  disabled={conversation?.status === "resolved"}
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)();
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
              <AIInputTools>
                <AIInputImageButton
                  onImageSelect={addImages}
                  disabled={
                    conversation?.status === "resolved" ||
                    !canAddMore ||
                    form.formState.isSubmitting
                  }
                />
              </AIInputTools>
              <AIInputSubmit
                disabled={
                  conversation?.status === "resolved" ||
                  (form.getValues("message").trim().length === 0 && selectedImages.length === 0) ||
                  form.formState.isSubmitting
                }
                status={form.formState.isSubmitting ? "submitted" : "ready"}
                type="submit"
              />
            </AIInputToolbar>
          </AIInputWithDragDrop>
      </Form>
    </>
  );
};
