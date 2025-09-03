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
  const [language, setLanguage] = useState<string>("javascript");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");

  useEffect(() => {
    if (!editorRef.current) return;

    const { provider, ydoc } = initYjs("monaco-room");
    const yText = ydoc.getText("monaco");

    const model = editorRef.current.getModel();
    if (model) {
      // Setup MonacoBinding
      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editorRef.current]),
        provider.awareness
      );
    }

    return () => {
      bindingRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [editorRef.current]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#1f2937", color: "white", zIndex: 10, flexShrink: 0 }}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: "8px 10px", background: "#0f172a", color: "#fff", borderRadius: 6, border: "1px solid #374151" }}
        >
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <button
          onClick={() => setTheme((t) => (t === "vs-dark" ? "light" : "vs-dark"))}
          style={{ padding: "8px 16px", background: theme === "vs-dark" ? "#f3f4f6" : "#111827", color: theme === "vs-dark" ? "#111827" : "#fff", borderRadius: 6, fontWeight: "bold", cursor: "pointer", border: "1px solid #374151", marginLeft: "auto" }}
        >
          {theme === "vs-dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
        

      </div>

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={language}
          theme={theme}
          options={{ automaticLayout: true }}
          onMount={(editor) => {
            editorRef.current = editor;
            // Ensure binding is initialized after editor mount
            const { provider, ydoc } = initYjs("monaco-room");
            const yText = ydoc.getText("monaco");
            const model = editor.getModel();
            if (model) {
              bindingRef.current = new MonacoBinding(
                yText,
                model,
                new Set([editor]),
                provider.awareness
              );
            }
          }}
        />
      </div>
    </div>
  );
}
