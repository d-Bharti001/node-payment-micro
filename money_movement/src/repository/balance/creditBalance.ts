import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

// Atomic upsert credit: creates the recipient's balance row if this is their
// first-ever incoming payment (e.g. a merchant account that's never been
// seeded), or atomically adds to it if the row already exists - either way,
// one statement, no separate existence check/race window.
export async function creditBalance(
    conn: PoolConnection,
    userId: string,
    amount: bigint,
): Promise<void> {
    await conn.execute<ResultSetHeader>(
        `
            INSERT INTO balances (user_id, balance)
            VALUES (?, ?) AS new_balance
            ON DUPLICATE KEY
            UPDATE balance = balance + new_balance.balance
        `,
        [userId, amount],
    );
}
