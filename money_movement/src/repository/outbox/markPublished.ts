import type { PoolConnection } from "mysql2/promise";

export async function markPublished(conn: PoolConnection, ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    await conn.query(
        `
            UPDATE outbox
            SET published_at = NOW()
            WHERE id IN (?)
        `,
        [ids],
    );
}
