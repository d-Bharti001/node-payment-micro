import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// config.ts reads process.env at import time, so every test process needs these.
const env = {
    NODE_ENV: "test", // also silences the logger
    SERVER_PORT: "1337",
    AUTH_GRPC_HOSTNAME: "localhost",
    AUTH_GRPC_PORT: "9000",
    MONEY_MOVEMENT_GRPC_HOSTNAME: "localhost",
    MONEY_MOVEMENT_GRPC_PORT: "9001",
};

export default defineConfig({
    resolve: {
        alias: {
            src: fileURLToPath(new URL("./src", import.meta.url)),
            proto: fileURLToPath(new URL("./proto", import.meta.url)),
        },
    },
    test: {
        projects: [
            {
                extends: true,
                test: { name: "unit", include: ["tests/unit/**/*.test.ts"], env },
            },
            {
                // The whole HTTP layer through the real Express app, with only the two gRPC
                // clients replaced by fakes. No containers are needed.
                extends: true,
                test: { name: "integration", include: ["tests/integration/**/*.test.ts"], env },
            },
        ],
    },
});
