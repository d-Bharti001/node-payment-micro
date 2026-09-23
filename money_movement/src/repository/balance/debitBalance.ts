import * as grpc from "@grpc/grpc-js";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import { getBalance } from "src/repository/balance/getBalance";
import { InsufficientBalanceError, ResourceNotFoundError } from "src/utils/errors";

// Atomic conditional debit: the balance check and the write happen as one
// statement, so there's no window between "check balance" and "subtract balance"
// for a concurrent debit to race through.
export async function debitBalance(
    conn: PoolConnection,
    userId: string,
    amount: bigint,
): Promise<void> {
    const [result] = await conn.execute<ResultSetHeader>(
        `
            UPDATE balances
            SET balance = balance - ?
            WHERE user_id = ? AND balance >= ?
        `,
        [amount, userId, amount],
    );

    if (result.affectedRows === 1) {
        return;
    }

    // In case of zero affected rows, check if the balance row actually exists.
    const balance = await getBalance(conn, userId);

    if (!balance) {
        throw new ResourceNotFoundError(
            grpc.status.NOT_FOUND,
            `balance not found for user "${userId}"`,
        );
    }

    // If the balance row existed, the only failing condition is
    // having an insufficient balance.
    throw new InsufficientBalanceError(`insufficient balance for user "${userId}"`);
}
