import "src/utils/logger";
import { OUTBOX_POLL_INTERVAL_MS, OUTBOX_POLL_BATCH_SIZE } from "src/config/config";
import { withTransaction } from "src/database/withTransaction";
import { claimUnpublished } from "src/repository/outbox/claimUnpublished";
import { markPublished } from "src/repository/outbox/markPublished";
import type { KafkaTopicMessage } from "src/kafka/producer";
import { connectProducer, disconnectProducer, sendMessages } from "src/kafka/producer";

let scheduledPoll: ReturnType<typeof setTimeout>;
let pollPromise: Promise<void> | null = null;
let stopping = false;

async function pollOnce(): Promise<void> {
    await withTransaction(async (conn) => {
        const rows = await claimUnpublished(conn, OUTBOX_POLL_BATCH_SIZE);
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

async function pollLoop(): Promise<void> {
    if (stopping) return;

    const startAt = Date.now();

    pollPromise = pollOnce().catch((err) => logger.error(`Outbox relay error: ${err}`));
    await pollPromise;
    pollPromise = null;

    const endAt = Date.now();
    const elapsedMs = endAt - startAt;
    const delay = Math.max(0, OUTBOX_POLL_INTERVAL_MS - elapsedMs);

    scheduledPoll = setTimeout(pollLoop, delay);
}

async function start(): Promise<void> {
    logger.info("Starting outbox relay...");
    await connectProducer();

    pollLoop();

    logger.info(`Outbox relay polling every ${OUTBOX_POLL_INTERVAL_MS}ms`);
}

async function shutdown(signal: string): Promise<void> {
    stopping = true;
    logger.info(`Received ${signal}. Shutting down outbox relay...`);

    clearTimeout(scheduledPoll);
    if (pollPromise) await pollPromise;
    await disconnectProducer();

    process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
