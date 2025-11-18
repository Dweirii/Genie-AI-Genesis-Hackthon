import { ConvexError, v } from "convex/values";
import { generateText } from "ai";
import { action, mutation, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { saveMessage } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { OPERATOR_MESSAGE_ENHANCEMENT_PROMPT } from "../system/ai/constants";

export const enhanceResponse = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: orgId,
      },
    );

    if (subscription?.status !== "active") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Missing subscription"
      });
    }

    const response = await generateText({
      model: google.chat("gemini-2.0-flash-exp"),
      messages: [
        {
          role: "system",
          content: OPERATOR_MESSAGE_ENHANCEMENT_PROMPT,
        },
        {
          role: "user",
          content: args.prompt,
        },
      ],
    });

    return response.text;
  },
});

export const create = mutation({
  args: {
    prompt: v.string(),
    conversationId: v.id("conversations"),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    if (conversation.status === "unresolved") {
      await ctx.db.patch(args.conversationId, {
        status: "escalated",
      });
    }

    // Build multimodal content array
    const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];
    
    // Add text if provided
    if (args.prompt.trim()) {
      contentParts.push({ type: "text", text: args.prompt });
    }

    // Add images if provided - store storage IDs to regenerate URLs later
    if (args.imageStorageIds && args.imageStorageIds.length > 0) {
      for (const storageId of args.imageStorageIds) {
        const imageUrl = await ctx.storage.getUrl(storageId);
        if (imageUrl) {
          // Store both URL and storage ID for URL regeneration
          contentParts.push({ type: "image", image: imageUrl, storageId } as any);
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

    const hasImages = contentParts.some(part => part.type === "image");
    const firstContentPart = contentParts[0];

    const messageContent = hasImages
      ? (contentParts as any)
      : (
        firstContentPart && firstContentPart.type === "text"
          ? firstContentPart.text
          : (contentParts as any)
      );

    await saveMessage(ctx, components.agent, {
      threadId: conversation.threadId,
      // TODO: Check if "agentName" is needed or not
      agentName: identity.familyName,
      message: {
        role: "assistant",
        content: messageContent as any, // Type assertion for multimodal support
      },
    });
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      // Don't filter by status - let the UI handle filtering empty/incomplete messages
      // This allows messages to appear as soon as they're created, not just when marked "success"
    });

    // Refresh image URLs for messages with images
    const messagesWithFreshUrls = await Promise.all(
      paginated.page.map(async (message: any) => {
        // Check if message has multimodal content
        if (message.message && Array.isArray(message.message.content)) {
          const refreshedContent = await Promise.all(
            message.message.content.map(async (part: any) => {
              if (part.type === "image" && part.storageId) {
                // Regenerate URL from storage ID
                const freshUrl = await ctx.storage.getUrl(part.storageId);
                return { ...part, image: freshUrl || part.image };
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
