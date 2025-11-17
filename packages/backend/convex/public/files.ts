import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadImage = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{ storageId: Id<"_storage">; url: string; mimeType: string; size: number }> => {
    // Get the stored file to validate it
    const file = await ctx.storage.get(args.storageId);
    
    if (!file) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }

    // Get storage metadata to access contentType
    // Note: In actions, we need to use internal query to access system storage
    const storageMetadata: { contentType?: string; size?: number } | null = await ctx.runQuery(internal.system.storage.getMetadata, {
      storageId: args.storageId,
    });

    // Validate file size
    const fileSize: number = storageMetadata?.size ?? file.size;
    if (fileSize > MAX_IMAGE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Image size exceeds maximum of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Validate MIME type - get from metadata or try to infer from file
    const mimeType: string = storageMetadata?.contentType || "";
    if (!mimeType || !SUPPORTED_IMAGE_TYPES.includes(mimeType as any)) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Unsupported image type. Supported types: ${SUPPORTED_IMAGE_TYPES.join(", ")}`,
      });
    }

    // Get URL for the stored image
    const url = await ctx.storage.getUrl(args.storageId);
    
    if (!url) {
      throw new ConvexError({
        code: "INTERNAL_ERROR",
        message: "Failed to generate image URL",
      });
    }

    return {
      storageId: args.storageId,
      url,
      mimeType,
      size: fileSize,
    };
  },
});

