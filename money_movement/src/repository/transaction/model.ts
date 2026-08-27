import { RowDataPacket } from "mysql2";

export type TxStatus = "pending" | "completed" | "reverted";

export interface ITransactionRow extends RowDataPacket {
    id: number;
    idempotency_key: string;

    from_user_id: string;
    to_user_id: string;

    // BIGINT, returned as string; convert via BigInt(...) before arithmetic
    amount: string;

    tx_status: TxStatus;

    created_at: Date;
    updated_at: Date;
}
