import { pg } from '../db/pg';

export type UserRow = {
  id: number;
  telegram_user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

export class UserModel {
  static async upsertTelegramUser(input: {
    telegramUserId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserRow> {
    const res = await pg.query<UserRow>(
      `
      INSERT INTO users (telegram_user_id, username, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_user_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name
      RETURNING id, telegram_user_id, username, first_name, last_name
      `,
      [input.telegramUserId, input.username ?? null, input.firstName ?? null, input.lastName ?? null]
    );
    return res.rows[0];
  }
}
