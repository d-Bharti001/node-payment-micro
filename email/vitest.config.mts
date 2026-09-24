import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// config.ts reads process.env at import time, so every test process needs these.
const baseEnv = {
    NODE_ENV: "test", // also silences the logger
    SENDER_EMAIL: "payments@test.local",
    KAFKA_BROKERS: "localhost:9092", // never connected to in tests
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
                    env: { ...baseEnv, SMTP_HOST: "127.0.0.1", SMTP_PORT: "1" },
                },
            },
            {
                extends: true,
                test: {
                    name: "integration",
                    include: ["tests/integration/**/*.test.ts"],
                    // SMTP_HOST / SMTP_PORT / MAILPIT_API_URL are set by globalSetup
                    globalSetup: ["tests/integration/globalSetup.ts"],
                    env: baseEnv,
                    fileParallelism: false, // one shared mailbox
                    testTimeout: 30_000,
                    hookTimeout: 120_000, // first run pulls the Mailpit image
                },
            },
        ],
    },
});
