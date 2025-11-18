import { createClerkClient } from "@clerk/backend";
import { ConvexError, v } from "convex/values";
import { action, mutation } from "../_generated/server";
import { internal } from "../_generated/api";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (_, args) => {
    try {
      const organization = await clerkClient.organizations.getOrganization({
        organizationId: args.organizationId,
      });

      if (organization) {
        return { valid: true };
      }
    } catch (error) {
      if (isClerkApiError(error) && error.status === 404) {
        return { valid: false, reason: "Organization not found" };
      }

      throw new ConvexError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to validate organization",
      });
    }

    return { valid: false, reason: "Organization not valid" };
  },
});

function isClerkApiError(error: unknown): error is { status: number } & Error {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as Record<string, unknown>).status === "number"
  );
}

// For testing/development: Create a test subscription
export const createTestSubscription = mutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.system.subscriptions.upsert, {
      organizationId: args.organizationId,
      status: "active",
    });
    return { success: true };
  },
});
