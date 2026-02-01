// Main screen component

import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// Mint color palette for charts
const COLORS = ["#88D4AB", "#A7F3D0", "#5CB88F", "#6EE7B7", "#34D399", "#A5D6A7"];

export default function App() {
  // State management
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"CODE" | "PASSWORD">("CODE");
  const [isNewUser, setIsNewUser] = useState(false);
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  // Modal state
  const [modal, setModal] = useState<{
    show: boolean;
    type: "processing" | "success" | "error" | "info";
    message: string;
    details?: string;
  }>({
    show: false,
    type: "info",
    message: "",
  });

  // Check if Convex is configured
  const convexUrl = (import.meta.env.VITE_CONVEX_URL as string) || "";
  const isConvexConfigured = convexUrl.length > 0;

  // Backend function hooks (only if Convex is configured)
  const checkCode = useMutation(api.users.checkCode);
  const registerUser = useMutation(api.users.register);
  const loginUser = useMutation(api.users.login);
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

  // Animation states
  const isLoggedIn = !!userId;
  const hasDocuments = myDocs && myDocs.length > 0;

  // 1. Code check handler (Step 1: Check if code exists)
  const handleNextStep = async () => {
    if (code.length !== 6) {
      setError("Code must be exactly 6 digits");
      return;
    }

    try {
      setError(null);
      // Check if code exists in database
      const exists = await checkCode({ code });
      setIsNewUser(!exists); // If code doesn't exist, it's a new user
      setStep("PASSWORD"); // Move to password input step
    } catch (error) {
      setError("Failed to check code. Please try again.");
      console.error("Code check error:", error);
    }
  };

  // 2. Login/Register handler (Step 2: Complete authentication)
  const handleAuthComplete = async () => {
    if (password.length !== 2) {
      setError("Password must be exactly 2 digits");
      return;
    }

    try {
      setError(null);
      let id: Id<"users">;

      if (isNewUser) {
        // Register new user
        id = await registerUser({ code, password });
        setModal({
          show: true,
          type: "success",
          message: "Registration Complete!",
          details: `Remember your code: ${code} and password: ${password}`,
        });
        setTimeout(() => setModal((prev) => ({ ...prev, show: false })), 3000);
      } else {
        // Login existing user
        id = await loginUser({ code, password });
      }

      setUserId(id);
      setStep("CODE"); // Reset step for next time
      setPassword(""); // Clear password
    } catch (error: any) {
      setError(error.message || "Authentication failed. Please try again.");
      console.error("Auth error:", error);
    }
  };

  // Handle Enter key press in code input
  const handleCodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && code.length === 6) {
      handleNextStep();
    }
  };

  // Handle Enter key press in password input
  const handlePasswordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && password.length === 2) {
      handleAuthComplete();
    }
  };

  // Reset to initial state (logo click)
  const handleLogoClick = () => {
    setUserId(null);
    setCode("");
    setPassword("");
    setStep("CODE");
    setIsNewUser(false);
    setError(null);
    setExpandedDocs(new Set());
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
      setModal({
        show: true,
        type: "processing",
        message: "Processing...",
        details: "Text extraction complete! AI analysis starting...",
      });
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
      setModal({
        show: true,
        type: "success",
        message: "Analysis Complete!",
        details: `Total Spent: £${analysisResult.totalSpent.toLocaleString()}`,
      });
      setTimeout(() => setModal((prev) => ({ ...prev, show: false })), 3000);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorStack = e instanceof Error ? e.stack : undefined;
      
      console.error("❌ ========== UPLOAD ERROR ==========");
      console.error("❌ Error message:", errorMessage);
      console.error("❌ Error stack:", errorStack);
      console.error("❌ Full error object:", e);
      console.error("❌ ====================================");
      
      setError(`Upload failed: ${errorMessage}`);
      setModal({
        show: true,
        type: "error",
        message: "Upload Error",
        details: errorMessage,
      });
    }
  };

  // Show error if Convex is not configured
  if (!isConvexConfigured) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h1 style={{ textAlign: "center", marginBottom: "30px", color: "var(--mint-dark)" }}>
          🤖 BudgetDiet
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
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      {/* Floating Animated Orbs */}
      <div className="orb-container">
        <motion.div
          className="orb orb-1"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -100, 50, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="orb orb-2"
          animate={{
            x: [0, -120, 80, 0],
            y: [0, -100, 50, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isLoggedIn ? "2rem 20px" : "0 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Back Button - Left Top */}
        {isLoggedIn && (
          <motion.button
            onClick={handleLogoClick}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(136, 212, 171, 0.3)",
              borderRadius: "12px",
              padding: "8px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--mint-dark)",
              fontWeight: 600,
              fontSize: "14px",
              fontFamily: "'Frank Ruhl Libre', serif",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(136, 212, 171, 0.15)";
              e.currentTarget.style.transform = "translateX(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span>←</span>
            <span>Back</span>
          </motion.button>
        )}

        {/* Logo - Animated */}
        <motion.div
          className="logo-container"
          onClick={handleLogoClick}
          style={{
            textAlign: "center",
            cursor: isLoggedIn ? "pointer" : "default",
            paddingTop: isLoggedIn ? "2rem" : "33vh",
            marginBottom: isLoggedIn ? "2rem" : "2.5rem",
          }}
          animate={{
            scale: isLoggedIn ? 0.6 : 1,
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
          }}
        >
          <motion.h1
            className="logo-text"
            style={{
              fontSize: isLoggedIn ? "3rem" : "var(--text-hero)",
              fontWeight: 900,
              margin: 0,
              fontFamily: "'Frank Ruhl Libre', serif",
              background: "linear-gradient(180deg, #5CB88F 0%, #88D4AB 50%, #A7F3D0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
            }}
            animate={{
              fontSize: isLoggedIn ? "3rem" : "var(--text-hero)",
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            BudgetDiet
          </motion.h1>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card"
              style={{
                background: "rgba(248, 215, 218, 0.8)",
                color: "#721c24",
                marginBottom: "var(--space-md)",
                border: "1px solid rgba(220, 53, 69, 0.3)",
                maxWidth: isLoggedIn ? "100%" : "42rem",
                margin: isLoggedIn ? `0 auto var(--space-md)` : `0 auto var(--space-md)`,
              }}
            >
              <strong>⚠️ Error:</strong> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pre-login screen */}
        <AnimatePresence mode="wait">
          {!userId ? (
            <motion.div
              key="pre-login"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0,
                scale: 0.98,
                transition: {
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
              style={{
                maxWidth: "42rem",
                margin: "0 auto",
              }}
            >
            <div className="glass-card" style={{ textAlign: "center" }}>
              {step === "CODE" ? (
                // Step 1: Code Input (기존 스타일 유지)
                <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                    onKeyPress={handleCodeKeyPress}
                    className="input-glass"
                    style={{
                      flex: 1,
                      fontSize: "18px",
                      padding: "14px 20px",
                    }}
                  />
                  <button onClick={handleNextStep} className="btn-mint" disabled={code.length !== 6}>
                    Next
                  </button>
                </div>
              ) : (
                // Step 2: Password Input
                <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
                  <input
                    type="password"
                    maxLength={2}
                    placeholder={isNewUser ? "Set 2-digit password" : "Enter 2-digit password"}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    onKeyPress={handlePasswordKeyPress}
                    className="input-glass"
                    style={{
                      flex: 1,
                      fontSize: "18px",
                      padding: "14px 20px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setStep("CODE");
                      setPassword("");
                      setError(null);
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "24px",
                      border: "1px solid var(--mint-primary)",
                      background: "transparent",
                      color: "var(--mint-dark)",
                      cursor: "pointer",
                      fontFamily: "'Frank Ruhl Libre', serif",
                      fontWeight: 600,
                      fontSize: "16px",
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAuthComplete}
                    className="btn-mint"
                    disabled={password.length !== 2}
                  >
                    {isNewUser ? "Register" : "Enter"}
                  </button>
                </div>
              )}
            </div>
            {/* Digit Indicator - Dots (glass-card 밖으로 이동) */}
            {step === "CODE" ? (
              <div className="digit-indicator">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div
                    key={index}
                    className={`digit-dot ${index <= code.length ? "filled" : ""}`}
                  />
                ))}
              </div>
            ) : (
              <div className="digit-indicator">
                {[1, 2].map((index) => (
                  <div
                    key={index}
                    className={`digit-dot ${index <= password.length ? "filled" : ""}`}
                  />
                ))}
              </div>
            )}
            {/* Example Text (glass-card 밖으로 이동) */}
            <p className="body-text" style={{ marginTop: "var(--space-lg)", textAlign: "center", color: "#9ca3af", fontSize: "var(--text-sm)" }}>
              {step === "CODE" 
                ? "Example: Enter 123456 and press Next"
                : isNewUser 
                  ? "Example: Enter 12 and press Register"
                  : "Example: Enter 12 and press Enter"
              }
            </p>
          </motion.div>
          ) : (
            /* Post-login screen */
            <motion.div
              key="post-login"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ 
                opacity: 0, 
                y: 20,
                scale: 0.98,
                transition: {
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
            >
            {/* Connection Status */}
            <div className="glass-card-mint section-gap" style={{ textAlign: "center" }}>
              ✅ Connected as: <strong className="text-mint-dark">{code}</strong>
            </div>

            {/* Upload section */}
            <div className="glass-card section-gap" style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", padding: "var(--space-lg)" }}>
              {/* Custom file upload button */}
              <label
                htmlFor="file-upload"
                className={`custom-file-upload ${file ? "active" : ""}`}
                style={{ flex: 1 }}
              >
                <span>{file ? "📄" : "📂"}</span>
                <span style={{ flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file ? file.name : "Select PDF File"}
                </span>
              </label>

              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                className="hidden-input"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFile(e.target.files?.[0] || null)
                }
              />

              {/* Analyze button (always visible, disabled when no file) */}
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleUpload}
                disabled={!file}
                className="btn-mint"
                style={{
                  padding: "var(--space-md) var(--space-xl)",
                  fontSize: "var(--text-base)",
                  fontWeight: 700,
                  minWidth: "160px",
                  opacity: file ? 1 : 0.5,
                  cursor: file ? "pointer" : "not-allowed",
                }}
              >
                ✨ Analyze
              </motion.button>
            </div>

            {/* Documents List */}
            <AnimatePresence>
              {hasDocuments && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Daily Spent Summary - User Level */}
                  {(() => {
                    const completedDocs = myDocs?.filter((doc) => doc.analysis && doc.status === "completed") || [];
                    
                    if (completedDocs.length === 0) return null;

                    // Calculate total spent across all documents
                    const totalSpent = completedDocs.reduce((sum, doc) => {
                      return sum + (doc.analysis?.totalSpent || 0);
                    }, 0);

                    // Calculate total days by summing each document's period
                    let totalDays = 0;
                    const allPeriods: string[] = [];

                    completedDocs.forEach((doc) => {
                      if (doc.analysis?.transactions && Array.isArray(doc.analysis.transactions) && doc.analysis.transactions.length > 0) {
                        // Calculate period for this document
                        const dates = doc.analysis.transactions
                          .map((t: any) => new Date(t.date).getTime())
                          .filter((time: number) => !isNaN(time))
                          .sort((a: number, b: number) => a - b);

                        if (dates.length > 0) {
                          const minDate = new Date(dates[0]);
                          const maxDate = new Date(dates[dates.length - 1]);
                          
                          // Calculate days for this document (+1 day)
                          const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          totalDays += diffDays;

                          // Store period for display
                          const periodStr = `${minDate.toISOString().split('T')[0]} ~ ${maxDate.toISOString().split('T')[0]}`;
                          allPeriods.push(periodStr);
                        }
                      }
                    });

                    // Calculate average daily spent
                    let averageDailySpent = 0;
                    if (totalDays > 0) {
                      averageDailySpent = Number((totalSpent / totalDays).toFixed(2));
                    }

                    if (averageDailySpent > 0) {
                      return (
                        <div className="glass-card-mint" style={{ marginBottom: "var(--space-lg)", textAlign: "center" }}>
                          <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "8px" }}>Average Daily Spent</div>
                          <div className="total-spent" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--mint-dark)" }}>
                            £{averageDailySpent.toLocaleString()}
                          </div>
                          {allPeriods.length > 0 && (
                            <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "8px" }}>
                              {allPeriods.length === 1 
                                ? allPeriods[0]
                                : `${allPeriods.length} documents • ${totalDays} days`
                              }
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <h2 className="text-mint-dark" style={{ marginBottom: "var(--space-lg)", fontSize: "var(--text-2xl)", fontWeight: 700 }}>
                    📂 My Documents
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                    {myDocs && myDocs.length === 0 ? (
                      <div className="glass-card" style={{ textAlign: "center" }}>
                        <p className="body-text" style={{ color: "#666", margin: 0 }}>
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
                          <motion.div
                            key={doc._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass-card"
                          >
                            {/* Document header (clickable toggle) */}
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
                                <motion.span
                                  animate={{ rotate: isExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.3 }}
                                  style={{
                                    fontSize: "1.2rem",
                                    display: "inline-block",
                                  }}
                                >
                                  ▶
                                </motion.span>
                                <h3 style={{ margin: 0, color: "var(--mint-dark)", fontWeight: 700 }}>
                                  {doc.title}
                                </h3>
                              </div>
                              <span
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "20px",
                                  backgroundColor:
                                    doc.status === "completed" ? "var(--mint-light)" : "#fff5f5",
                                  color: doc.status === "completed" ? "var(--mint-dark)" : "#c53030",
                                  fontSize: "0.8rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {doc.status}
                              </span>
                            </div>

                            {/* Analysis result with charts (collapsible) */}
                            <AnimatePresence>
                              {doc.analysis && isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  style={{ marginTop: "var(--space-md)", overflow: "hidden" }}
                                >
                                  {/* Header: Title, Period & Total Spent */}
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-end",
                                      marginBottom: "var(--space-lg)",
                                      borderBottom: "2px solid var(--mint-glass)",
                                      paddingBottom: "var(--space-sm)",
                                    }}
                                  >
                                    <div>
                                      <h2 style={{ margin: 0, color: "var(--mint-dark)", fontSize: "var(--text-xl)", fontWeight: 700 }}>
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
                                        className="total-spent"
                                        style={{
                                          fontSize: "2rem",
                                          fontWeight: 700,
                                          color: "var(--mint-dark)",
                                        }}
                                      >
                                        £{doc.analysis.totalSpent.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>

                                  {/* AI Summary & Advice (2 columns) */}
                                  <div
                                    className="grid-2-col"
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: "var(--space-md)",
                                      marginBottom: "var(--space-lg)",
                                    }}
                                  >
                                    {doc.analysis.summary && (
                                      <div
                                        className="glass-card-mint"
                                        style={{
                                          borderLeft: "5px solid var(--mint-primary)",
                                        }}
                                      >
                                        <strong className="text-mint-dark" style={{ fontSize: "1.1rem" }}>
                                          💬 AI Summary
                                        </strong>
                                        <p className="body-text" style={{ marginTop: "8px" }}>
                                          "{doc.analysis.summary}"
                                        </p>
                                      </div>
                                    )}
                                    {doc.analysis.advice && (
                                      <div
                                        className="glass-card-mint"
                                        style={{
                                          borderLeft: "5px solid var(--mint-dark)",
                                        }}
                                      >
                                        <strong className="text-mint-dark" style={{ fontSize: "1.1rem" }}>
                                          💡 Financial Advice
                                        </strong>
                                        <p className="body-text" style={{ marginTop: "8px", color: "#1B5E20" }}>
                                          {doc.analysis.advice}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Chart & Top 3 (2 columns) */}
                                  <div
                                    className="grid-2-col"
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: "var(--space-lg)",
                                      marginBottom: "var(--space-lg)",
                                    }}
                                  >
                                    {/* Left: Category Breakdown Chart */}
                                    <div className="glass-card-mint pie-chart-container" style={{ minHeight: "350px" }}>
                                      <h4 className="text-mint-dark" style={{ marginBottom: "15px", fontWeight: 700 }}>
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
                                          <ResponsiveContainer width="100%" height={250} className="pie-chart-responsive">
                                            <PieChart>
                                              <Pie
                                                data={chartData}
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                              >
                                                {chartData.map((_, index) => (
                                                  <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                  />
                                                ))}
                                              </Pie>
                                              <Tooltip
                                                formatter={(value: number | undefined) =>
                                                  value ? `£${value.toLocaleString()}` : ""
                                                }
                                              />
                                              <Legend />
                                            </PieChart>
                                          </ResponsiveContainer>
                                        ) : (
                                          <p className="body-text" style={{ textAlign: "center", color: "#666" }}>No data available</p>
                                        );
                                      })()}
                                    </div>

                                    {/* Right: Top 3 Expenses & All Transactions */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                                      {/* Top 3 Expenses */}
                                      <div className="glass-card-mint">
                                        <h4 className="text-mint-dark" style={{ marginBottom: "15px", fontWeight: 700 }}>
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
                                                    <div style={{ fontWeight: 700, color: "#333" }}>
                                                      {t.merchant}
                                                    </div>
                                                    <div style={{ fontSize: "0.8rem", color: "#888" }}>
                                                      {t.date} • {t.category}
                                                    </div>
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontWeight: 700,
                                                      color: "var(--mint-dark)",
                                                      fontSize: "1.1rem",
                                                    }}
                                                  >
                                                    £{t.amount}
                                                  </div>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p className="body-text" style={{ color: "#666" }}>No transactions available</p>
                                          );
                                        })()}
                                      </div>

                                      {/* All Transactions (Collapsible) */}
                                      <details className="glass-card-mint" style={{ padding: "15px" }}>
                                        <summary
                                          style={{
                                            cursor: "pointer",
                                            color: "var(--mint-dark)",
                                            fontWeight: 700,
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
                                                    backgroundColor: "var(--mint-light)",
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                  }}
                                                >
                                                  {t.category}
                                                </span>
                                              </span>
                                              <strong>£{t.amount}</strong>
                                            </li>
                                          ))}
                                        </ul>
                                      </details>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Delete button */}
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
                                    borderRadius: "24px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    transition: "all 0.3s ease",
                                    fontFamily: "'Frank Ruhl Libre', serif",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.05)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {modal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal((prev) => ({ ...prev, show: false }))}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
                padding: "var(--space-xl)",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setModal((prev) => ({ ...prev, show: false }))}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "transparent",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--mint-dark)",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(136, 212, 171, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                ×
              </button>

              {/* Icon based on type */}
              <div style={{ fontSize: "48px", marginBottom: "var(--space-md)" }}>
                {modal.type === "processing" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ display: "inline-block" }}
                  >
                    ⏳
                  </motion.div>
                )}
                {modal.type === "success" && "✅"}
                {modal.type === "error" && "❌"}
                {modal.type === "info" && "ℹ️"}
              </div>

              {/* Message */}
              <h3
                style={{
                  margin: "0 0 var(--space-md) 0",
                  color: "var(--mint-dark)",
                  fontWeight: 700,
                  fontSize: "var(--text-xl)",
                }}
              >
                {modal.message}
              </h3>

              {/* Details */}
              {modal.details && (
                <p
                  className="body-text"
                  style={{
                    margin: 0,
                    color: "#666",
                    fontSize: "var(--text-base)",
                    lineHeight: 1.6,
                  }}
                >
                  {modal.details}
                </p>
              )}

              {/* Processing indicator */}
              {modal.type === "processing" && (
                <div style={{ marginTop: "var(--space-md)" }}>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      color: "var(--mint-primary)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                    }}
                  >
                    Please wait...
                  </motion.div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
