"use client";

import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { useAction, useMutation, useQuery } from "convex/react";
import { MoreHorizontalIcon, Wand2Icon } from "lucide-react";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInput,
  AIInputButton,
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
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import { Form, FormField } from "@workspace/ui/components/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { ConversationStatusButton } from "../components/conversation-status-button";
import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

const formSchema = z.object({
  message: z.string(),
});

export const ConversationIdView = ({
  conversationId,
}: {
  conversationId: Id<"conversations">,
}) => {
  const conversation = useQuery(api.private.conversations.getOne, {
    conversationId,
  });

  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    { initialNumItems: 10, }
  );

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useInfiniteScroll({
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

  const [isEnhancing, setIsEnhancing] = useState(false);
  const enhanceResponse = useAction(api.private.messages.enhanceResponse);
  const handleEnhanceResponse = async () => {
    setIsEnhancing(true);
    const currentValue = form.getValues("message");

    try {
      const response = await enhanceResponse({ prompt: currentValue });

      form.setValue("message", response);
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    } finally {
      setIsEnhancing(false);
    }
  }

  const {
    selectedImages,
    previewUrls,
    errors: imageErrors,
    addImages,
    removeImage,
    clearImages,
    canAddMore,
  } = useImageUpload();

  const generateUploadUrl = useAction(api.private.files.generateUploadUrl);
  const uploadImage = useAction(api.private.files.uploadImage);
  const createMessage = useMutation(api.private.messages.create);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validate that we have either text or images
    if (!values.message.trim() && selectedImages.length === 0) {
      return;
    }

    try {
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
          toast.error("Failed to upload images");
          return;
        }
      }

      await createMessage({
        conversationId,
        prompt: values.message.trim() || "", // Allow empty if images present
        imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
      });

      form.reset();
      clearImages();
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    }
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const updateConversationStatus = useMutation(api.private.conversations.updateStatus);
  const handleToggleStatus = async () => {
    if (!conversation) {
      return;
    }

    setIsUpdatingStatus(true);

    let newStatus: "unresolved" | "resolved" | "escalated";

    // Cycle through states: unresolved -> escalated -> resolved -> unresolved
    if (conversation.status === "unresolved") {
      newStatus = "escalated";
    } else if (conversation.status === "escalated") {
      newStatus = "resolved"
    } else {
      newStatus = "unresolved"
    }

    try {
      await updateConversationStatus({
        conversationId,
        status: newStatus,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (conversation === undefined || messages.status === "LoadingFirstPage") {
    return <ConversationIdViewLoading />
  }

  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button
          size="sm"
          variant="ghost"
        >
          <MoreHorizontalIcon />
        </Button>
        {!!conversation && (
          <ConversationStatusButton
            onClick={handleToggleStatus}
            status={conversation.status}
            disabled={isUpdatingStatus}
          />
        )}
      </header>
      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
          {toUIMessages(messages.results ?? [])?.map((uiMessage) => {
            // Match by message ID, not by index, to avoid misalignment
            const rawMessage = messages.results?.find(
              (msg) => msg.id === uiMessage.id || msg._id === uiMessage.id
            );
            const messageContent =
              rawMessage?.message?.content ??
              (rawMessage?.message as string | undefined) ??
              uiMessage.content;
            const parsedContent = parseMessageContent(messageContent);
            return (
              <AIMessage
              // In reverse, because we are watching from "assistant" prespective
                from={uiMessage.role === "user" ? "assistant" : "user"}
                key={uiMessage.id}
              >
                <AIMessageContent>
                  {parsedContent.images.length > 0 && (
                    <ImageDisplay imageUrls={parsedContent.images} />
                  )}
                  {parsedContent.text && (
                    <AIResponse>
                      {parsedContent.text}
                    </AIResponse>
                  )}
                </AIMessageContent>
                {uiMessage.role === "user" && (
                  <DicebearAvatar
                    seed={conversation?.contactSessionId ?? "user"}
                    size={32}
                  />
                )}
              </AIMessage>
            );
          })}
        </AIConversationContent>
        <AIConversationScrollButton />
      </AIConversation>
      
      <div className="bg-transparent p-3 md:p-4">
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
                  disabled={
                    conversation?.status === "resolved" ||
                    form.formState.isSubmitting ||
                    isEnhancing
                  }
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)();
                    }
                  }}
                  placeholder={
                    conversation?.status === "resolved"
                      ? "This conversation has been resolved"
                      : "Type your response as an operator..."
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
                    form.formState.isSubmitting ||
                    isEnhancing
                  }
                />
                <AIInputButton
                  onClick={handleEnhanceResponse}
                  disabled={
                    conversation?.status === "resolved" || 
                    isEnhancing || 
                    !form.formState.isValid
                  }
                >
                  <Wand2Icon />
                  {isEnhancing ? "Enhancing..." : "Enhance"}
                </AIInputButton>
              </AIInputTools>
              <AIInputSubmit
                disabled={
                  conversation?.status === "resolved" ||
                  (form.getValues("message").trim().length === 0 && selectedImages.length === 0) ||
                  isEnhancing ||
                  form.formState.isSubmitting
                }
                status={form.formState.isSubmitting ? "submitted" : "ready"}
                type="submit"
              />
            </AIInputToolbar>
          </AIInputWithDragDrop>
        </Form>
      </div>
    </div>
  );
};

export const ConversationIdViewLoading = () => {
  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button disabled size="sm" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </header>
      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          {Array.from({ length: 8 }, (_, index) => {
            const isUser = index % 2 === 0;
            const widths = ["w-48", "w-60", "w-72"];
            const width = widths[index % widths.length];

            return (
              <div
                className={cn(
                  "group flex w-full items-end justify-end gap-2 py-2 [&>div]:max-w-[80%]",
                  isUser ? "is-user" : "is-assistant flex-row-reverse"
                )}
                key={index}
              >
                <Skeleton className={`h-9 ${width} rounded-lg bg-neutral-200`} />
                <Skeleton className="size-8 rounded-full bg-neutral-200" />
              </div>
            );
          })}
        </AIConversationContent>
      </AIConversation>

      <div>
        <AIInput>
          <AIInputTextarea
            disabled
            className="bg-transparent"
            placeholder="Type your response as an operator..."
          />
          <AIInputToolbar className="bg-transparent">
            <AIInputTools />
            <AIInputSubmit disabled status="ready" />
          </AIInputToolbar>
        </AIInput>
      </div>
    </div>
  );
};
