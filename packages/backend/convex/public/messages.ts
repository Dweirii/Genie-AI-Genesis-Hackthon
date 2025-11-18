import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { escalateConversation } from "../system/ai/tools/escalateConversation";
import { resolveConversation } from "../system/ai/tools/resolveConversation";
import { saveMessage } from "@convex-dev/agent";
import { search } from "../system/ai/tools/search";

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
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

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      {
        threadId: args.threadId,
      },
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

    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });

    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
      },
    );

  
    const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];
    
    if (args.prompt.trim()) {
      contentParts.push({ type: "text", text: args.prompt });
    }

    if (args.imageStorageIds && args.imageStorageIds.length > 0) {
      for (const storageId of args.imageStorageIds) {
        const imageUrl = await ctx.storage.getUrl(storageId);
        if (imageUrl) {
          contentParts.push({ type: "image", image: new URL(imageUrl) });
        }
      }
    }

    // Ensure we have at least text or images
    if (contentParts.length === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message must contain text or images",
      });
    }

    // Determine message content format
    const hasImages = contentParts.some(part => part.type === "image");
    const firstContentPart = contentParts[0];
    const messageContent = hasImages 
      ? contentParts
      : (firstContentPart && firstContentPart.type === "text" ? firstContentPart.text : contentParts);

    const shouldTriggerAgent =
      conversation.status === "unresolved" && subscription?.status === "active"

    if (shouldTriggerAgent) {
      // Always save the user message explicitly first to ensure it's in the database
      // with the correct format before the AI response is generated
      const savedMessage = await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        message: {
          role: "user",
          content: messageContent as any,
        },
      });

      // Use promptMessageId to avoid duplicate message creation
      await supportAgent.generateText(
        ctx,
        { threadId: args.threadId },
        {
          promptMessageId: savedMessage.messageId,
          tools: {
            escalateConversationTool: escalateConversation,
            resolveConversationTool: resolveConversation,
            searchTool: search,
          }
        },
      )
    } else {
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        message: {
          role: "user",
          content: messageContent as any,
        },
      });
    }
  },
});

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
    });

    const messagesWithFreshUrls = await Promise.all(
      paginated.page.map(async (message: any) => {
        if (message.message && Array.isArray(message.message.content)) {
          const refreshedContent = await Promise.all(
            message.message.content.map(async (part: any) => {
              if (part.type === "image" && part.image) {
                const imageUrl = typeof part.image === "string" ? part.image : part.image.toString();
                const storageIdMatch = imageUrl.match(/\/api\/storage\/([^/?]+)/);
                if (storageIdMatch) {
                  try {
                    const storageId = storageIdMatch[1] as any;
                    const freshUrl = await ctx.storage.getUrl(storageId);
                    if (freshUrl) {
                      return { ...part, image: freshUrl };
                    }
                  } catch {
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
              content: refreshedContent 
            }
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
