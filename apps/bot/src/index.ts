import { ChatModel } from "./models/chat.model";
import { UserModel } from "./models/user.model";
import { MessageModel } from "./models/message.model";
import { StatsModel } from "./models/stats.model";
import { Markup } from "telegraf";

import { Telegraf } from "telegraf";
import "dotenv/config";

function sinceFromPreset(
  preset: "all" | "day" | "week" | "month",
): Date | null {
  const now = new Date();
  if (preset === "all") return null;
  const d = new Date(now);
  if (preset === "day") d.setDate(now.getDate() - 1);
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

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing");

const bot = new Telegraf(token);

bot.command("ping", (ctx) => ctx.reply("pong ✅"));

bot.command("stats", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = await buildStatsText(chatId, "all");
  await ctx.reply(text, statsKeyboard());
});

bot.action(/^stats:(day|week|month|all)$/, async (ctx) => {
  const preset = ctx.match[1] as "day" | "week" | "month" | "all";
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = await buildStatsText(chatId, preset);
  await ctx.editMessageText(text, statsKeyboard());
  await ctx.answerCbQuery(); // убирает "часики" у кнопки
});

bot.on("text", async (ctx) => {
  try {
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

    console.log("[saved]", { chatId: chatRow.id, userId: userRow.id });
  } catch (e) {
    console.error("save failed", e);
  }
});

bot.launch().then(() => console.log("Bot started ✅"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
