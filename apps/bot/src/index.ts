import { ChatModel } from './models/chat.model';
import { UserModel } from './models/user.model';
import { MessageModel } from './models/message.model';
import { StatsModel } from './models/stats.model';


import { Telegraf } from 'telegraf';
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is missing');

const bot = new Telegraf(token);

bot.command('ping', (ctx) => ctx.reply('pong ✅'));

bot.on('text', async (ctx) => {
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

    console.log('[saved]', { chatId: chatRow.id, userId: userRow.id });
  } catch (e) {
    console.error('save failed', e);
  }
});

bot.command('stats', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const top = await StatsModel.topUsersAllTime(chatId);
  const totals = await StatsModel.totalMessagesAndUsers(chatId);

  const lines = top.map((r, i) => {
    const name =
      r.username ? `@${r.username}` :
      [r.first_name, r.last_name].filter(Boolean).join(' ') || `id:${r.telegram_user_id}`;
    return `${i + 1}. ${name} - ${Number(r.cnt)} сообщений`;
  });

  const text =
    `Статистика чата за всё время:\n\n` +
    (lines.length ? lines.join('\n') : 'Пока нет данных') +
    `\n\nВсего: ${totals.total_messages} сообщений от ${totals.total_users} пользователей`;

  await ctx.reply(text);
});


bot.launch().then(() => console.log('Bot started ✅'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
