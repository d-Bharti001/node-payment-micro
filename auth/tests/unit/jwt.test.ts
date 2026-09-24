import * as grpc from "@grpc/grpc-js";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { createJWT, verifyJWT } from "src/utils/jwt";

const KEY = process.env.JWT_SIGNING_KEY!;
const ISSUER = "auth-service";

// Signs a token the way createJWT does, but lets a test tamper with the parameters.
function sign(options: jwt.SignOptions, key: string = KEY) {
    return jwt.sign({}, key, {
        algorithm: "HS256",
        issuer: ISSUER,
        subject: "a@x.com",
        ...options,
    });
}

describe("createJWT / verifyJWT", () => {
    it("round-trips: the verified subject is the user the token was created for", async () => {
        const token = await createJWT("a@x.com");
        expect(await verifyJWT(token)).toBe("a@x.com");
    });

    it("creates an HS256 token issued by auth-service that expires in 3 hours", async () => {
        const decoded = jwt.decode(await createJWT("a@x.com"), { complete: true })!;
        const claims = decoded.payload as jwt.JwtPayload;

        expect(decoded.header.alg).toBe("HS256");
        expect(claims.iss).toBe(ISSUER);
        expect(claims.exp! - claims.iat!).toBe(3 * 60 * 60);
    });

    it.each([
        ["expired", () => sign({ expiresIn: -60 }), "token expired"],
        ["signed with a different key", () => sign({}, "some-other-key"), "unauthenticated"],
        ["issued by someone else", () => sign({ issuer: "evil-service" }), "unauthenticated"],
        [
            "unsigned (alg: none)",
            () => jwt.sign({}, "", { algorithm: "none", issuer: ISSUER, subject: "a@x.com" }),
            "unauthenticated",
        ],
        [
            "signed with another algorithm (HS512)",
            () => sign({ algorithm: "HS512" }),
            "unauthenticated",
        ],
        ["not a JWT at all", () => "definitely-not-a-jwt", "unauthenticated"],
    ])("rejects a token that is %s with UNAUTHENTICATED", async (_name, makeToken, message) => {
        await expect(verifyJWT(makeToken())).rejects.toMatchObject({
            code: grpc.status.UNAUTHENTICATED,
            message,
        });
    });

    it("rejects a validly signed token that has no subject", async () => {
        const token = jwt.sign({}, KEY, { algorithm: "HS256", issuer: ISSUER });

        await expect(verifyJWT(token)).rejects.toMatchObject({
            code: grpc.status.INTERNAL,
            message: "claims missing subject",
        });
    });

    it("rejects a token whose payload was tampered with (signature no longer matches)", async () => {
        const [header, , signature] = (await createJWT("a@x.com")).split(".");
        const forgedPayload = Buffer.from(
            JSON.stringify({ iss: ISSUER, sub: "admin@x.com" }),
        ).toString("base64url");

        await expect(verifyJWT(`${header}.${forgedPayload}.${signature}`)).rejects.toMatchObject({
            code: grpc.status.UNAUTHENTICATED,
        });
    });
});
