// Actions (External API & Async)

"use node"; // Important: Run in Node.js environment

import { action } from "./_generated/server";
import { v } from "convex/values";
// @ts-ignore - pdf-parse doesn't have type definitions
import pdf from "pdf-parse";

export const extractText = action({
  args: {
    storageId: v.id("_storage"),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    // 1. Get file URL
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error(`File not found. storageId: ${args.storageId}`);
    }

    // 2. Download file
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    // 3. Extract text from PDF (using pdf-parse)
    try {
      const data = await pdf(Buffer.from(arrayBuffer));
      return data.text;
    } catch (error) {
      console.error("PDF parsing error:", error);
      throw new Error("Failed to extract text from PDF.");
    }
  },
});
