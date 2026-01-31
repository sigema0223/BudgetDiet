import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 0. Users Table: User accounts
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(), // Format: "code:123456"
  }).index("by_token", ["tokenIdentifier"]),

  // 1. Documents Table: Stores the source of truth for every upload.
  documents: defineTable({
    title: v.string(),
    storageId: v.id("_storage"), // Reference to Convex's built-in file storage
    ownerId: v.id("users"),        // Reference to users table
    
    // Status as a State Machine (Failure as a designed state)
    status: v.union(
      v.literal("pending"),      // Just uploaded
      v.literal("extracting"),   // Text is being pulled from PDF
      v.literal("analyzing"),    // LLM is processing the text
      v.literal("completed"),    // Successfully analyzed
      v.literal("failed")        // Terminal error state
    ),
  })
    .index("by_status", ["status"])
    .index("by_ownerId", ["ownerId"]),

  // 2. Analysis Results Table: Stores the structured output.
  // This is separated to keep the documents table "lean".
  analysisResults: defineTable({
    documentId: v.id("documents"),
    summary: v.string(),
    
    // Domain-specific data (Budget/Diet focus)
    data: v.object({
      totalAmount: v.optional(v.number()),
      category: v.string(),
      items: v.array(v.string()),
    }),

    // Metadata for Governance (Crucial for AI startups)
    metadata: v.object({
      model: v.string(),      // e.g., "gpt-4o"
      tokenUsage: v.number(), // Track cost per request
      processedAt: v.number(),
    }),
  }).index("by_documentId", ["documentId"]),

  // 3. Execution Errors Table: Failure Modeling
  // Instead of generic logs, we store errors as structured data.
  executionErrors: defineTable({
    documentId: v.id("documents"),
    step: v.union(v.literal("extraction"), v.literal("analysis")),
    code: v.string(),         // e.g., "MODEL_TIMEOUT", "INVALID_FORMAT"
    message: v.string(),
    timestamp: v.number(),
  }).index("by_documentId", ["documentId"]),
});

