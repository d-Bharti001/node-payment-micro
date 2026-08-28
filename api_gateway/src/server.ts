import http from "http";
import "src/utils/logger";
import { SERVER_PORT } from "src/config/config";
import app from "src/app";

let httpServer: ReturnType<typeof http.createServer>;

async function startServer() {
    httpServer = http.createServer(app);
    httpServer.listen(SERVER_PORT, () => {
        logger.info(`API Gateway running at port ${SERVER_PORT}`);
    });
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

    if (httpServer) {
        logger.info("Stopping HTTP server...");
        await new Promise<void>((resolve) => {
            httpServer.close(() => {
                resolve();
            });
        });
        logger.info("HTTP server stopped.");
    }

    clearTimeout(forceExitTimeout);
    logger.info("System exited cleanly. Goodbye.");
    process.exit(signal ? 0 : 1);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
