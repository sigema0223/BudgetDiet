// Main screen component

import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Pantone Green color palette for charts
const COLORS = ["#2E7D32", "#43A047", "#66BB6A", "#81C784", "#A5D6A7", "#C8E6C9"];

export default function App() {
  // State management
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  // Check if Convex is configured
  const convexUrl = (import.meta.env.VITE_CONVEX_URL as string) || "";
  const isConvexConfigured = convexUrl.length > 0;

  // Backend function hooks (only if Convex is configured)
  const checkUser = useMutation(api.users.getOrCreateByCode);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const saveAnalysis = useMutation(api.documents.saveAnalysisResult);
  // Extract text action (if available in actions.ts)
  const extractText = useAction(
    (api as any).actions?.extractText as any
  );
  // Analyze text action
  const analyzeText = useAction(
    (api as any).actions?.analyzeFinancialText as any
  );

  // Real-time query for my documents (only when logged in)
  const myDocs = useQuery(api.documents.list, userId ? { userId } : "skip");

  // 1. Login handler
  const handleLogin = async () => {
    try {
      setError(null);
      const id = await checkUser({ code });
      setUserId(id);
    } catch (error) {
      setError("Please check your code (6 digits)");
      console.error("Login error:", error);
    }
  };

  // 2. File upload handler (core logic)
  const handleUpload = async () => {
    if (!file || !userId) {
      console.error("❌ Missing file or userId");
      setError("Missing file or user ID");
      return;
    }

    console.log("🚀 Starting upload process...");
    console.log("📄 File:", file.name, "Size:", file.size);

    try {
      // Step A: Get upload URL
      console.log("📤 Step A: Getting upload URL...");
      const postUrl = await generateUploadUrl();
      console.log("✅ Upload URL received:", postUrl);

      // Step B: Upload file to the URL (POST)
      console.log("📤 Step B: Uploading file to storage...");
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        const errorText = await result.text();
        console.error("❌ Upload failed:", result.status, errorText);
        throw new Error(`Upload failed: ${result.status} ${errorText}`);
      }

      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      console.log("✅ File uploaded successfully. Storage ID:", storageId);

      // Step C: Save metadata to database
      console.log("💾 Step C: Saving document metadata to database...");
      const docId = await createDocument({
        title: file.name,
        storageId,
        userId,
      });
      console.log("✅ Document created in database. Document ID:", docId);

      // Step D: Extract text from PDF
      console.log("📝 Step D: Starting text extraction...");
      let text: string;
      try {
        text = await extractText({
          documentId: docId,
          storageId: storageId,
        });
        console.log("🔥 [Step 4] Text extraction successful!", text.length);
      } catch (extractError) {
        console.error("❌ Text extraction failed:", extractError);
        console.error("❌ Error details:", {
          message: extractError instanceof Error ? extractError.message : String(extractError),
          stack: extractError instanceof Error ? extractError.stack : undefined,
          error: extractError,
        });
        throw new Error(`Text extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}`);
      }

      // Step E: AI analysis request
      alert("Text extraction complete! AI analysis starting... (please wait)");
      console.log("🧠 [Step 5] Starting GPT-4o-mini analysis...");
      let analysisResult: any;
      try {
        analysisResult = await analyzeText({ text: text });
        console.log("✨ [Step 5] AI analysis result:", analysisResult);
        console.log("💰 Total spent:", analysisResult.totalSpent);
      } catch (analyzeError) {
        console.error("❌ AI analysis failed:", analyzeError);
        console.error("❌ Error details:", {
          message: analyzeError instanceof Error ? analyzeError.message : String(analyzeError),
          stack: analyzeError instanceof Error ? analyzeError.stack : undefined,
          error: analyzeError,
        });
        throw new Error(`AI analysis failed: ${analyzeError instanceof Error ? analyzeError.message : String(analyzeError)}`);
      }

      // Step F: Save to DB
      console.log("💾 [Step 6] Saving results to Database...");
      try {
        await saveAnalysis({
          documentId: docId,
          analysis: analysisResult, // Pass JSON from AI directly
        });
        console.log("✅ Analysis results saved to database");
      } catch (saveError) {
        console.error("❌ Failed to save analysis results:", saveError);
        console.error("❌ Error details:", {
          message: saveError instanceof Error ? saveError.message : String(saveError),
          stack: saveError instanceof Error ? saveError.stack : undefined,
          error: saveError,
        });
        throw new Error(`Failed to save analysis: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
      }

      setFile(null); // Reset
      setError(null);
      console.log("✅ Upload, extraction, analysis, and save completed successfully!");
      alert(`🎉 Analysis & Save Complete!\nTotal Spent: ${analysisResult.totalSpent}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorStack = e instanceof Error ? e.stack : undefined;
      
      console.error("❌ ========== UPLOAD ERROR ==========");
      console.error("❌ Error message:", errorMessage);
      console.error("❌ Error stack:", errorStack);
      console.error("❌ Full error object:", e);
      console.error("❌ ====================================");
      
      setError(`Upload failed: ${errorMessage}`);
      alert(`❌ Upload Error:\n\n${errorMessage}\n\nCheck console for details.`);
    }
  };

  // Show error if Convex is not configured
  if (!isConvexConfigured) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "30px", color: "var(--pantone-green-dark)" }}>
          🤖 AI Budget & Diet
        </h1>
        <div className="glass-card" style={{ background: "rgba(255, 243, 205, 0.8)" }}>
          <h3 style={{ color: "#856404", marginTop: 0 }}>⚠️ Convex Not Configured</h3>
          <p>Please set up Convex to use this application:</p>
          <ol style={{ textAlign: "left", lineHeight: "1.8" }}>
            <li>Run <code style={{ background: "rgba(255, 255, 255, 0.5)", padding: "2px 6px", borderRadius: "4px" }}>npx convex dev</code> in a new terminal</li>
            <li>Follow the setup instructions</li>
            <li>Restart the Vite server</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px", color: "var(--pantone-green-dark)" }}>
        🤖 AI Budget & Diet
      </h1>

      {error && (
        <div
          className="glass-card"
          style={{
            background: "rgba(248, 215, 218, 0.8)",
            color: "#721c24",
            marginBottom: "20px",
            border: "1px solid rgba(220, 53, 69, 0.3)",
          }}
        >
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Pre-login screen */}
      {!userId ? (
        <div className="glass-card" style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            maxLength={6}
            placeholder="6-digit code (e.g., 123456)"
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
            style={{
              padding: "12px 16px",
              flex: 1,
              borderRadius: "12px",
              border: "1px solid var(--glass-border)",
              background: "rgba(255, 255, 255, 0.5)",
              fontSize: "16px",
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              background: "var(--pantone-green-accent)",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Enter
          </button>
        </div>
      ) : (
        /* Post-login screen */
        <div>
          <div className="glass-card" style={{ marginBottom: "20px", textAlign: "center" }}>
            ✅ Connected as: <strong style={{ color: "var(--pantone-green-dark)" }}>{code}</strong>
          </div>

          {/* Upload section */}
          <div className="glass-card" style={{ marginBottom: "30px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255, 255, 255, 0.5)",
                }}
              />
              <button
                onClick={handleUpload}
                disabled={!file}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: file ? "var(--pantone-green-accent)" : "#ccc",
                  color: "white",
                  fontWeight: "bold",
                  cursor: file ? "pointer" : "not-allowed",
                  fontSize: "16px",
                  transition: "all 0.3s ease",
                }}
              >
                Upload
              </button>
            </div>
          </div>


          {/* List section */}
          <h2 style={{ color: "var(--pantone-green-dark)", marginBottom: "20px" }}>
            📂 My Documents
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {myDocs && myDocs.length === 0 ? (
              <div className="glass-card" style={{ textAlign: "center" }}>
                <p style={{ color: "#666", margin: 0 }}>
                  No documents yet. Upload a PDF to get started!
                </p>
              </div>
            ) : (
              myDocs?.map((doc) => {
                const isExpanded = expandedDocs.has(doc._id);
                const toggleDoc = () => {
                  setExpandedDocs((prev) => {
                    const next = new Set(prev);
                    if (next.has(doc._id)) {
                      next.delete(doc._id);
                    } else {
                      next.add(doc._id);
                    }
                    return next;
                  });
                };

                return (
                  <div key={doc._id} className="glass-card">
                    {/* 1. Document header (clickable toggle) */}
                    <div
                      onClick={toggleDoc}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        padding: "5px 0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "1.2rem",
                            transition: "transform 0.3s ease",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            display: "inline-block",
                          }}
                        >
                          ▶
                        </span>
                        <h3 style={{ margin: 0 }}>{doc.title}</h3>
                      </div>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "20px",
                          backgroundColor:
                            doc.status === "completed" ? "#e6fffa" : "#fff5f5",
                          color: doc.status === "completed" ? "#2c7a7b" : "#c53030",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                        }}
                      >
                        {doc.status}
                      </span>
                    </div>

                  {/* 2. Analysis result with charts (collapsible) */}
                  {doc.analysis && isExpanded && (
                    <div style={{ marginTop: "20px" }}>
                      {/* Header: Title, Period & Total Spent */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          marginBottom: "30px",
                          borderBottom: "2px solid rgba(46, 125, 50, 0.2)",
                          paddingBottom: "15px",
                        }}
                      >
                        <div>
                          <h2 style={{ margin: 0, color: "var(--pantone-green-dark)", fontSize: "1.5rem" }}>
                            {doc.title}
                          </h2>
                          {doc.analysis.period && (
                            <span style={{ fontSize: "0.9rem", color: "#555", marginTop: "5px", display: "block" }}>
                              {doc.analysis.period}
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.8rem", color: "#555", marginBottom: "5px" }}>
                            Total Spent
                          </div>
                          <div
                            style={{
                              fontSize: "2rem",
                              fontWeight: "bold",
                              color: "var(--pantone-green-dark)",
                            }}
                          >
                            ${doc.analysis.totalSpent.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* AI Summary & Advice (2 columns) */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "20px",
                          marginBottom: "30px",
                        }}
                      >
                        {doc.analysis.summary && (
                          <div
                            className="glass-card"
                            style={{
                              background: "rgba(255, 255, 255, 0.6)",
                              borderLeft: "5px solid var(--pantone-green-accent)",
                            }}
                          >
                            <strong style={{ color: "var(--pantone-green-dark)" }}>💬 AI Summary</strong>
                            <p style={{ marginTop: "8px", fontStyle: "italic", lineHeight: "1.6" }}>
                              "{doc.analysis.summary}"
                            </p>
                          </div>
                        )}
                        {doc.analysis.advice && (
                          <div
                            className="glass-card"
                            style={{
                              background: "rgba(232, 245, 233, 0.8)",
                              borderLeft: "5px solid var(--pantone-green-dark)",
                            }}
                          >
                            <strong style={{ color: "var(--pantone-green-dark)" }}>💡 Financial Advice</strong>
                            <p style={{ marginTop: "8px", lineHeight: "1.6", color: "#1B5E20" }}>
                              {doc.analysis.advice}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Chart & Top 3 (2 columns) */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "30px",
                          marginBottom: "30px",
                        }}
                      >
                        {/* Left: Category Breakdown Chart */}
                        <div className="glass-card" style={{ minHeight: "350px" }}>
                          <h4 style={{ marginBottom: "15px", color: "var(--pantone-green-dark)" }}>
                            📊 Spending by Category
                          </h4>
                          {(() => {
                            // Process category data for chart
                            const categoryMap: Record<string, number> = {};
                            doc.analysis.transactions?.forEach((t: any) => {
                              const cat = t.category || "Other";
                              categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
                            });
                            const chartData = Object.keys(categoryMap).map((key) => ({
                              name: key,
                              value: categoryMap[key],
                            }));

                            return chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {chartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(value: number | undefined) =>
                                      value ? `$${value.toLocaleString()}` : ""
                                    }
                                  />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <p style={{ textAlign: "center", color: "#666" }}>No data available</p>
                            );
                          })()}
                        </div>

                        {/* Right: Top 3 Expenses & All Transactions */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          {/* Top 3 Expenses */}
                          <div className="glass-card">
                            <h4 style={{ marginBottom: "15px", color: "var(--pantone-green-dark)" }}>
                              🏆 Top 3 Expenses
                            </h4>
                            {(() => {
                              const sorted = [...(doc.analysis.transactions || [])].sort(
                                (a: any, b: any) => b.amount - a.amount
                              );
                              const top3 = sorted.slice(0, 3);

                              return top3.length > 0 ? (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                  {top3.map((t: any, idx: number) => (
                                    <li
                                      key={idx}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "12px 0",
                                        borderBottom:
                                          idx < 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: "bold", color: "#333" }}>
                                          {t.merchant}
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "#888" }}>
                                          {t.date} • {t.category}
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: "bold",
                                          color: "var(--pantone-green-dark)",
                                          fontSize: "1.1rem",
                                        }}
                                      >
                                        ${t.amount}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p style={{ color: "#666" }}>No transactions available</p>
                              );
                            })()}
                          </div>

                          {/* All Transactions (Collapsible) */}
                          <details className="glass-card" style={{ padding: "15px" }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                color: "var(--pantone-green-dark)",
                                fontWeight: "bold",
                                marginBottom: "10px",
                              }}
                            >
                              View All Transactions ({doc.analysis.transactions?.length || 0})
                            </summary>
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                marginTop: "10px",
                                maxHeight: "300px",
                                overflowY: "auto",
                              }}
                            >
                              {doc.analysis.transactions?.map((t: any, idx: number) => (
                                <li
                                  key={idx}
                                  style={{
                                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                                    padding: "10px 0",
                                    fontSize: "0.9rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>
                                    <span style={{ color: "#718096", marginRight: "10px" }}>
                                      {t.date}
                                    </span>
                                    <strong>{t.merchant}</strong>
                                    <span
                                      style={{
                                        marginLeft: "10px",
                                        fontSize: "0.8em",
                                        backgroundColor: "#edf2f7",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      {t.category}
                                    </span>
                                  </span>
                                  <strong>${t.amount}</strong>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Delete button */}
                  {isExpanded && (
                    <div style={{ marginTop: "15px", textAlign: "right" }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation(); // Prevent toggle when clicking delete
                          if (confirm(`Delete "${doc.title}"?`)) {
                            try {
                              await deleteDocument({
                                documentId: doc._id,
                                userId: userId!,
                              });
                              setError(null);
                            } catch (e) {
                              console.error(e);
                              setError("Failed to delete document");
                            }
                          }
                        }}
                        style={{
                          backgroundColor: "#fc8181",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          transition: "all 0.3s ease",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              );
              })
            )}
            {myDocs && myDocs.length === 0 && (
              <p style={{ color: "#666" }}>No documents found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
