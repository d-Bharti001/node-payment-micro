import type { PoolConnection } from "mysql2/promise";

import { ITransactionRow } from "src/repository/transaction/model";

export async function getByIdempotencyKey(
    conn: PoolConnection,
    fromUserId: string,
    idempotencyKey: string,
): Promise<ITransactionRow | null> {
    const [rows] = await conn.execute<ITransactionRow[]>(
        `
            SELECT
                id,
                idempotency_key,
                from_user_id,
                to_user_id,
                amount,
                tx_status,
                created_at,
                updated_at
            FROM
                transactions
            WHERE
                from_user_id = ? AND idempotency_key = ?
        `,
        [fromUserId, idempotencyKey],
    );

    return rows[0] ?? null;
}
