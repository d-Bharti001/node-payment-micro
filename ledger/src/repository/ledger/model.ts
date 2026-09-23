import { RowDataPacket } from "mysql2";

export type TransactionOperation = "debit" | "credit";

export interface ILedgerRow extends RowDataPacket {
    id: number;
    transaction_id: number;
    user_id: string;
    operation: TransactionOperation;
    amount: string; // BIGINT
    transaction_timestamp: Date;
    created_at: Date;
}
