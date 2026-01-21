import { pg } from '../db/pg';

export type ChatRow = {
  id: number;
  telegram_chat_id: string;
  title: string | null;
};

export class ChatModel {
  static async upsertTelegramChat(telegramChatId: number, title: string | null): Promise<ChatRow> {
    const res = await pg.query<ChatRow>(
      `
      INSERT INTO chats (telegram_chat_id, title)
      VALUES ($1, $2)
      ON CONFLICT (telegram_chat_id)
      DO UPDATE SET title = EXCLUDED.title
      RETURNING id, telegram_chat_id, title
      `,
      [telegramChatId, title]
    );
    return res.rows[0];
  }
}
