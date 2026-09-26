import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// config.ts reads process.env at import time, so every test process needs these.
const baseEnv = {
    NODE_ENV: "test", // also silences the logger
};

export default defineConfig({
    resolve: {
        alias: {
            src: fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    include: ["tests/unit/**/*.test.ts"],
                    env: {
                        ...baseEnv,
                        KAFKA_BROKERS: "localhost:9092", // never connected to in tests
                        MYSQL_HOST: "127.0.0.1",
                        MYSQL_PORT: "1",
                        MYSQL_DATABASE: "unused",
                        MYSQL_USER: "unused",
                        MYSQL_PASSWORD: "unused",
                    },
                },
            },
            {
                extends: true,
                test: {
                    name: "integration",
                    include: ["tests/integration/**/*.test.ts"],
                    // MYSQL_* are set by globalSetup once the container is up
                    globalSetup: ["tests/integration/globalSetup.ts"],
                    env: baseEnv,
                    fileParallelism: false, // one shared DB
                    testTimeout: 30_000,
                    hookTimeout: 120_000, // first run pulls mysql:8.4
                },
            },
        ],
    },
});
