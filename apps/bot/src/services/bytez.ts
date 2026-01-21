// apps/bot/src/services/bytez.ts
import Bytez from "bytez.js";

const apiKey = process.env.BYTEZ_API_KEY;
const modelName = process.env.BYTEZ_MODEL || "openai/gpt-4o";

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function bytezGenerate(prompt: string): Promise<AiResult> {
  if (!apiKey) return { ok: false, error: "BYTEZ_API_KEY is missing" };

  try {
    const sdk: any = new (Bytez as any)(apiKey);
    const model: any = sdk.model(modelName);

    // ВАЖНО: у bytez типы могут не содержать max_tokens, поэтому кастим params as any
    const res: any = await model.run(
      [{ role: "user", content: prompt }],
      { max_tokens: 512, temperature: 0.2 } as any
    );

    // bytez возвращает { error, output }
    if (res?.error) return { ok: false, error: String(res.error) };

    // output бывает строкой или объектом — приводим к строке
    const out = res?.output;
    const text =
      typeof out === "string" ? out : out?.text || JSON.stringify(out);

    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
