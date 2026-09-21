import "src/utils/logger";
import dbPool from "src/database/connection";
import { startConsumer, stopConsumer } from "src/consumer";

async function start() {
    logger.info("Starting ledger service...");
    try {
        logger.info("Establishing database connection...");
        const conn = await dbPool.getConnection();
        conn.release();

        logger.info("Starting Kafka consumer...");
        await startConsumer();
    } catch (err) {
        logger.error("Service failed to start :::", err);
        shutdown();
    }
}

async function shutdown(signal?: string) {
    if (signal) {
        logger.info(`Received ${signal}. Gracefully shutting down...`);
    } else {
        logger.warn(
            "Application encountered a critical startup error. Invoking graceful shutdown...",
        );
    }

    const forceExitTimeout = setTimeout(() => {
        logger.error("Graceful shutdown timed out. Forcing process termination.");
        process.exit(1);
    }, 10000);

    logger.info("Stopping Kafka consumer...");
    await stopConsumer();
    logger.info("Kafka consumer stopped.");

    if (dbPool) {
        logger.info("Closing database connections...");
        try {
            await dbPool.end();
            logger.info("Database connection pool closed.");
        } catch (err) {
            logger.error("Error while closing database pool :::", err);
        }
    }

    clearTimeout(forceExitTimeout);
    logger.info("System exited cleanly. Goodbye.");
    process.exit(signal ? 0 : 1);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
