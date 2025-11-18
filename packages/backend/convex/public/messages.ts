import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { escalateConversation } from "../system/ai/tools/escalateConversation";
import { resolveConversation } from "../system/ai/tools/resolveConversation";
import { saveMessage } from "@convex-dev/agent";
import { search } from "../system/ai/tools/search";

/**
 * Create a new user message (text and/or images) and optionally trigger the AI agent.
 */
export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    // 1) Validate contact session
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      {
        contactSessionId: args.contactSessionId,
      }
    );

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    // 2) Load conversation
    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      {
        threadId: args.threadId,
      }
    );

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    // 3) Refresh session (keep it alive while user is active)
    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });

    // 4) Check subscription
    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
      }
    );

    const shouldTriggerAgent =
      conversation.status === "unresolved" &&
      subscription?.status === "active";

    // 5) Build content (text + images)
    const contentParts: Array<
      { type: "text"; text: string } | { type: "image"; image: string }
    > = [];

    const trimmedPrompt = args.prompt.trim();
    if (trimmedPrompt) {
      contentParts.push({ type: "text", text: trimmedPrompt });
    }

    if (args.imageStorageIds && args.imageStorageIds.length > 0) {
      for (const storageId of args.imageStorageIds) {
        const imageUrl = await ctx.storage.getUrl(storageId);
        if (imageUrl) {
          // Store as string; we'll extract storageId again later when refreshing URLs
          contentParts.push({ type: "image", image: imageUrl });
        }
      }
    }

    // Ensure message is not empty
    if (contentParts.length === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message must contain text or images",
      });
    }

    const hasImages = contentParts.some((part) => part.type === "image");

    const buildUserMessage = () => ({
      role: "user" as const,
      content: contentParts as any,
    });

    // 6) With active agent: persist the user message first so UI updates immediately,
    // then trigger the agent using promptMessageId for consistent context.
    if (shouldTriggerAgent) {
      const savedMessage = await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        message: buildUserMessage(),
      });

      await supportAgent.generateText(
        ctx,
        { threadId: args.threadId },
        {
          promptMessageId: savedMessage.messageId,
          tools: {
            escalateConversationTool: escalateConversation,
            resolveConversationTool: resolveConversation,
            searchTool: search,
          },
        }
      );
    } else {
      // 7) No active AI agent → just persist the user message

      if (hasImages) {
        // Text + images or images only → store as structured message
        await saveMessage(ctx, components.agent, {
          threadId: args.threadId,
          message: {
            role: "user",
            content: contentParts as any,
          },
        });
      } else {
        // Text only → store as structured content for consistency
        await saveMessage(ctx, components.agent, {
          threadId: args.threadId,
          message: buildUserMessage(),
        });
      }
    }
  },
});

/**
 * Get a paginated list of messages for a thread, refreshing image URLs
 * so that old signed URLs don't break the UI.
 */
export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      // Don't filter by status - let the UI handle filtering empty/incomplete messages
      // This allows messages to appear as soon as they're created, not just when marked "success"
    });

    // Refresh any image URLs in paginated messages
    const messagesWithFreshUrls = await Promise.all(
      paginated.page.map(async (message: any) => {
        if (message.message && Array.isArray(message.message.content)) {
          const refreshedContent = await Promise.all(
            message.message.content.map(async (part: any) => {
              if (part.type === "image" && part.image) {
                const imageUrl =
                  typeof part.image === "string"
                    ? part.image
                    : part.image.toString();

                // Expect URLs like: https://.../api/storage/<storageId>?token=...
                const storageIdMatch = imageUrl.match(
                  /\/api\/storage\/([^/?]+)/
                );
                if (storageIdMatch) {
                  try {
                    const storageId = storageIdMatch[1] as any;
                    const freshUrl = await ctx.storage.getUrl(storageId);
                    if (freshUrl) {
                      return { ...part, image: freshUrl };
                    }
                  } catch {
                    // Swallow errors here: if refreshing URL fails, we just return original part
                  }
                }
              }
              return part;
            })
          );

          return {
            ...message,
            message: {
              ...message.message,
              content: refreshedContent,
            },
          };
        }

        return message;
      })
    );

    return {
      ...paginated,
      page: messagesWithFreshUrls,
    };
  },
});
