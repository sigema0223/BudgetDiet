// Main screen component

import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  // State management
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if Convex is configured
  const convexUrl = (import.meta.env.VITE_CONVEX_URL as string) || "";
  const isConvexConfigured = convexUrl.length > 0;

  // Backend function hooks (only if Convex is configured)
  const checkUser = useMutation(api.users.getOrCreateByCode);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const deleteDocument = useMutation(api.documents.deleteDocument);
  // Extract text action (if available in actions.ts)
  const extractText = useAction(
    (api as any).actions?.extractText as any
  );

  // Real-time query for my documents (only when logged in)
  const myDocs = useQuery(api.documents.list, userId ? { userId } : "skip");

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#28a745";
      case "failed":
        return "#dc3545";
      case "analyzing":
      case "extracting":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  };

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
      try {
        const text = await extractText({
          documentId: docId,
          storageId: storageId,
        });
        console.log("🔥 전체 텍스트 추출 성공:", text);
        console.log("📊 Extracted text length:", text?.length || 0);
      } catch (extractError) {
        console.error("❌ Text extraction failed:", extractError);
        console.error("❌ Error details:", {
          message: extractError instanceof Error ? extractError.message : String(extractError),
          stack: extractError instanceof Error ? extractError.stack : undefined,
          error: extractError,
        });
        throw new Error(`Text extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}`);
      }

      setFile(null); // Reset
      setError(null);
      console.log("✅ Upload and extraction completed successfully!");
      alert("Upload complete!");
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
      <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
        <h1>🤖 AI Budget & Diet</h1>
        <div style={{ 
          padding: "20px", 
          background: "#fff3cd", 
          border: "1px solid #ffc107",
          borderRadius: "8px",
          marginTop: "20px"
        }}>
          <h3>⚠️ Convex Not Configured</h3>
          <p>Please set up Convex to use this application:</p>
          <ol style={{ textAlign: "left" }}>
            <li>Run <code>npx convex dev</code> in a new terminal</li>
            <li>Follow the setup instructions</li>
            <li>Restart the Vite server</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>🤖 AI Budget & Diet</h1>

      {error && (
        <div style={{ 
          padding: "10px", 
          background: "#f8d7da", 
          color: "#721c24",
          borderRadius: "4px",
          marginBottom: "20px"
        }}>
          {error}
        </div>
      )}

      {/* Pre-login screen */}
      {!userId ? (
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            maxLength={6}
            placeholder="6-digit code (e.g., 123456)"
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
            style={{ padding: "10px", flex: 1 }}
          />
          <button onClick={handleLogin} style={{ padding: "10px 20px" }}>
            Enter
          </button>
        </div>
      ) : (
        /* Post-login screen */
        <div>
          <div style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0" }}>
            ✅ Connected as: <strong>{code}</strong>
          </div>

          {/* Upload section */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={handleUpload}
              disabled={!file}
              style={{
                padding: "10px 20px",
                background: file ? "blue" : "grey",
                color: "white",
              }}
            >
              Upload
            </button>
          </div>

          <hr />

          {/* List section */}
          <h3>📂 My Documents</h3>
          {myDocs && myDocs.length === 0 ? (
            <p style={{ color: "#666" }}>No documents yet. Upload a PDF to get started!</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {myDocs?.map((doc) => (
                <li
                  key={doc._id}
                  style={{
                    marginBottom: "12px",
                    padding: "12px",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{doc.title}</strong> -{" "}
                    <span style={{ fontWeight: "bold", color: getStatusColor(doc.status) }}>
                      {doc.status}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
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
                      padding: "6px 12px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
