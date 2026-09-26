import "src/utils/logger";
import { withTransaction } from "src/database/withTransaction";
import { claimUnpublished } from "src/repository/outbox/claimUnpublished";
import { markPublished } from "src/repository/outbox/markPublished";
import type { KafkaTopicMessage } from "src/kafka/producer";

export type SendMessages = (messages: KafkaTopicMessage[]) => Promise<void>;

export async function pollOnce(sendMessages: SendMessages, batchSize: number): Promise<void> {
    await withTransaction(async (conn) => {
        const rows = await claimUnpublished(conn, batchSize);
        if (rows.length === 0) return;

        const messages: KafkaTopicMessage[] = rows.map((row) => {
            const value: any = {
                createdAt: row.created_at,
            };

            // For key-value style payload, load it into the value as it is.
            // For other types (arrays, string, numbers, etc.), add it under "info" key.
            if (typeof row.payload === "object" && !Array.isArray(row.payload)) {
                Object.assign(value, row.payload);
            } else {
                value.info = row.payload;
            }

            return {
                topic: row.topic,
                key: row.message_key,
                value: JSON.stringify(value),
            };
        });

        await sendMessages(messages);

        await markPublished(
            conn,
            rows.map((r) => r.id),
        );

        logger.info(`published ${rows.length} outbox events`);
    });
}
