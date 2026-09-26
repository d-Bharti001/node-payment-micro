import "src/utils/logger";
import { OUTBOX_POLL_INTERVAL_MS, OUTBOX_POLL_BATCH_SIZE } from "src/config/config";
import { connectProducer, disconnectProducer, sendMessages } from "src/kafka/producer";
import { pollOnce } from "src/outbox/pollOnce";

let scheduledPoll: ReturnType<typeof setTimeout>;
let pollPromise: Promise<void> | null = null;
let stopping = false;

async function pollLoop(): Promise<void> {
    if (stopping) return;

    const startAt = Date.now();

    pollPromise = pollOnce(sendMessages, OUTBOX_POLL_BATCH_SIZE).catch((err) =>
        logger.error(`Outbox relay error: ${err}`),
    );
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
