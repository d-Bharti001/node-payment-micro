import type { TransactionOperation } from "src/repository/ledger/model";
import { withTransaction } from "src/database/withTransaction";

export interface InsertLedgerEntryParams {
    transactionId: number;
    fromUserId: string;
    toUserId: string;
    amount: bigint;
    transactionTimestamp: Date;
}

export async function insertLedgerEntries({
    transactionId,
    fromUserId,
    toUserId,
    amount,
    transactionTimestamp,
}: InsertLedgerEntryParams): Promise<void> {
    const query = `
        INSERT INTO ledger (transaction_id, user_id, operation, amount, transaction_timestamp)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY
        UPDATE transaction_id = transaction_id
    `;

    const debit: TransactionOperation = "debit";
    const credit: TransactionOperation = "credit";

    await withTransaction(async (conn) => {
        await conn.execute(query, [transactionId, fromUserId, debit, amount, transactionTimestamp]);
        await conn.execute(query, [transactionId, toUserId, credit, amount, transactionTimestamp]);
    });
}
