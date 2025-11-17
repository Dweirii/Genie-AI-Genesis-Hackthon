import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { escalateConversation } from "../system/ai/tools/escalateConversation";
import { resolveConversation } from "../system/ai/tools/resolveConversation";
import { saveMessage } from "@convex-dev/agent";
import { search } from "../system/ai/tools/search";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constants";

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

    // This refreshes the user's session if they are within the threshold
    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });

    const subscription = await ctx.runQuery(
      internal.system.subscriptions.getByOrganizationId,
      {
        organizationId: conversation.organizationId,
      },
    );

    const shouldTriggerAgent =
      conversation.status === "unresolved" && subscription?.status === "active"

    // Build multimodal content array
    const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];
    
    // Add text if provided
    if (args.prompt.trim()) {
      contentParts.push({ type: "text", text: args.prompt });
    }

    // Add images if provided
    if (args.imageStorageIds && args.imageStorageIds.length > 0) {
      for (const storageId of args.imageStorageIds) {
        const imageUrl = await ctx.storage.getUrl(storageId);
        if (imageUrl) {
          // Store image URL as string for proper serialization
          contentParts.push({ type: "image", image: imageUrl } as any);
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

    // Always use array format if we have images, even if there's also text
    // This ensures images are properly stored in the message
    const hasImages = contentParts.some(part => part.type === "image");
    const messageContent = hasImages 
      ? (contentParts as any)
      : (contentParts[0].type === "text" ? contentParts[0].text : contentParts as any);

    // Save the user message
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      message: {
        role: "user",
        content: messageContent as any,
      },
    });

    if (shouldTriggerAgent) {
      if (hasImages) {
        // For multimodal messages, call Gemini directly with images
        // Convert string URLs to URL objects for AI SDK
        const contentForAI = contentParts.map((part: any) => {
          if (part.type === "image" && typeof part.image === "string") {
            return { type: "image", image: new URL(part.image) };
          }
          return part;
        });

        // Call Gemini directly with multimodal content
        const response = await generateText({
          model: google.chat("gemini-2.0-flash-exp"),
          system: SUPPORT_AGENT_PROMPT,
          messages: [
            {
              role: "user",
              content: contentForAI as any,
            }
          ],
        });

        // Save AI response
        await supportAgent.saveMessage(ctx, {
          threadId: args.threadId,
          message: {
            role: "assistant",
            content: response.text,
          },
        });
      } else {
        // Text-only message - use agent's generateText with tools
        await supportAgent.generateText(
          ctx,
          { threadId: args.threadId },
          {
            prompt: messageContent as string,
            tools: {
              escalateConversationTool: escalateConversation,
              resolveConversationTool: resolveConversation,
              searchTool: search,
            }
          },
        );
      }
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

    return paginated;
  },
});
