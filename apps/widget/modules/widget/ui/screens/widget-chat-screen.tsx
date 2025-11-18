"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAtomValue, useSetAtom } from "jotai";
import { useAction, useQuery } from "convex/react";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";

import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";

import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

import { Button } from "@workspace/ui/components/button";
import { Form, FormField } from "@workspace/ui/components/form";

import {
  AIConversation,
  AIConversationContent,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInputWithDragDrop,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
  AIInputImageButton,
  AIInputSubmit,
} from "@workspace/ui/components/ai/input";
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import {
  AISuggestion,
  AISuggestions,
} from "@workspace/ui/components/ai/suggestion";
import { AIActivityIndicator } from "@workspace/ui/components/ai/activity-indicator";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";

import {
  contactSessionIdAtomFamily,
  conversationIdAtom,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms";

import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { useImageUpload } from "@workspace/ui/hooks/use-image-upload";
import { parseMessageContent } from "@workspace/ui/lib/message-content";
import { ImageDisplay } from "@workspace/ui/components/ai/image-display";

const DEBUG = true;

// allow empty string, ونتحقق في onSubmit
const formSchema = z.object({
  message: z.string(),
});

export const WidgetChatScreen = () => {
  if (DEBUG) console.log("[WidgetChatScreen] RENDER");

  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  if (DEBUG) {
    console.log("[WidgetChatScreen] atoms", {
      conversationId,
      organizationId,
      contactSessionId,
      widgetSettings,
    });
  }

  const onBack = () => {
    if (DEBUG) console.log("[WidgetChatScreen] onBack");
    setConversationId(null);
    setScreen("selection");
  };

  const suggestions = useMemo(() => {
    if (!widgetSettings) return [];
    const result = Object.keys(widgetSettings.defaultSuggestions).map((key) => {
      return widgetSettings.defaultSuggestions[
        key as keyof typeof widgetSettings.defaultSuggestions
      ];
    });
    if (DEBUG) console.log("[WidgetChatScreen] suggestions", result);
    return result;
  }, [widgetSettings]);

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? { conversationId, contactSessionId }
      : "skip"
  );

  if (DEBUG) {
    console.log("[WidgetChatScreen] conversation query", {
      input:
        conversationId && contactSessionId
          ? { conversationId, contactSessionId }
          : "skip",
      conversation,
    });
  }

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId
      ? { threadId: conversation.threadId, contactSessionId }
      : "skip",
    { initialNumItems: 10 }
  );

  if (DEBUG) {
    console.log("[WidgetChatScreen] messages hook", {
      status: messages.status,
      resultsCount: messages.results?.length,
      input:
        conversation?.threadId && contactSessionId
          ? { threadId: conversation.threadId, contactSessionId }
          : "skip",
    });
  }

  // Track when we're waiting for an AI response (must be before useEffect)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const lastMessageCountRef = useRef(0);

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

  useEffect(() => {
    if (!DEBUG) return;
    console.log("[WidgetChatScreen] infinite scroll state", {
      canLoadMore,
      isLoadingMore,
      status: messages.status,
    });
  }, [canLoadMore, isLoadingMore, messages.status]);

  // Detect when new messages arrive to hide the thinking indicator
  useEffect(() => {
    const currentMessageCount = messages.results?.length ?? 0;
    
    if (DEBUG) {
      console.log("[WidgetChatScreen] message count changed", {
        current: currentMessageCount,
        previous: lastMessageCountRef.current,
        isWaiting: isWaitingForResponse,
        status: messages.status,
      });
    }

    // If we're waiting and message count increased, stop waiting
    if (isWaitingForResponse && currentMessageCount > lastMessageCountRef.current) {
      if (DEBUG) console.log("[WidgetChatScreen] new message arrived, clearing waiting state");
      setIsWaitingForResponse(false);
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [messages.results, isWaitingForResponse, messages.status]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      message: "",
    },
  });

  const watchedMessage = form.watch("message");

  const {
    selectedImages,
    addImages,
    removeImage,
    clearImages,
    canAddMore,
    previewUrls,
  } = useImageUpload();

  if (DEBUG) {
    console.log("[WidgetChatScreen] image upload state", {
      selectedCount: selectedImages.length,
      canAddMore,
      previewUrls,
    });
  }

  const generateUploadUrl = useAction(api.public.files.generateUploadUrl);
  const uploadImage = useAction(api.public.files.uploadImage);
  const createMessage = useAction(api.public.messages.create);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const trimmed = values.message.trim();

    if (DEBUG) {
      console.log("[WidgetChatScreen] onSubmit called", {
        rawValue: values.message,
        trimmed,
        hasConversation: !!conversation,
        contactSessionId,
        selectedImagesCount: selectedImages.length,
      });
    }

    if (!conversation || !contactSessionId) {
      if (DEBUG)
        console.warn(
          "[WidgetChatScreen] Missing conversation or contactSessionId"
        );
      return;
    }

    // لازم يكون في يا نص يا صور
    if (!trimmed && selectedImages.length === 0) {
      if (DEBUG)
        console.warn(
          "[WidgetChatScreen] Nothing to send (no text and no images)"
        );
      return;
    }

    try {
      const imageStorageIds: Id<"_storage">[] = [];

      if (selectedImages.length > 0) {
        if (DEBUG) console.log("[WidgetChatScreen] uploading images…");

        for (const [idx, image] of selectedImages.entries()) {
          if (DEBUG) {
            console.log(`[WidgetChatScreen] image[${idx}]`, {
              size: image.size,
              type: image.type,
              name: (image as any).name,
            });
          }

          const uploadUrl = await generateUploadUrl();
          if (DEBUG)
            console.log("[WidgetChatScreen] generateUploadUrl", uploadUrl);

          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": image.type },
            body: image,
          });

          if (!response.ok) {
            const bodyText = await response
              .text()
              .catch(() => "<cannot read body>");
            console.error("[WidgetChatScreen] upload failed", {
              status: response.status,
              body: bodyText,
            });
            throw new Error("Upload failed");
          }

          const json = (await response.json()) as { storageId: string };
          if (DEBUG) console.log("[WidgetChatScreen] upload JSON", json);

          const uploadResult = await uploadImage({
            storageId: json.storageId as Id<"_storage">,
          });

          if (DEBUG)
            console.log("[WidgetChatScreen] uploadImage result", uploadResult);

          imageStorageIds.push(uploadResult.storageId);
        }

        if (DEBUG) {
          console.log(
            "[WidgetChatScreen] all images uploaded, storageIds",
            imageStorageIds
          );
        }
      }

      if (DEBUG) {
        console.log("[WidgetChatScreen] createMessage payload", {
          threadId: conversation.threadId,
          prompt: trimmed || "",
          contactSessionId,
          imageStorageIds:
            imageStorageIds.length > 0 ? imageStorageIds : undefined,
        });
      }

      // Clear form immediately for better UX (optimistic update)
      form.reset();
      clearImages();

      // Set waiting state before sending the message
      setIsWaitingForResponse(true);

      if (DEBUG) console.log("[WidgetChatScreen] setting waiting state and sending message");

      await createMessage({
        threadId: conversation.threadId,
        prompt: trimmed || "",
        contactSessionId,
        imageStorageIds: imageStorageIds.length ? imageStorageIds : undefined,
      });

      if (DEBUG) console.log("[WidgetChatScreen] message created successfully");
    } catch (error) {
      console.error("[WidgetChatScreen] Failed to send message:", error);
      // Clear waiting state on error
      setIsWaitingForResponse(false);
    }
  };

  const uiMessages = toUIMessages(messages.results ?? []) ?? [];
  const isResolved = conversation?.status === "resolved";

  if (DEBUG) {
    console.log("[WidgetChatScreen] uiMessages", {
      count: uiMessages.length,
      rawMessages: messages.results,
    });
  }

  const canSend =
    !isResolved &&
    ((watchedMessage && watchedMessage.trim().length > 0) ||
      selectedImages.length > 0);

  return (
    <>
      <WidgetHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <Button onClick={onBack} size="icon" variant="ghost">
              <ArrowLeftIcon />
            </Button>
            <p className="font-semibold">Chat</p>
          </div>
          <Button size="icon" variant="ghost">
            <MenuIcon />
          </Button>
        </div>
      </WidgetHeader>

      <AIConversation>
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />

          {uiMessages.map((uiMessage) => {
            // Match by message ID, not by index, to avoid misalignment
            const rawMessage = messages.results?.find(
              (msg) => msg.id === uiMessage.id || msg._id === uiMessage.id
            );

            // Try multiple ways to extract message content
            let messageContent: unknown;
            
            if (rawMessage?.message?.content !== undefined) {
              messageContent = rawMessage.message.content;
            } else if (typeof rawMessage?.message === "string") {
              messageContent = rawMessage.message;
            } else if (rawMessage?.message && typeof rawMessage.message === "object") {
              // Sometimes the message object itself is the content
              messageContent = rawMessage.message;
            } else {
              messageContent = uiMessage.content;
            }

            const parsedContent = parseMessageContent(messageContent);

            // ⛔ لا نرندر الرسائل الفاضية نهائياً
            const isEmpty =
              (!parsedContent.text ||
                parsedContent.text.trim().length === 0) &&
              parsedContent.images.length === 0;

            if (isEmpty) {
              if (DEBUG) {
                console.log(
                  "[WidgetChatScreen] ⚠️ SKIPPING EMPTY MESSAGE",
                  uiMessage.id,
                );
                console.log("  uiMessage.content:", uiMessage.content);
                console.log("  rawMessage?.message:", rawMessage?.message);
                console.log("  messageContent type:", typeof messageContent, Array.isArray(messageContent) ? `Array(${messageContent.length})` : '');
                console.log("  messageContent value:", messageContent);
                console.log("  parsedContent:", parsedContent);
                
                // If it's an array, log each item
                if (Array.isArray(messageContent)) {
                  messageContent.forEach((item, idx) => {
                    console.log(`    [${idx}]:`, item);
                  });
                }
              }
              return null;
            }

            if (DEBUG) {
              console.log("[WidgetChatScreen] render message", {
                id: uiMessage.id,
                role: uiMessage.role,
                uiMessage,
                rawMessage,
                parsedContent,
              });
            }

            return (
              <AIMessage
                from={uiMessage.role === "user" ? "user" : "assistant"}
                key={uiMessage.id}
              >
                <AIMessageContent>
                  {parsedContent.images.length > 0 && (
                    <ImageDisplay
                      imageUrls={parsedContent.images}
                      className="mb-2"
                    />
                  )}
                  {parsedContent.text && (
                    <AIResponse>{parsedContent.text}</AIResponse>
                  )}
                </AIMessageContent>

                {uiMessage.role === "assistant" && (
                  <DicebearAvatar
                    imageUrl="/logo.png"
                    seed="assistant"
                    size={32}
                  />
                )}
              </AIMessage>
            );
          })}

          {/* Show thinking indicator when waiting for agent response */}
          {isWaitingForResponse && (
            <AIMessage from="assistant">
              <AIMessageContent>
                <AIActivityIndicator activity="thinking" text="Thinking..." />
              </AIMessageContent>
              <DicebearAvatar
                imageUrl="/logo.png"
                seed="assistant"
                size={32}
              />
            </AIMessage>
          )}
        </AIConversationContent>
      </AIConversation>

      {uiMessages.length === 1 && (
        <AISuggestions className="flex w-full flex-col items-end p-2">
          {suggestions.map((suggestion) => {
            if (!suggestion) return null;

            return (
              <AISuggestion
                key={suggestion}
                onClick={() => {
                  if (DEBUG) {
                    console.log(
                      "[WidgetChatScreen] suggestion clicked",
                      suggestion
                    );
                  }
                  form.setValue("message", suggestion, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  form.handleSubmit(onSubmit)();
                }}
                suggestion={suggestion}
              />
            );
          })}
        </AISuggestions>
      )}

      <Form {...form}>
        <AIInputWithDragDrop
          className="rounded-none border-x-0 border-b-0"
          onSubmit={form.handleSubmit(onSubmit)}
          onImageDrop={(files) => {
            if (DEBUG) {
              console.log("[WidgetChatScreen] onImageDrop", { files });
            }
            addImages(files);
          }}
          dragDropEnabled={canAddMore && !isResolved}
        >
          {selectedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b p-2">
              {selectedImages.map((image, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={previewUrls[idx]}
                    alt={`Preview ${idx + 1}`}
                    className="h-16 w-16 rounded border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (DEBUG) {
                        console.log("[WidgetChatScreen] removeImage", idx);
                      }
                      removeImage(idx);
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <FormField
            control={form.control}
            disabled={isResolved}
            name="message"
            render={({ field }) => (
              <AIInputTextarea
                disabled={isResolved}
                onChange={(e) => {
                  if (DEBUG) {
                    console.log(
                      "[WidgetChatScreen] textarea onChange",
                      e.target.value
                    );
                  }
                  field.onChange(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (DEBUG)
                      console.log(
                        "[WidgetChatScreen] textarea Enter submit"
                      );
                    form.handleSubmit(onSubmit)();
                  }
                }}
                placeholder={
                  isResolved
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
                onImageSelect={(files) => {
                  if (DEBUG) {
                    console.log("[WidgetChatScreen] onImageSelect", files);
                  }
                  addImages(files);
                }}
                disabled={!canAddMore || isResolved}
              />
            </AIInputTools>
            <AIInputSubmit
              disabled={!canSend}
              status="ready"
              type="submit"
            />
          </AIInputToolbar>
        </AIInputWithDragDrop>
      </Form>
    </>
  );
};
