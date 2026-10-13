import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { startConsumer, stopConsumer } from "src/kafka/consumer";
import { messageHandler } from "src/messageHandler";
import { ledgerRows, resetLedger } from "../helpers";
import { event, publish, waitFor } from "./helpers";

beforeAll(() => startConsumer(messageHandler));
afterAll(async () => {
    await stopConsumer();
    await dbPool.end();
});

beforeEach(() => resetLedger());

const rowsFor = async (transactionId: number) =>
    (await ledgerRows()).filter((r) => r.transaction_id === transactionId);

// Waits until the consumer has written the ledger rows for the transaction.
const waitForRows = (transactionId: number) =>
    waitFor(async () => {
        const rows = await rowsFor(transactionId);
        return rows.length >= 2 ? rows : null;
    }, `the ledger rows of transaction ${transactionId}`);

describe("ledger consumer (real Kafka)", () => {
    it("turns a Kafka event into a debit and a credit", async () => {
        await publish("1", event(1));

        expect(await waitForRows(1)).toMatchObject([
            { operation: "debit", user_id: "buyer@email.com", amount: "100" },
            { operation: "credit", user_id: "georgio@email.com", amount: "100" },
        ]);
    });

    it("records a redelivered event once", async () => {
        // Same key, so the same partition and this exact order.
        // Event 3 is a sentinel: once its rows exist, both copies of
        // event 2 have certainly been handled.
        await publish("2", event(2), event(2), event(3));
        await waitForRows(3);

        expect(await rowsFor(2)).toHaveLength(2);
    });

    it("skips a malformed message without blocking the ones after it", async () => {
        await publish("4", "not json {{", event(4, { amount: "-5" }), event(5));
        await waitForRows(5);

        expect(await rowsFor(4)).toHaveLength(0);
    });
});
