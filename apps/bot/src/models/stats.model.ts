import { pg } from '../db/pg';

export type TopUserRow = {
  telegram_user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  cnt: string; // pg COUNT приходит строкой
};

export class StatsModel {
  static async topUsersAllTime(chatTelegramId: number): Promise<TopUserRow[]> {
    const res = await pg.query<TopUserRow>(
      `
      SELECT
        u.telegram_user_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(*)::text AS cnt
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      JOIN users u ON u.id = m.user_id
      WHERE c.telegram_chat_id = $1
      GROUP BY u.telegram_user_id, u.username, u.first_name, u.last_name
      ORDER BY COUNT(*) DESC
      LIMIT 10
      `,
      [chatTelegramId]
    );
    return res.rows;
  }

  static async totalMessagesAndUsers(chatTelegramId: number): Promise<{ total_messages: number; total_users: number }> {
    const res = await pg.query<{ total_messages: string; total_users: string }>(
      `
      SELECT
        COUNT(*)::text AS total_messages,
        COUNT(DISTINCT m.user_id)::text AS total_users
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE c.telegram_chat_id = $1
      `,
      [chatTelegramId]
    );
    return {
      total_messages: Number(res.rows[0]?.total_messages ?? 0),
      total_users: Number(res.rows[0]?.total_users ?? 0),
    };
  }
}
