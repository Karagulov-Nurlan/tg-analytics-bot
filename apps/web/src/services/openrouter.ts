export async function openrouterGenerate(prompt: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  if (!apiKey) return { ok: false, error: "OPENROUTER_API_KEY is missing" };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      const msg = data?.error?.message || `${r.status} ${r.statusText}`;
      return { ok: false, error: msg };
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "Empty response from model" };
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}
