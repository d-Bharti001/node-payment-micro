import * as grpc from "@grpc/grpc-js";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import { ResourceNotFoundError } from "src/utils/errors";

// Atomic credit to the recipient's balance
export async function creditBalance(
    conn: PoolConnection,
    userId: string,
    amount: bigint,
): Promise<void> {
    const [result] = await conn.execute<ResultSetHeader>(
        `
            UPDATE balances
            SET balance = balance + ?
            WHERE user_id = ?
        `,
        [amount, userId],
    );

    if (result.affectedRows === 1) {
        return;
    }

    throw new ResourceNotFoundError(
        grpc.status.NOT_FOUND,
        `balance not found for user "${userId}"`,
    );
}
