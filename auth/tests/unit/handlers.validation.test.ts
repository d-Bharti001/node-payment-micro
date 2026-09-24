import * as grpc from "@grpc/grpc-js";
import { describe, expect, it } from "vitest";
import { loginUser } from "src/handlers/auth/loginUser";
import { validateToken } from "src/handlers/auth/validateToken";

function invoke(handler: any, request: Record<string, unknown>) {
    return new Promise<{ err: any; res: any }>((resolve) => {
        handler({ request }, (err: any, res: any) => resolve({ err, res }));
    });
}

// These are all rejected before any DB access, so no database is needed.
describe("request validation", () => {
    it.each([
        ["missing user id", { userId: "", password: "pw" }],
        ["missing password", { userId: "a@x.com", password: "" }],
    ])("loginUser rejects %s with INVALID_ARGUMENT", async (_name, request) => {
        const { err } = await invoke(loginUser, request);
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
    });

    it("validateToken rejects a missing token with INVALID_ARGUMENT", async () => {
        const { err } = await invoke(validateToken, { jwt: "" });
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
});
