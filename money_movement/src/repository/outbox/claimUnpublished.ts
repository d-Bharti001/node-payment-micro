import type { PoolConnection } from "mysql2/promise";

import { IOutboxRow } from "src/repository/outbox/model";

export async function claimUnpublished(conn: PoolConnection, limit: number): Promise<IOutboxRow[]> {
    const [rows] = await conn.execute<IOutboxRow[]>(
        `
            SELECT id, topic, message_key, payload, created_at, published_at
            FROM outbox
            WHERE published_at IS NULL
            ORDER BY id
            LIMIT ?
            FOR UPDATE SKIP LOCKED
        `,
        [limit],
    );

    return rows;
}
