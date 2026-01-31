// Queries & Mutations (Data Access)

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. [Upload] Generate secure URL for file upload (Client uploads file to this URL)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// 2. [Create] Save metadata after upload completion (DB record)
export const create = mutation({
  args: {
    title: v.string(),
    storageId: v.id("_storage"), // Convex file storage ID
    userId: v.id("users"),       // User ID from users.ts
  },
  handler: async (ctx, args) => {
    // Record in DB: "This file belongs to this user"
    const docId = await ctx.db.insert("documents", {
      title: args.title,
      storageId: args.storageId,
      ownerId: args.userId,
      status: "pending", // Initial state: pending
    });

    return docId;
  },
});

// 3. [Read] Query list of my documents
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.userId))
      .order("desc") // Sort by newest first
      .collect();
  },
});

// 4. [Delete] Delete document and its file from storage
export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"), // For authorization check
  },
  handler: async (ctx, args) => {
    // Get the document to verify ownership and get storageId
    const doc = await ctx.db.get(args.documentId);
    
    if (!doc) {
      throw new Error("Document not found");
    }

    // Verify ownership
    if (doc.ownerId !== args.userId) {
      throw new Error("Not authorized to delete this document");
    }

    // Delete file from storage
    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId);
    }

    // Delete document record from database
    await ctx.db.delete(args.documentId);

    return { success: true };
  },
});

// 5. [Update] Update document status (pending -> extracting -> analyzing -> completed/failed)
export const updateStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("pending"),
      v.literal("extracting"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
    });
  },
});
