import type { EachMessagePayload } from "kafkajs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { messageHandler } from "src/messageHandler";
import { insertLedgerEntries } from "src/repository/ledger/insertLedgerEntries";
import { ledgerRows, resetLedger } from "./helpers";

const A = "a@x.com";
const B = "b@x.com";
const AT = new Date("2026-09-22T10:00:00.000Z");

const entry = {
    transactionId: 1,
    fromUserId: A,
    toUserId: B,
    amount: 100n,
    transactionTimestamp: AT,
};

afterAll(() => dbPool.end());
beforeEach(() => resetLedger());

describe("insertLedgerEntries", () => {
    it("writes a debit for the sender and a credit for the recipient", async () => {
        await insertLedgerEntries(entry);

        expect(await ledgerRows()).toMatchObject([
            { transaction_id: 1, user_id: A, operation: "debit", amount: "100" },
            { transaction_id: 1, user_id: B, operation: "credit", amount: "100" },
        ]);
    });

    it("records the time of the payment (event time), not the time it was processed", async () => {
        await insertLedgerEntries(entry);

        const rows = await ledgerRows();
        expect(rows.map((r) => new Date(r.transaction_timestamp).getTime())).toEqual([
            AT.getTime(),
            AT.getTime(),
        ]);
    });

    it("is idempotent: redelivering the same event leaves exactly one debit and one credit", async () => {
        await insertLedgerEntries(entry);
        await insertLedgerEntries(entry);
        await insertLedgerEntries(entry);

        expect(await ledgerRows()).toHaveLength(2);
    });

    it("is idempotent under concurrent redelivery too", async () => {
        await Promise.all(Array.from({ length: 10 }, () => insertLedgerEntries(entry)));

        expect(await ledgerRows()).toHaveLength(2);
    });

    it("keeps different transactions between the same users apart", async () => {
        await insertLedgerEntries(entry);
        await insertLedgerEntries({ ...entry, transactionId: 2, amount: 50n });

        const rows = await ledgerRows();
        expect(rows).toHaveLength(4);
        expect(rows.filter((r) => r.transaction_id === 2).map((r) => r.amount)).toEqual([
            "50",
            "50",
        ]);
    });

    it("stores BIGINT amounts exactly", async () => {
        await insertLedgerEntries({ ...entry, amount: 9007199254740993n });

        expect((await ledgerRows()).map((r) => r.amount)).toEqual([
            "9007199254740993",
            "9007199254740993",
        ]);
    });

    it("is all-or-nothing: if the credit fails, the debit is rolled back too", async () => {
        // user_id is VARCHAR(255): the second insert (the credit) fails on this recipient
        await expect(
            insertLedgerEntries({ ...entry, toUserId: "z".repeat(300) }),
        ).rejects.toThrow();

        expect(await ledgerRows()).toHaveLength(0);
    });
});

describe("messageHandler (real database)", () => {
    const deliver = (event: object) =>
        messageHandler({
            message: { value: Buffer.from(JSON.stringify(event)) },
        } as unknown as EachMessagePayload);

    const event = {
        createdAt: AT.toISOString(),
        transactionId: 1,
        fromUserId: A,
        toUserId: B,
        amount: "100",
    };

    it("turns a Kafka event into a debit/credit pair", async () => {
        await deliver(event);

        expect(await ledgerRows()).toMatchObject([
            { transaction_id: 1, user_id: A, operation: "debit", amount: "100" },
            { transaction_id: 1, user_id: B, operation: "credit", amount: "100" },
        ]);
    });

    it("survives at-least-once delivery: the same event delivered twice is recorded once", async () => {
        await deliver(event);
        await deliver(event);

        expect(await ledgerRows()).toHaveLength(2);
    });

    it("writes nothing for a malformed event", async () => {
        await deliver({ ...event, amount: "-5" });

        expect(await ledgerRows()).toHaveLength(0);
    });
});
