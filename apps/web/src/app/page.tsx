"use client";

import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function run() {
    setLoading(true);
    setError("");
    setResult("");

    const startedAt = Date.now();

    try {
      console.log("[analyze] sending:", { username });

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const raw = await res.text();
      const ms = Date.now() - startedAt;

      console.log("[analyze] response:", {
        status: res.status,
        ok: res.ok,
        timeMs: ms,
        contentType: res.headers.get("content-type"),
        rawPreview: raw.slice(0, 300),
      });

      // Пустой ответ — сразу понятная ошибка
      if (!raw || raw.trim().length === 0) {
        throw new Error(`API returned empty body (status ${res.status})`);
      }

      // Пробуем распарсить JSON
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        // Если вернулся HTML ошибки (например Next error page) — это покажем
        throw new Error(
          `API returned non-JSON (status ${res.status}). First 300 chars:\n${raw.slice(0, 300)}`
        );
      }

      console.log("[analyze] parsed json:", data);

      // Если сервер сказал ok:false
      if (data?.ok === false) {
        setError(String(data?.error || "Unknown API error"));
        return;
      }

      // Если сервер вернул не то, что ожидаем
      if (typeof data?.text !== "string") {
        throw new Error(`API JSON has no "text" string. Got: ${JSON.stringify(data).slice(0, 300)}`);
      }

      setResult(data.text);
    } catch (e: any) {
      console.error("[analyze] failed:", e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>
        Chat Analytics — User Analyze
      </h1>
      <p style={{ opacity: 0.8 }}>
        Введи username пользователя из Telegram (например: <b>@Nurlan231</b>) и
        получи анализ.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Анализ..." : "Анализировать"}
        </button>
      </div>

      {error && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff1f1",
            border: "1px solid #ffcccc",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </pre>
      )}

      {result && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f7f7f7",
            border: "1px solid #eee",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {result}
        </pre>
      )}
    </main>
  );
}
