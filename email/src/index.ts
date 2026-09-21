import "src/utils/logger";
import { startConsumer, stopConsumer } from "src/kafka/consumer";
import { messageHandler } from "src/messageHandler";
import { closeSmtpTransporter, verifySmtpTransporter } from "src/mailer/transporter";

async function start() {
    logger.info("Starting email service...");
    try {
        logger.info("Verifying SMTP connection...");
        await verifySmtpTransporter();

        logger.info("Starting Kafka consumer...");
        await startConsumer(messageHandler);
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

    await stopConsumer();
    logger.info("Kafka consumer stopped.");

    closeSmtpTransporter();
    logger.info("SMTP transporter closed.");

    clearTimeout(forceExitTimeout);
    logger.info("System exited cleanly. Goodbye.");
    process.exit(signal ? 0 : 1);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
