import type { EachMessagePayload } from "kafkajs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageHandler } from "src/messageHandler";
import { insertLedgerEntries } from "src/repository/ledger/insertLedgerEntries";

vi.mock("src/repository/ledger/insertLedgerEntries", () => ({ insertLedgerEntries: vi.fn() }));

// The shape money_movement's outbox relay publishes: { createdAt, ...outbox payload }.
const validEvent = {
    createdAt: "2026-09-22T10:00:00.000Z",
    transactionId: 7,
    fromUserId: "a@x.com",
    toUserId: "b@x.com",
    amount: "100",
};

function deliver(value: unknown) {
    const raw =
        value === null
            ? null
            : Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
    return messageHandler({ message: { value: raw } } as unknown as EachMessagePayload);
}

beforeEach(() => {
    vi.mocked(insertLedgerEntries).mockReset();
});

describe("messageHandler: valid events", () => {
    it("decodes the event and writes it to the ledger", async () => {
        await deliver(validEvent);

        expect(insertLedgerEntries).toHaveBeenCalledOnce();
        expect(insertLedgerEntries).toHaveBeenCalledWith({
            transactionId: 7,
            fromUserId: "a@x.com",
            toUserId: "b@x.com",
            amount: 100n,
            transactionTimestamp: new Date("2026-09-22T10:00:00.000Z"),
        });
    });

    it("keeps amounts beyond Number.MAX_SAFE_INTEGER exact", async () => {
        await deliver({ ...validEvent, amount: "9007199254740993" });

        expect(vi.mocked(insertLedgerEntries).mock.calls[0][0].amount).toBe(9007199254740993n);
    });
});

describe("messageHandler: malformed events are skipped, not retried", () => {
    // Throwing would make kafkajs retry the same message forever, so a poison message must
    // resolve normally without touching the database.
    it.each([
        ["an empty value", null],
        ["invalid JSON", "{not json"],
        ["a JSON array", []],
        ["JSON null", "null"],
        ["a string transactionId", { ...validEvent, transactionId: "7" }],
        ["a non-integer transactionId", { ...validEvent, transactionId: 7.5 }],
        ["a missing sender", { ...validEvent, fromUserId: undefined }],
        ["an empty sender", { ...validEvent, fromUserId: "" }],
        ["an empty recipient", { ...validEvent, toUserId: "" }],
        ["a numeric amount", { ...validEvent, amount: 100 }],
        ["a negative amount", { ...validEvent, amount: "-5" }],
        ["a decimal amount", { ...validEvent, amount: "1.5" }],
        ["an amount with leading zeros", { ...validEvent, amount: "007" }],
        ["an invalid createdAt", { ...validEvent, createdAt: "yesterday" }],
        ["a missing createdAt", { ...validEvent, createdAt: undefined }],
    ])("skips an event with %s", async (_name, value) => {
        await expect(deliver(value)).resolves.toBeUndefined();

        expect(insertLedgerEntries).not.toHaveBeenCalled();
    });
});

describe("messageHandler: database failures", () => {
    it("rejects, so kafkajs retries the same message", async () => {
        vi.mocked(insertLedgerEntries).mockRejectedValueOnce(new Error("db down"));

        await expect(deliver(validEvent)).rejects.toThrow("db down");
    });
});
