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

      2. transactions: List of transactions (array)

         - date: Transaction date (YYYY-MM-DD)

         - merchant: Merchant name (Cleaned up)

         - amount: Amount (Number)

         - category: Category (Infer one from the list below):
           * Food: Restaurants, cafes, grocery stores, food delivery, bars, pubs, clubs
           * Shopping: Retail stores, online shopping, clothing, electronics
           * Transport: Public transport, taxis, fuel, parking, car maintenance
           * Utilities: Electricity, water, gas, internet, phone bills
           * Travel: Hotels, flights, travel bookings, vacation expenses
           * Transaction: Bank transfers, account transfers, direct debits, standing orders, wire transfers, remittances
           * Other: Any transaction that doesn't fit the above categories

      3. summary: A one-sentence sarcastic or encouraging comment on the user's spending habits (English).

      4. advice: Specific advice on where to cut costs based on the highest spending category (English).

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

    // 4. Get and parse result
    const result = completion.choices[0].message.content;
    console.log("🤖 Analysis complete! Result length:", result?.length);

    if (!result) throw new Error("GPT returned an empty response.");

    const data = JSON.parse(result);

    // 5. Calculate period and averageDailySpent using TypeScript
    let averageDailySpent = 0;
    let period = "날짜 정보 없음";

    if (data.transactions && data.transactions.length > 0) {
      // 1. 날짜 정렬 (TypeScript가 타입을 알 수 있게 t: any 사용)
      const dates = data.transactions
        .map((t: any) => new Date(t.date).getTime())
        .sort((a: number, b: number) => a - b);

      const minDate = new Date(dates[0]);
      const maxDate = new Date(dates[dates.length - 1]);

      // 2. 기간 문자열 생성
      period = `${minDate.toISOString().split('T')[0]} ~ ${maxDate.toISOString().split('T')[0]}`;

      // 3. 날짜 차이 계산 (+1일 추가)
      const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // 4. 평균 계산
      if (diffDays > 0) {
        averageDailySpent = Number((data.totalSpent / diffDays).toFixed(2));
      }
    }

    const finalResult = {
      ...data,
      period,
      averageDailySpent,
    };

    return finalResult;
  },
});
