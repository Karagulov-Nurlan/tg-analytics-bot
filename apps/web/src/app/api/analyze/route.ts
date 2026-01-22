import { query } from "@/db/pg";
import { openrouterGenerate } from "@/services/openrouter";
import { NextResponse } from "next/server";

type UserRow = {
  id: number;
  telegram_user_id: string | number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

type MsgRow = {
  text: string | null;
  created_at: string;
};

function buildPrompt(username: string, texts: string[]) {
  return (
    `Ты анализируешь сообщения пользователя из Telegram-чата.\n` +
    `Верни краткий структурированный анализ (на русском) по пунктам:\n` +
    `- Стиль (формальный/неформальный)\n` +
    `- Темы (3-6)\n` +
    `- Активность (когда чаще пишет — утро/день/вечер/ночь)\n` +
    `- Тональность (позитив/нейтр/негатив)\n` +
    `- Особенности речи\n` +
    `- Средняя длина сообщений (примерно)\n\n` +
    `Сообщения (последние ${texts.length}) пользователя @${username}:\n` +
    texts.map((t, i) => `${i + 1}) ${t}`).join("\n")
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = String(body?.username || "").trim();
  const username = raw.replace(/^@/, "");

  if (!username) {
    return NextResponse.json(
      { ok: false, error: "username is required" },
      { status: 400 },
    );
  }

  // 1) find user by username
  const u = await query<UserRow>(
    `SELECT id, telegram_user_id, username, first_name, last_name
     FROM users
     WHERE lower(username) = lower($1)
     LIMIT 1`,
    [username],
  );

  if (!u.rows.length) {
    return NextResponse.json(
      { ok: false, error: `User @${username} not found in DB` },
      { status: 404 },
    );
  }

  const user = u.rows[0];

  // 2) last messages by this user (across all chats)
  const m = await query<MsgRow>(
    `SELECT text, created_at
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE u.telegram_user_id = $1
     ORDER BY m.created_at DESC
     LIMIT 80`,
    [String(user.telegram_user_id)],
  );

  const texts = m.rows
    .map((r: MsgRow) => (r.text || "").trim().slice(0, 250))
    .filter(Boolean)
    .reverse();

  if (texts.length < 5) {
    return NextResponse.json(
      { ok: false, error: "Not enough messages for analysis" },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(username, texts);
  const ai = await openrouterGenerate(prompt);

  if (!ai.ok) {
    return NextResponse.json({ ok: false, error: ai.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    username,
    messages_used: texts.length,
    text: ai.text,
  });
}
