import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeMessages(input: {
  usernameOrName: string;
  messages: string[];
}) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
Ты анализируешь сообщения пользователя из группового чата.
Верни результат СТРОГО в JSON (без markdown), поля:

style: string
topics: string[]
avg_length: number
activity: string
sentiment: string
notes: string
sample_size: number

Пользователь: ${input.usernameOrName}
Сообщения:
${input.messages.map((m) => `- ${m}`).join("\n")}
`.trim();

  const res = await model.generateContent(prompt);
  return res.response.text();
}
