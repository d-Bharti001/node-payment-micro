import dbPool from "src/database/connection";
import { IUserRow } from "./model";
import { ResourceNotFoundError } from "src/utils/errors";

export async function getUserByUserId(userId: string): Promise<IUserRow> {
    const query = `
        SELECT seq_id, user_id, password_hashed, created_at
        FROM users
        WHERE user_id = ?
    `;

    const [results] = await dbPool.execute(query, [userId]);

    const user = (results as IUserRow[])[0];
    if (!user) {
        throw new ResourceNotFoundError("User not found");
    }

    return user;
}
