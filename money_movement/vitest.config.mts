import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const baseEnv = {
    NODE_ENV: "test",
    KAFKA_BROKERS: "localhost:9092",
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
                test: {
                    name: "unit",
                    include: ["tests/unit/**/*.test.ts"],
                    env: {
                        ...baseEnv,
                        MYSQL_HOST: "127.0.0.1",
                        MYSQL_PORT: "1",
                        MYSQL_DATABASE: "x",
                        MYSQL_USER: "x",
                        MYSQL_PASSWORD: "x",
                    },
                },
            },
            {
                extends: true,
                test: {
                    name: "integration",
                    include: ["tests/integration/**/*.test.ts"],
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
