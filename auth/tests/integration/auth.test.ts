import * as grpc from "@grpc/grpc-js";
import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { getUserByUserId } from "src/repository/user/getUser";
import { verifyJWT } from "src/utils/jwt";
import { callLogin, callValidateToken, resetUsers } from "./helpers";

const USER = "buyer@x.com";
const PASSWORD = "buyer-pass";
const OTHER = "other@x.com";
const OTHER_PASSWORD = "other-pass";

afterAll(() => dbPool.end());
beforeEach(() => resetUsers({ [USER]: PASSWORD, [OTHER]: OTHER_PASSWORD }));

describe("loginUser", () => {
    it("returns a JWT whose subject is the user, for the right credentials", async () => {
        const { err, res } = await callLogin(USER, PASSWORD);

        expect(err).toBeNull();
        expect(await verifyJWT(res.jwt)).toBe(USER);
    });

    it("rejects a wrong password with UNAUTHENTICATED", async () => {
        const { err, res } = await callLogin(USER, "wrong-pass");

        expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
        expect(err.message).toBe("invalid credentials");
        expect(res).toBeUndefined();
    });

    it("does not accept another user's password", async () => {
        const { err } = await callLogin(USER, OTHER_PASSWORD);
        expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
    });
});

describe("validateToken", () => {
    it("accepts a token issued by loginUser and returns its user id", async () => {
        const { res: login } = await callLogin(USER, PASSWORD);

        const { err, res } = await callValidateToken(login.jwt);

        expect(err).toBeNull();
        expect(res.userId).toBe(USER);
    });

    it("rejects an expired token with UNAUTHENTICATED", async () => {
        const expired = jwt.sign({}, process.env.JWT_SIGNING_KEY!, {
            algorithm: "HS256",
            issuer: "auth-service",
            subject: USER,
            expiresIn: -60,
        });

        const { err } = await callValidateToken(expired);

        expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
        expect(err.message).toBe("token expired");
    });

    it("rejects a token signed with a different key with UNAUTHENTICATED", async () => {
        const forged = jwt.sign({}, "not-the-real-key", {
            algorithm: "HS256",
            issuer: "auth-service",
            subject: USER,
        });

        const { err } = await callValidateToken(forged);

        expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
    });
});

describe("getUserByUserId", () => {
    it("returns the user with a hashed (never plaintext) password", async () => {
        const user = await getUserByUserId(USER);

        expect(user.user_id).toBe(USER);
        expect(user.password_hashed).not.toBe(PASSWORD);
        expect(user.password_hashed).toMatch(/^\$2[aby]\$/);
    });

    it("throws NOT_FOUND for an unknown user", async () => {
        await expect(getUserByUserId("nobody@x.com")).rejects.toMatchObject({
            code: grpc.status.NOT_FOUND,
        });
    });
});
