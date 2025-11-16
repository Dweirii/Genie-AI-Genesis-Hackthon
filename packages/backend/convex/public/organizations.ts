import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
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
    const organization = await clerkClient.organizations.getOrganization({
      organizationId: args.organizationId,
    });
    
    if (organization) {
    return { valid: true }
    } else {
      return { valid: false, reason: "Organization not valid" };
    }
  },
});

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
