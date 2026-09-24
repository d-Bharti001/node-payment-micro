import type { RowDataPacket } from "mysql2";
import dbPool from "src/database/connection";
import { getBalance } from "src/handlers/balance/getBalance";
import { transact } from "src/handlers/transaction/transact";

export interface GrpcResult {
    err: any;
    res: any;
}

// Invokes a gRPC handler
function invoke(handler: any, request: Record<string, unknown>): Promise<GrpcResult> {
    return new Promise((resolve) => {
        handler({ request }, (err: any, res: any) => resolve({ err, res }));
    });
}

export const callTransact = (request: Record<string, unknown>) => invoke(transact, request);
export const callGetBalance = (userId: string) => invoke(getBalance, { userId });

// Truncates all tables and seeds the given balances
export async function resetDb(balances: Record<string, bigint> = {}) {
    await dbPool.query("TRUNCATE TABLE outbox");
    await dbPool.query("TRUNCATE TABLE transactions");
    await dbPool.query("TRUNCATE TABLE balances");
    for (const [userId, balance] of Object.entries(balances)) {
        await dbPool.execute("INSERT INTO balances (user_id, balance) VALUES (?, ?)", [
            userId,
            balance.toString(),
        ]);
    }
}

export async function balanceOf(userId: string): Promise<bigint> {
    const [rows] = await dbPool.query<RowDataPacket[]>(
        "SELECT balance FROM balances WHERE user_id = ?",
        [userId],
    );
    return BigInt(rows[0].balance);
}

export async function countRows(table: "transactions" | "outbox"): Promise<number> {
    const [rows] = await dbPool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(rows[0].n);
}
