import type { PoolConnection } from "mysql2/promise";

import { IBalanceRow } from "src/repository/balance/model";

export async function getBalance(
    conn: PoolConnection,
    userId: string,
): Promise<IBalanceRow | null> {
    const [rows] = await conn.execute<IBalanceRow[]>(
        `
            SELECT user_id, balance, created_at, updated_at
            FROM balances WHERE user_id = ?
        `,
        [userId],
    );

    return rows[0] ?? null;
}
