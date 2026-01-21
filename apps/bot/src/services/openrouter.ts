// src/services/openrouter.ts
export async function openrouterGenerate(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"; // или другой
  if (!apiKey) return { ok: false as const, error: "OPENROUTER_API_KEY missing" };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000); // 15 сек

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // полезно (не обязательно)
        "HTTP-Referer": "http://localhost",
        "X-Title": "tg-analytics-bot",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          { role: "system", content: "You are a concise analyst. Respond in Russian. No fluff." },
          { role: "user", content: prompt }
        ],
      }),
    });

    const data = await r.json();
    if (!r.ok) return { ok: false as const, error: data?.error?.message || `HTTP ${r.status}` };

    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    return { ok: true as const, text };
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "timeout" : (e?.message || String(e));
    return { ok: false as const, error: msg };
  } finally {
    clearTimeout(t);
  }
}
