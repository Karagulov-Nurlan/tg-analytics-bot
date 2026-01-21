import { pg } from "../db/pg";

export class MessageModel {
  static async insertMessage(input: {
    chatId: number;
    userId: number;
    telegramMessageId: number;
    text: string;
    createdAt: Date;
  }): Promise<void> {
    await pg.query(
      `
      INSERT INTO messages (chat_id, user_id, telegram_message_id, text, created_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        input.chatId,
        input.userId,
        input.telegramMessageId,
        input.text,
        input.createdAt,
      ],
    );
  }
  static async lastMessagesByUser(
    telegramChatId: number,
    telegramUserId: number,
    limit = 80,
  ) {
    const res = await pg.query(
      `
      SELECT m.text, m.created_at
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      JOIN users u ON u.id = m.user_id
      WHERE c.telegram_chat_id = $1
        AND u.telegram_user_id = $2
        AND m.text IS NOT NULL
      ORDER BY m.created_at DESC
      LIMIT $3
      `,
      [telegramChatId, telegramUserId, limit],
    );

    return res.rows.reverse();
  }
}
