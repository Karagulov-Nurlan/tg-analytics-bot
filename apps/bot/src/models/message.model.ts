import { pg } from '../db/pg';

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
      [input.chatId, input.userId, input.telegramMessageId, input.text, input.createdAt]
    );
  }
}
