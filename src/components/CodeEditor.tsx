"use client";

import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { initYjs } from "../lib/yjsClient";

const LANGUAGES = ["javascript", "typescript", "python", "java", "c"];

export default function CodeEditor() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [users, setUsers] = useState<any[]>([]);

  // Room/user states
  const [roomName, setRoomName] = useState("default-room");
  const [userName, setUserName] = useState("");
  const [joined, setJoined] = useState(false);

  // Run code output
  const [output, setOutput] = useState<string>("");

  // Track remote decorations
  const decorationsRef = useRef<string[]>([]);

  /** -------- Run Code -------- */
  async function runCode() {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    const lang = language;

    // Judge0 language IDs
    const langMap: Record<string, number> = {
      javascript: 63,
      python: 71,
      java: 62,
      c: 50,
      typescript: 74,
    };

    try {
      setOutput("⏳ Running...");
      const res = await fetch(
        "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": "<YOUR_KEY>", // 🔑 replace with your RapidAPI key
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
          body: JSON.stringify({
            source_code: code,
            language_id: langMap[lang],
            stdin: "",
          }),
        }
      );

      const data = await res.json();
      setOutput(data.stdout || data.stderr || data.compile_output || "No output");
    } catch (err) {
      setOutput("❌ Error running code: " + err);
    }
  }

  /** -------- Awareness + Yjs -------- */
  useEffect(() => {
    if (!editorRef.current || !joined) return;

    const { provider, ydoc } = initYjs(roomName, userName || "Anonymous");
    const yText = ydoc.getText("monaco");

    const model = editorRef.current.getModel();
    if (model) {
      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editorRef.current]),
        provider.awareness
      );
    }

    // Awareness update: users + cursors
    const updateAwareness = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const activeUsers = states.map(([_, state]: any) => state.user);
      setUsers(activeUsers);

      if (!editorRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;

      let newDecorations: Monaco.editor.IModelDeltaDecoration[] = [];

      states.forEach(([clientId, state]: [number, any]) => {
        if (clientId === provider.awareness.clientID) return; // skip self
        if (!state.cursor || !state.user) return;

        const { anchor, head } = state.cursor;
        if (!anchor || !head) return;

        const userColor = state.user.color || "#ff0000";
        const className = `remote-${clientId}`;

        // Inject CSS if not already present
        if (!document.getElementById(className)) {
          const style = document.createElement("style");
          style.id = className;
          style.innerHTML = `
            .${className}-selection {
              background-color: ${userColor}33;
            }
            .${className}-cursor {
              border-left: 2px solid ${userColor};
            }
          `;
          document.head.appendChild(style);
        }

        const range = new Monaco.Range(
          anchor.lineNumber,
          anchor.column,
          head.lineNumber,
          head.column
        );

        // Add cursor
        newDecorations.push({
          range,
          options: { beforeContentClassName: `${className}-cursor` },
        });

        // Add selection highlight
        if (
          anchor.lineNumber !== head.lineNumber ||
          anchor.column !== head.column
        ) {
          newDecorations.push({
            range,
            options: { inlineClassName: `${className}-selection` },
          });
        }
      });

      // Apply decorations
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    };

    provider.awareness.on("change", updateAwareness);

    // Send local cursor updates
    const disposable = editorRef.current.onDidChangeCursorSelection(() => {
      const sel = editorRef.current?.getSelection();
      if (sel) {
        provider.awareness.setLocalStateField("cursor", {
          anchor: sel.getStartPosition(),
          head: sel.getEndPosition(),
        });
      }
    });

    return () => {
      disposable.dispose();
      bindingRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [editorRef.current, joined]);

  /** -------- UI -------- */
  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "#1f2937",
          color: "white",
          zIndex: 10,
          flexShrink: 0,
          gap: 10,
        }}
      >
        {/* Room & User join */}
        {!joined ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #374151",
              }}
            />
            <input
              type="text"
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #374151",
              }}
            />
            <button
              onClick={() => setJoined(true)}
              style={{
                padding: "6px 12px",
                background: "#2563eb",
                color: "white",
                borderRadius: 6,
                fontWeight: "bold",
              }}
            >
              Join
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 14, fontWeight: "bold" }}>
            Room: {roomName} | You: {userName || "Anonymous"}
          </span>
        )}

        {/* Language & Theme & Run */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: "8px 10px",
              background: "#0f172a",
              color: "#fff",
              borderRadius: 6,
              border: "1px solid #374151",
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <button
            onClick={() => setTheme((t) => (t === "vs-dark" ? "light" : "vs-dark"))}
            style={{
              padding: "8px 16px",
              background: theme === "vs-dark" ? "#f3f4f6" : "#111827",
              color: theme === "vs-dark" ? "#111827" : "#fff",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
              border: "1px solid #374151",
            }}
          >
            {theme === "vs-dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button
            onClick={runCode}
            style={{
              padding: "6px 12px",
              background: "#16a34a",
              color: "white",
              borderRadius: 6,
              fontWeight: "bold",
            }}
          >
            ▶️ Run
          </button>
        </div>
      </div>

      {/* Active Users */}
      {joined && (
        <div
          style={{
            padding: "6px 16px",
            background: "#111827",
            color: "#fff",
            fontSize: 14,
          }}
        >
          Active users:{" "}
          {users.map((u, i) => (
            <span
              key={i}
              style={{
                marginRight: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: u?.color || "#555",
              }}
            >
              {u?.name || "Anonymous"}
            </span>
          ))}
        </div>
      )}

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={language}
          theme={theme}
          options={{ automaticLayout: true }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>

      {/* Output Panel */}
      {joined && (
        <div
          style={{
            background: "#111827",
            color: "white",
            padding: "10px",
            fontFamily: "monospace",
            height: "150px",
            overflow: "auto",
          }}
        >
          <strong>Output:</strong>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}
