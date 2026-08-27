import { RowDataPacket } from "mysql2";

export interface IBalanceRow extends RowDataPacket {
    user_id: string;

    // BIGINT, returned as string; convert via BigInt(...) before arithmetic
    balance: string;

    created_at: Date;
    updated_at: Date;
}
