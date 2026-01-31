// Actions (External API & Async)

"use node"; // Important: Run in Node.js environment

import { action } from "./_generated/server";
import { v } from "convex/values";
// @ts-ignore - pdf-parse doesn't have type definitions
import pdf from "pdf-parse";
import OpenAI from "openai";

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

// 2. [AI] Analyze text and convert to JSON (using GPT-4o-mini)
export const analyzeFinancialText = action({
  args: {
    text: v.string(), // Text extracted from PDF
  },
  handler: async (_ctx, args) => {
    // 1. Create OpenAI client (using environment variable key)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("🤖 Requesting analysis from GPT-4o-mini...");

    // 2. Create prompt for GPT
    const prompt = `
      You are an expert financial assistant. Analyze the following credit card statement text (OCR result) and organize it into structured JSON data.

      [Fields to Extract]

      1. totalSpent: Total amount spent (number)

      2. period: Statement period (e.g., "2025-12-11 ~ 2026-01-10")

      3. transactions: List of transactions (array)

         - date: Transaction date (YYYY-MM-DD)

         - merchant: Merchant name (Cleaned up)

         - amount: Amount (Number)

         - category: Category (Infer one: Food, Shopping, Transport, Utilities, Travel, Other)

      4. summary: A one-sentence sarcastic or encouraging comment on the user's spending habits (English).

      5. advice: Specific advice on where to cut costs based on the highest spending category (English).

      [Constraints]

      - Output ONLY valid JSON.

      - Exclude payment records.

      [Text to Analyze]

      ${args.text}

    `;

    // 3. Call GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful financial data extractor." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" }, // Force JSON mode
    });

    // 4. Get and return result
    const result = completion.choices[0].message.content;
    console.log("🤖 Analysis complete! Result length:", result?.length);

    if (!result) throw new Error("GPT returned an empty response.");

    return JSON.parse(result); // Convert string to actual JSON object
  },
});
