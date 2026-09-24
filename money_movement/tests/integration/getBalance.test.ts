import * as grpc from "@grpc/grpc-js";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { callGetBalance, resetDb } from "./helpers";

afterAll(() => dbPool.end());
beforeEach(() => resetDb({ "a@x.com": 1234n }));

describe("getBalance", () => {
    it("returns the balance of an existing user", async () => {
        const { err, res } = await callGetBalance("a@x.com");
        expect(err).toBeNull();
        expect(res.balance).toBe("1234");
    });

    it("returns NOT_FOUND for a user with no balance row", async () => {
        const { err } = await callGetBalance("nobody@x.com");
        expect(err.code).toBe(grpc.status.NOT_FOUND);
    });

    it("returns INVALID_ARGUMENT for an empty user id", async () => {
        const { err } = await callGetBalance("");
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
});
