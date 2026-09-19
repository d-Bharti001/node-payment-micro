import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import { KAFKA_TOPIC } from "src/config/config";

export interface InsertOutboxEventParams {
    key: string;
    payload: unknown;
}

export async function insertOutboxEvent(
    conn: PoolConnection,
    { key, payload }: InsertOutboxEventParams,
): Promise<void> {
    await conn.execute<ResultSetHeader>(
        `
            INSERT INTO outbox (topic, message_key, payload)
            VALUES (?, ?, ?)
        `,
        [KAFKA_TOPIC, key, JSON.stringify(payload)],
    );
}
