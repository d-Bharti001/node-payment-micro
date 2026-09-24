import bcrypt from "bcrypt";
import { describe, expect, it } from "vitest";
import { hashPassword } from "src/utils/password";

describe("hashPassword", () => {
    it("produces a bcrypt hash that verifies against the original password only", async () => {
        const hash = await hashPassword("s3cret");

        expect(hash).toMatch(/^\$2[aby]\$10\$/);
        expect(await bcrypt.compare("s3cret", hash)).toBe(true);
        expect(await bcrypt.compare("wrong", hash)).toBe(false);
    });

    it("never stores the plaintext and salts every hash differently", async () => {
        const [h1, h2] = await Promise.all([hashPassword("s3cret"), hashPassword("s3cret")]);

        expect(h1).not.toContain("s3cret");
        expect(h1).not.toBe(h2);
    });

    it("fits the users.password_hashed VARCHAR(255) column", async () => {
        // 72 bytes is bcrypt's input limit
        expect((await hashPassword("x".repeat(72))).length).toBeLessThanOrEqual(255);
    });
});
