// User-related queries and mutations

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// 1. Check if code exists (before login step)
export const checkCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // Validation: Check if code is exactly 6 digits
    const CODE_REGEX = /^\d{6}$/;
    if (!CODE_REGEX.test(args.code)) {
      throw new Error("Code must be exactly 6 digits (e.g., 123456)");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    // Return true if user exists, false otherwise
    return !!user;
  },
});

// 2. Register new user (when code doesn't exist)
export const register = mutation({
  args: { 
    code: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validation
    const CODE_REGEX = /^\d{6}$/;
    const PASSWORD_REGEX = /^\d{2}$/;

    if (!CODE_REGEX.test(args.code)) {
      throw new Error("Code must be exactly 6 digits (e.g., 123456)");
    }

    if (!PASSWORD_REGEX.test(args.password)) {
      throw new Error("Password must be exactly 2 digits (e.g., 12)");
    }

    // Double-check if code was created in the meantime
    const existing = await ctx.db
      .query("users")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("Code already exists. Please use login instead.");
    }

    const userId = await ctx.db.insert("users", {
      code: args.code,
      password: args.password,
      name: `User ${args.code}`,
    });

    return userId;
  },
});

// 3. Login (when code exists)
export const login = mutation({
  args: { 
    code: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validation
    const CODE_REGEX = /^\d{6}$/;
    const PASSWORD_REGEX = /^\d{2}$/;

    if (!CODE_REGEX.test(args.code)) {
      throw new Error("Code must be exactly 6 digits (e.g., 123456)");
    }

    if (!PASSWORD_REGEX.test(args.password)) {
      throw new Error("Password must be exactly 2 digits (e.g., 12)");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!user) {
      throw new Error("User not found. Please check your code.");
    }

    // Verify password
    if (user.password !== args.password) {
      throw new Error("Incorrect password. Please try again.");
    }

    return user._id;
  },
});
