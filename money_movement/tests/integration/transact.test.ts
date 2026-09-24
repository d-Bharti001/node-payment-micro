import * as grpc from "@grpc/grpc-js";
import type { RowDataPacket } from "mysql2";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { balanceOf, callTransact, countRows, resetDb } from "./helpers";

const A = "a@x.com";
const B = "b@x.com";

afterAll(() => dbPool.end());

describe("transact: idempotency", () => {
    beforeEach(() => resetDb({ [A]: 1000n, [B]: 0n }));

    it("N concurrent calls with the same key produce one debit, one credit and one outbox event", async () => {
        const request = { idempotencyKey: "key1", fromUserId: A, toUserId: B, amount: "100" };

        const results = await Promise.all(Array.from({ length: 20 }, () => callTransact(request)));

        expect(results.filter((r) => r.err)).toEqual([]);
        expect(new Set(results.map((r) => r.res.transactionId)).size).toBe(1);
        expect(await countRows("transactions")).toBe(1);
        expect(await countRows("outbox")).toBe(1);
        expect(await balanceOf(A)).toBe(900n);
        expect(await balanceOf(B)).toBe(100n);
    });

    it("a replay after completion returns the original transaction and moves no money", async () => {
        const request = { idempotencyKey: "key1", fromUserId: A, toUserId: B, amount: "100" };

        const first = await callTransact(request);
        const replay = await callTransact(request);

        expect(first.err).toBeNull();
        expect(replay.err).toBeNull();
        expect(replay.res.transactionId).toBe(first.res.transactionId);
        expect(await countRows("transactions")).toBe(1);
        expect(await countRows("outbox")).toBe(1);
        expect(await balanceOf(A)).toBe(900n);
        expect(await balanceOf(B)).toBe(100n);
    });

    it("the same key used by different senders is independent", async () => {
        await resetDb({ [A]: 1000n, [B]: 1000n });

        const fromA = await callTransact({
            idempotencyKey: "key1",
            fromUserId: A,
            toUserId: B,
            amount: "100",
        });
        const fromB = await callTransact({
            idempotencyKey: "key1",
            fromUserId: B,
            toUserId: A,
            amount: "50",
        });

        expect(fromA.err).toBeNull();
        expect(fromB.err).toBeNull();
        expect(fromB.res.transactionId).not.toBe(fromA.res.transactionId);
        expect(await countRows("transactions")).toBe(2);
        expect(await balanceOf(A)).toBe(950n);
        expect(await balanceOf(B)).toBe(1050n);
    });
});

describe("transact: concurrency", () => {
    it("opposing concurrent transfers between the same two users neither deadlock nor lose money", async () => {
        await resetDb({ [A]: 100_000n, [B]: 100_000n });
        const N = 50;

        const calls = [
            ...Array.from({ length: N }, (_, i) =>
                callTransact({
                    idempotencyKey: `ab-${i}`,
                    fromUserId: A,
                    toUserId: B,
                    amount: "10",
                }),
            ),
            ...Array.from({ length: N }, (_, i) =>
                callTransact({
                    idempotencyKey: `ba-${i}`,
                    fromUserId: B,
                    toUserId: A,
                    amount: "10",
                }),
            ),
        ];

        const results = await Promise.all(calls);

        // A deadlock would surface here as an INTERNAL error ("Deadlock found when trying to get lock")
        expect(results.filter((r) => r.err).map((r) => r.err.message)).toEqual([]);
        expect(await balanceOf(A)).toBe(100_000n);
        expect(await balanceOf(B)).toBe(100_000n);
        expect(await countRows("transactions")).toBe(2 * N);
        expect(await countRows("outbox")).toBe(2 * N);
    });
});

describe("transact: failures roll back completely", () => {
    it("insufficient balance is rejected and persists nothing", async () => {
        await resetDb({ [A]: 50n, [B]: 0n });

        const { err } = await callTransact({
            idempotencyKey: "key1",
            fromUserId: A,
            toUserId: B,
            amount: "100",
        });

        expect(err.code).toBe(grpc.status.FAILED_PRECONDITION);
        expect(await balanceOf(A)).toBe(50n);
        expect(await balanceOf(B)).toBe(0n);
        expect(await countRows("transactions")).toBe(0);
        expect(await countRows("outbox")).toBe(0);
    });

    // "z-ghost@x.com" sorts after "a@x.com", so the debit/credit order differs between the two cases
    it.each([
        ["unknown recipient: sender's debit is rolled back", A, "z-ghost@x.com"],
        ["unknown sender: recipient's credit is rolled back", "z-ghost@x.com", A],
    ])("%s", async (_name, from, to) => {
        await resetDb({ [A]: 1000n });

        const { err } = await callTransact({
            idempotencyKey: "k",
            fromUserId: from,
            toUserId: to,
            amount: "100",
        });

        expect(err.code).toBe(grpc.status.NOT_FOUND);
        expect(await balanceOf(A)).toBe(1000n);
        expect(await countRows("transactions")).toBe(0);
        expect(await countRows("outbox")).toBe(0);
    });
});

describe("transact: what gets persisted on success", () => {
    it("writes a completed transaction and a matching unpublished outbox event", async () => {
        await resetDb({ [A]: 1000n, [B]: 0n });

        const { err, res } = await callTransact({
            idempotencyKey: "k",
            fromUserId: A,
            toUserId: B,
            amount: "100",
        });
        expect(err).toBeNull();

        const [[tx]] = await dbPool.query<RowDataPacket[]>("SELECT * FROM transactions");
        expect(tx).toMatchObject({
            id: res.transactionId,
            idempotency_key: "k",
            from_user_id: A,
            to_user_id: B,
            tx_status: "completed",
        });

        const [[event]] = await dbPool.query<RowDataPacket[]>("SELECT * FROM outbox");
        expect(event).toMatchObject({
            topic: "payments",
            message_key: String(res.transactionId),
            published_at: null,
        });
        expect(event.payload).toEqual({
            transactionId: res.transactionId,
            fromUserId: A,
            toUserId: B,
            amount: "100",
        });
    });
});
