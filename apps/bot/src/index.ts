import { ChatModel } from "./models/chat.model";
import { UserModel } from "./models/user.model";
import { MessageModel } from "./models/message.model";
import { StatsModel } from "./models/stats.model";
import { Markup } from "telegraf";
import { redis } from "./db/redis";
import { openrouterGenerate } from "./services/openrouter";

import { localAnalyze } from "./services/localAnalyze";
import { Telegraf } from "telegraf";
import "dotenv/config";

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 1200);

function statsCacheKey(
  chatId: number,
  preset: "all" | "day" | "week" | "month",
) {
  return `stats:${chatId}:${preset}`;
}

async function buildStatsTextCached(
  chatId: number,
  preset: "all" | "day" | "week" | "month",
) {
  const key = statsCacheKey(chatId, preset);

  const cached = await redis.get(key);
  if (cached) {
    console.log("[cache hit]", key);
    return cached;
  }

  console.log("[cache miss]", key);
  const text = await buildStatsText(chatId, preset);

  await redis.set(key, text, "EX", CACHE_TTL_SECONDS);
  return text;
}

function sinceFromPreset(
  preset: "all" | "day" | "week" | "month",
): Date | null {
  const now = new Date();
  if (preset === "all") return null;
  const d = new Date(now);
  if (preset === "day") {
    d.setHours(0, 0, 0, 0);
  }

  if (preset === "week") d.setDate(now.getDate() - 7);
  if (preset === "month") d.setMonth(now.getMonth() - 1);
  return d;
}

function labelFromPreset(preset: "all" | "day" | "week" | "month"): string {
  if (preset === "day") return "за сегодня";
  if (preset === "week") return "за неделю";
  if (preset === "month") return "за месяц";
  return "за всё время";
}

async function buildStatsText(
  chatId: number,
  preset: "all" | "day" | "week" | "month",
) {
  const since = sinceFromPreset(preset);
  const top = await StatsModel.topUsers(chatId, since);
  const totals = await StatsModel.totals(chatId, since);

  const lines = top.map((r, i) => {
    const name = r.username
      ? `@${r.username}`
      : [r.first_name, r.last_name].filter(Boolean).join(" ") ||
        `id:${r.telegram_user_id}`;
    return `${i + 1}. ${name} - ${Number(r.cnt)} сообщений`;
  });

  return (
    `Статистика чата ${labelFromPreset(preset)}:\n\n` +
    (lines.length ? lines.join("\n") : "Пока нет данных") +
    `\n\nВсего: ${totals.total_messages} сообщений от ${totals.total_users} пользователей`
  );
}

function statsKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("За сегодня", "stats:day"),
      Markup.button.callback("За неделю", "stats:week"),
    ],
    [
      Markup.button.callback("За месяц", "stats:month"),
      Markup.button.callback("За всё время", "stats:all"),
    ],
  ]);
}
function chunkText(s: string, size = 3500) {
  const chunks: string[] = [];
  for (let i = 0; i < s.length; i += size) chunks.push(s.slice(i, i + size));
  return chunks;
}

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing");

const bot = new Telegraf(token);

bot.command("ping", (ctx) => ctx.reply("pong ✅"));

bot.command("analyze", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  // /analyze @username
  const arg = ctx.message.text.split(" ").slice(1).join(" ").trim();

  let user = null as any;

  if (arg.startsWith("@")) {
    user = await UserModel.findByUsername(arg);
  }

  // /analyze reply
  if (!user && ctx.message.reply_to_message?.from?.id) {
    user = await UserModel.findByTelegramUserId(
      ctx.message.reply_to_message.from.id,
    );
  }

  if (!user) {
    await ctx.reply(
      "Используй: /analyze @username или reply на сообщение + /analyze",
    );
    return;
  }

  const rows = await MessageModel.lastMessagesByUser(
    chatId,
    user.telegram_user_id,
    80,
  );
  const texts = rows.map((r: any) => r.text).filter(Boolean);

  if (!texts.length) {
    await ctx.reply("Нет сообщений этого пользователя в базе.");
    return;
  }

  await ctx.reply("⏳ Анализирую... (это может занять до 15-30 сек)");
  await ctx.sendChatAction("typing");

  const prompt =
    `Ты анализируешь сообщения ОДНОГО пользователя из Telegram-чата.\n` +
    `Ответь ТОЛЬКО на русском и ТОЛЬКО в формате:\n` +
    `Стиль: ...\n` +
    `Темы: ... (3-6 через запятую)\n` +
    `Активность: ... (утро/день/вечер/ночь)\n` +
    `Тональность: ... (позитив/нейтр/негатив)\n` +
    `Средняя длина: ... (примерно, в словах)\n` +
    `Особенности: ... (1-2 предложения)\n` +
    `Основано на: N сообщений за последние M дней\n\n` +
    `Ограничения:\n` +
    `- максимум 1200 символов\n` +
    `- без markdown, без списков, без жирного текста\n` +
    `- не обрывай ответ, обязательно закончи строкой "Основано на: ..."\n\n` +
    `Данные:\n` +
    `N=${texts.length}\n` +
    `Сообщения:\n` +
    texts
      .slice(0, 60)
      .map((t, i) => `${i + 1}. ${t}`)
      .join("\n");

  const ai = await openrouterGenerate(prompt);

  if (ai.ok) {
    const header = `Анализ пользователя @${user.username || "unknown"}\n\n`;
    for (const part of chunkText(header + ai.text)) {
      await ctx.reply(part);
    }
    return;
  }

  // 2) fallback: локальный анализ
  const local = localAnalyze(texts);
  await ctx.reply(
    `AI временно недоступен (${ai.error}). Показываю упрощённый анализ.\n\n` +
      `Сообщений: ${local.total_messages}\n` +
      `Средняя длина: ${local.avg_length}\n` +
      `Топ слова: ${local.top_words.join(", ")}`,
  );
});

bot.command("stats", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = await buildStatsTextCached(chatId, "all");
  await ctx.reply(text, statsKeyboard());
});

bot.action(/^stats:(day|week|month|all)$/, async (ctx) => {
  const preset = ctx.match[1] as "day" | "week" | "month" | "all";
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = await buildStatsTextCached(chatId, preset);

  try {
    await ctx.editMessageText(text, statsKeyboard());
  } catch (e: any) {
    const msg = String(e?.description || e?.message || e);
    if (!msg.includes("message is not modified")) throw e;
    // просто игнорируем, потому что текст не поменялся
  } finally {
    await ctx.answerCbQuery();
  }
});

bot.on("text", async (ctx) => {
  try {
    const text = ctx.message.text?.toLowerCase();

    if (text === "hi ai") {
      await ctx.reply("👋 Hi! I’m alive.");
    }

    const chat = ctx.chat;
    const from = ctx.from;
    if (!from) return;

    const chatTitle = (chat as any).title ?? null;

    const chatRow = await ChatModel.upsertTelegramChat(chat.id, chatTitle);

    const userRow = await UserModel.upsertTelegramUser({
      telegramUserId: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    const createdAt = new Date(ctx.message.date * 1000);

    await MessageModel.insertMessage({
      chatId: chatRow.id,
      userId: userRow.id,
      telegramMessageId: ctx.message.message_id,
      text: ctx.message.text,
      createdAt,
    });

    await redis.del(
      statsCacheKey(ctx.chat.id, "all"),
      statsCacheKey(ctx.chat.id, "day"),
      statsCacheKey(ctx.chat.id, "week"),
      statsCacheKey(ctx.chat.id, "month"),
    );

    console.log("[saved]", { chatId: chatRow.id, userId: userRow.id });
  } catch (e) {
    console.error("save failed", e);
  }
});

bot.launch().then(() => console.log("Bot started ✅"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
