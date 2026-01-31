// User-related queries and mutations

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // 🛡️ 1. Validation
    // Check if code consists only of digits and is exactly 6 characters long
    const CODE_REGEX = /^\d{6}$/;

    if (!CODE_REGEX.test(args.code)) {
      throw new Error("Code must be exactly 6 digits (e.g., 123456)");
    }

    // 2. Business Logic
    const tokenIdentifier = `code:${args.code}`;

    // Search for existing user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", {
      name: `User ${args.code}`,
      tokenIdentifier: tokenIdentifier,
    });

    return newUserId;
  },
});

