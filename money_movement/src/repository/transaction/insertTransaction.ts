import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import type { TxStatus } from "src/repository/transaction/model";

// A row can only ever be created as 'pending' or 'completed'.
// 'reverted' is only ever reachable later, via an UPDATE on an
// existing row (a different function entirely).
export type InitialTxStatus = Extract<TxStatus, "pending" | "completed">;

export interface InsertTransactionParams {
    idempotencyKey: string;
    fromUserId: string;
    toUserId: string;
    amount: bigint;
    status: InitialTxStatus;
}

// This INSERT is the idempotency guard:
// the UNIQUE (from_user_id, idempotency_key) constraint is what atomically
// decides "new request" vs "replay".
// See transact.ts for how a duplicate-key error here is handled.
export async function insertTransaction(
    conn: PoolConnection,
    { idempotencyKey, fromUserId, toUserId, amount, status }: InsertTransactionParams,
): Promise<number> {
    const [result] = await conn.execute<ResultSetHeader>(
        `
            INSERT INTO transactions (
                idempotency_key,
                from_user_id,
                to_user_id,
                amount,
                tx_status
            )
            VALUES (?, ?, ?, ?, ?)
        `,
        [idempotencyKey, fromUserId, toUserId, amount, status],
    );

    return result.insertId;
}
