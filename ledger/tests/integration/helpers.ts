import type { RowDataPacket } from "mysql2";
import dbPool from "src/database/connection";

export const resetLedger = () => dbPool.query("TRUNCATE TABLE ledger");

export async function ledgerRows() {
    const [rows] = await dbPool.query<RowDataPacket[]>(
        `SELECT transaction_id, user_id, operation, amount, transaction_timestamp
         FROM ledger ORDER BY id`,
    );
    return rows;
}
