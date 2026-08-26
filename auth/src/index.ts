import grpc from "@grpc/grpc-js";
import "src/utils/logger";
import dbPool from "src/database/connection";
import { createGrpcServer } from "src/server";
import { GRPC_PORT } from "src/config/config";

let grpcServer: grpc.Server;

async function startServer() {
    logger.info("Starting auth service...");
    try {
        const conn = await dbPool.getConnection();
        conn.release();
        logger.info("Database connection established.");

        const grpcServerAddress = `0.0.0.0:${GRPC_PORT}`;
        grpcServer = await createGrpcServer();
        grpcServer.bindAsync(grpcServerAddress, grpc.ServerCredentials.createInsecure(), (err) => {
            if (err) {
                logger.error(`Failed to bind port: ${err.message}`);
                shutdown();
                return;
            }
            logger.info(`gRPC server running at ${grpcServerAddress}`);
        });
    } catch (err) {
        logger.error("Server failed to start :::", err);
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

    if (grpcServer) {
        logger.info("Stopping gRPC server...");
        try {
            await new Promise<void>((resolve, reject) => {
                grpcServer.tryShutdown((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
            logger.info("gRPC server stopped.");
        } catch (err) {
            logger.error("Error while closing gRPC server :::", err);
        }
    }

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

startServer();
