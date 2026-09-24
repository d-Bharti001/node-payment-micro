import * as grpc from "@grpc/grpc-js";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "src/app";
import { authService, grpcError, moneyMovementService, signedInAs } from "./helpers";

// Only the two gRPC clients are faked; everything else (Express, routing, middleware, error
// handling, Swagger) is the real application.
vi.mock("src/grpc/authClient", () => ({ loginUser: vi.fn(), validateToken: vi.fn() }));
vi.mock("src/grpc/moneyMovementClient", () => ({ getBalance: vi.fn(), transact: vi.fn() }));

beforeEach(() => {
    vi.resetAllMocks();
});

const USER = "buyer@x.com";

describe("POST /login", () => {
    it("returns the JWT issued by the auth service", async () => {
        authService.loginUser.mockResolvedValue("jwt-123");

        const res = await request(app).post("/login").send({ user_id: USER, password: "pw" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ jwt: "jwt-123" });
        expect(authService.loginUser).toHaveBeenCalledWith(USER, "pw");
    });

    it.each([
        ["an empty body", {}],
        ["no password", { user_id: USER }],
        ["no user_id", { password: "pw" }],
        ["empty strings", { user_id: "", password: "" }],
    ])("rejects %s with 400 before calling the auth service", async (_name, body) => {
        const res = await request(app).post("/login").send(body);

        expect(res.status).toBe(400);
        expect(res.body.error).toBeTruthy();
        expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it("answers 401 when the credentials are wrong", async () => {
        authService.loginUser.mockRejectedValue(
            grpcError(grpc.status.UNAUTHENTICATED, "invalid credentials"),
        );

        const res = await request(app).post("/login").send({ user_id: USER, password: "bad" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "invalid credentials" });
    });

    // Today an unknown user gets 404 while a wrong password gets 401, so anyone can probe which
    // user IDs exist. Both should look identical to the caller.
    it.todo("answers an unknown user exactly like a wrong password (no user enumeration)");

    it("does not leak internal details when the auth service is down", async () => {
        authService.loginUser.mockRejectedValue(
            grpcError(grpc.status.UNAVAILABLE, "connect ECONNREFUSED 10.0.0.5:9000"),
        );

        const res = await request(app).post("/login").send({ user_id: USER, password: "pw" });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "something went wrong" });
        expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    });
});

describe("authentication on protected routes", () => {
    it.each([
        ["GET", "/balance"],
        ["POST", "/transact"],
    ])(
        "%s %s answers 401 without a token and never reaches money_movement",
        async (method, path) => {
            const res = await request(app)[method.toLowerCase() as "get" | "post"](path);

            expect(res.status).toBe(401);
            expect(authService.validateToken).not.toHaveBeenCalled();
            expect(moneyMovementService.getBalance).not.toHaveBeenCalled();
            expect(moneyMovementService.transact).not.toHaveBeenCalled();
        },
    );

    it("answers 401 with the auth service's reason when the token is refused", async () => {
        authService.validateToken.mockRejectedValue(
            grpcError(grpc.status.UNAUTHENTICATED, "token expired"),
        );

        const res = await request(app).get("/balance").set("Authorization", "Bearer old");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "token expired" });
        expect(moneyMovementService.getBalance).not.toHaveBeenCalled();
    });

    it("keeps /login public", async () => {
        authService.loginUser.mockResolvedValue("jwt");

        const res = await request(app).post("/login").send({ user_id: USER, password: "pw" });

        expect(res.status).toBe(200);
        expect(authService.validateToken).not.toHaveBeenCalled();
    });
});

describe("GET /balance", () => {
    it("returns the balance of the signed-in user", async () => {
        moneyMovementService.getBalance.mockResolvedValue("500000");

        const res = await request(app).get("/balance").set(signedInAs(USER));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ balance: "500000" });
        expect(moneyMovementService.getBalance).toHaveBeenCalledWith(USER);
    });

    it("only ever reads the caller's own balance, whatever the request says", async () => {
        moneyMovementService.getBalance.mockResolvedValue("1");

        await request(app)
            .get("/balance")
            .query({ userId: "victim@x.com", user_id: "victim@x.com" })
            .set(signedInAs(USER));

        expect(moneyMovementService.getBalance).toHaveBeenCalledWith(USER);
    });

    it("answers 404 when money_movement has no balance for the user", async () => {
        moneyMovementService.getBalance.mockRejectedValue(
            grpcError(grpc.status.NOT_FOUND, "no balance found"),
        );

        const res = await request(app).get("/balance").set(signedInAs(USER));

        expect(res.status).toBe(404);
    });
});

describe("POST /transact", () => {
    const body = { to_user_id: "georgio@x.com", amount: 100 };

    it("makes the transfer as the signed-in user and returns the transaction id", async () => {
        moneyMovementService.transact.mockResolvedValue("42");

        const res = await request(app)
            .post("/transact")
            .set(signedInAs(USER))
            .set("Idempotency-Key", "key-1")
            .send(body);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ transaction_id: "42" });
        expect(moneyMovementService.transact).toHaveBeenCalledWith({
            idempotencyKey: "key-1",
            fromUserId: USER,
            toUserId: "georgio@x.com",
            amount: "100", // a JSON number is passed on as a string
        });
    });

    it("always spends the caller's money: a from_user_id in the body is ignored", async () => {
        moneyMovementService.transact.mockResolvedValue("1");

        await request(app)
            .post("/transact")
            .set(signedInAs(USER))
            .set("Idempotency-Key", "key-1")
            .send({ ...body, from_user_id: "victim@x.com" });

        expect(moneyMovementService.transact).toHaveBeenCalledWith(
            expect.objectContaining({ fromUserId: USER }),
        );
    });

    it("requires an Idempotency-Key header", async () => {
        const res = await request(app).post("/transact").set(signedInAs(USER)).send(body);

        expect(res.status).toBe(400);
        expect(moneyMovementService.transact).not.toHaveBeenCalled();
    });

    it.each([
        ["no recipient", { amount: 100 }],
        ["no amount", { to_user_id: "georgio@x.com" }],
        ["an empty body", {}],
    ])("rejects %s with 400 before calling money_movement", async (_name, payload) => {
        const res = await request(app)
            .post("/transact")
            .set(signedInAs(USER))
            .set("Idempotency-Key", "key-1")
            .send(payload);

        expect(res.status).toBe(400);
        expect(moneyMovementService.transact).not.toHaveBeenCalled();
    });

    describe("errors from money_movement", () => {
        const failWith = async (code: grpc.status, details: string) => {
            moneyMovementService.transact.mockRejectedValue(grpcError(code, details));
            return request(app)
                .post("/transact")
                .set(signedInAs(USER))
                .set("Idempotency-Key", "key-1")
                .send(body);
        };

        it("turns an invalid amount into 400, with the reason", async () => {
            const res = await failWith(
                grpc.status.INVALID_ARGUMENT,
                "a positive integer amount is required",
            );

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "a positive integer amount is required" });
        });

        it("turns insufficient balance into 409", async () => {
            const res = await failWith(grpc.status.FAILED_PRECONDITION, "insufficient balance");

            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: "insufficient balance" });
        });

        it("turns an unknown recipient into 404", async () => {
            const res = await failWith(grpc.status.NOT_FOUND, "user not found");

            expect(res.status).toBe(404);
        });

        it("hides the details of an internal failure", async () => {
            const res = await failWith(
                grpc.status.INTERNAL,
                "Deadlock found when trying to get lock",
            );

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "something went wrong" });
        });
    });
});

describe("routing, CORS and docs", () => {
    it("answers 404 for a route that does not exist, once signed in", async () => {
        const res = await request(app).get("/nope").set(signedInAs(USER));

        expect(res.status).toBe(404);
        expect(res.body.error).toBeTruthy();
    });

    it("does not tell anonymous callers which routes exist: everything but /login needs a token", async () => {
        const res = await request(app).get("/nope");

        expect(res.status).toBe(401);
    });

    it("answers a CORS preflight with 204 without needing a token", async () => {
        const res = await request(app).options("/transact").set("Origin", "https://app.example");

        expect(res.status).toBe(204);
        expect(authService.validateToken).not.toHaveBeenCalled();
    });

    // Today a malformed JSON body is answered with 500, but it is the client's mistake.
    it.todo("answers a malformed JSON body with 400");

    // Today the request's Origin is echoed back together with Allow-Credentials: true (any site
    // is allowed), and a request without an Origin gets the literal text "undefined".
    it.todo("only allows known origins, and sends no Allow-Origin header when there is no Origin");

    it("documents all three endpoints in the Swagger spec", async () => {
        const res = await request(app).get("/docs/swagger.json");

        expect(res.status).toBe(200);
        expect(res.body.paths["/login"].post).toBeDefined();
        expect(res.body.paths["/balance"].get).toBeDefined();
        expect(res.body.paths["/transact"].post).toBeDefined();
    });

    it("serves the Swagger UI", async () => {
        const res = await request(app).get("/docs/swagger/");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/html");
    });
});
