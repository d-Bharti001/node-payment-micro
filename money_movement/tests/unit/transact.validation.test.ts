import * as grpc from "@grpc/grpc-js";
import { describe, expect, it } from "vitest";
import { transact } from "src/handlers/transaction/transact";

function callTransact(request: Record<string, unknown>) {
    return new Promise<{ err: any; res: any }>((resolve) => {
        (transact as any)({ request }, (err: any, res: any) => resolve({ err, res }));
    });
}

describe("transact: request validation (never reaches the DB)", () => {
    const validPayload = {
        idempotencyKey: "k1",
        fromUserId: "a@x.com",
        toUserId: "b@x.com",
        amount: "100",
    };

    it.each([
        ["missing idempotency key", { ...validPayload, idempotencyKey: "" }],
        ["zero amount", { ...validPayload, amount: "0" }],
        ["negative amount", { ...validPayload, amount: "-5" }],
        ["decimal amount", { ...validPayload, amount: "1.5" }],
        ["leading zeros", { ...validPayload, amount: "007" }],
        ["non-numeric amount", { ...validPayload, amount: "abc" }],
    ])("rejects %s with INVALID_ARGUMENT", async (_n, request) => {
        const { err } = await callTransact(request);
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
    });

    it("rejects a self-transfer", async () => {
        const { err } = await callTransact({ ...validPayload, toUserId: validPayload.fromUserId });
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
});
