import * as grpc from "@grpc/grpc-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateToken } from "src/grpc/authClient";
import { authenticate } from "src/middleware/authenticate";
import { InternalServerError, UnauthorizedError } from "src/utils/errors";

vi.mock("src/grpc/authClient", () => ({ loginUser: vi.fn(), validateToken: vi.fn() }));

const grpcError = (code: grpc.status, details: string) =>
    Object.assign(new Error(details), { code, details });

async function run(headers: Record<string, string>) {
    const req: any = { header: (name: string) => headers[name] };
    const next = vi.fn();
    await authenticate(req, {} as any, next);
    return { req, next };
}

beforeEach(() => {
    vi.mocked(validateToken).mockReset();
});

describe("authenticate", () => {
    it.each([
        ["no Authorization header", {}],
        ["a non-Bearer scheme", { Authorization: "Basic dXNlcjpwYXNz" }],
        ["a bare token without the scheme", { Authorization: "some-token" }],
    ])(
        "rejects a request with %s as unauthorized, without asking the auth service",
        async (_n, headers) => {
            const { next } = await run(headers);

            expect(next).toHaveBeenCalledOnce();
            expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
            expect(validateToken).not.toHaveBeenCalled();
        },
    );

    it("validates the token without the 'Bearer ' prefix and identifies the caller", async () => {
        vi.mocked(validateToken).mockResolvedValue("buyer@x.com");

        const { req, next } = await run({ Authorization: "Bearer abc.def.ghi" });

        expect(validateToken).toHaveBeenCalledWith("abc.def.ghi");
        expect(req.userId).toBe("buyer@x.com");
        expect(next).toHaveBeenCalledWith(); // continues, with no error
    });

    it("rejects a token the auth service refuses as unauthorized", async () => {
        vi.mocked(validateToken).mockRejectedValue(
            grpcError(grpc.status.UNAUTHENTICATED, "token expired"),
        );

        const { req, next } = await run({ Authorization: "Bearer expired" });

        expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
        expect(next.mock.calls[0][0].message).toBe("token expired");
        expect(req.userId).toBeUndefined();
    });

    it("reports an unreachable auth service as a server error, not as unauthorized", async () => {
        vi.mocked(validateToken).mockRejectedValue(grpcError(grpc.status.UNAVAILABLE, "no route"));

        const { next } = await run({ Authorization: "Bearer abc" });

        expect(next.mock.calls[0][0]).toBeInstanceOf(InternalServerError);
    });
});
