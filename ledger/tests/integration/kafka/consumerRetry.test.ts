import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { startConsumer, stopConsumer } from "src/kafka/consumer";
import { messageHandler } from "src/messageHandler";
import { ledgerRows, resetLedger } from "../helpers";
import { event, publish, waitFor } from "./helpers";

// The handler fails the first time it sees the message with key "5", then behaves normally.
let attemptsForKey5 = 0;

beforeAll(() =>
    startConsumer(async (payload) => {
        if (payload.message.key?.toString() === "5" && ++attemptsForKey5 === 1) {
            throw new Error("message rejected for testing");
        }
        return messageHandler(payload);
    }),
);

afterAll(async () => {
    await stopConsumer();
    await dbPool.end();
});

beforeEach(() => resetLedger());

it("delivers a message again when its handler failed", async () => {
    await publish("5", event(5));

    const rows = await waitFor(async () => {
        const found = (await ledgerRows()).filter((r) => r.transaction_id === 5);
        return found.length >= 2 ? found : null;
    }, "the ledger rows of transaction 5");

    expect(rows).toHaveLength(2);
    expect(attemptsForKey5).toBe(2); // one failed attempt, then the retry that worked
});
