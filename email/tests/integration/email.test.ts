import type { EachMessagePayload } from "kafkajs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sendEmailToPaymentReceiver, sendEmailToPaymentSender } from "src/mailer/sendEmail";
import { closeSmtpTransporter, verifySmtpTransporter } from "src/mailer/transporter";
import { messageHandler } from "src/messageHandler";
import { clearMailbox, htmlOf, waitForMessages } from "./helpers";

const params = {
    transactionId: 7,
    amount: 100n,
    fromUserEmail: "buyer@email.com",
    toUserEmail: "georgio@email.com",
    createdAt: new Date("2026-09-22T10:00:00.000Z"),
};

afterAll(() => closeSmtpTransporter());
beforeEach(() => clearMailbox());

describe("SMTP transport", () => {
    it("can reach the SMTP server (the startup check in index.ts)", async () => {
        await expect(verifySmtpTransporter()).resolves.toBeUndefined();
    });
});

describe("sending through a real SMTP server", () => {
    it("delivers the payer's email", async () => {
        await sendEmailToPaymentSender(params);

        const [message] = await waitForMessages(1);
        expect(message.To.map((t) => t.Address)).toEqual(["buyer@email.com"]);
        expect(message.From.Address).toBe("payments@test.local");
        expect(message.Subject).toContain("#7");

        const html = await htmlOf(message);
        expect(html).toContain("100");
        expect(html).toContain("georgio@email.com");
    });

    it("delivers the payee's email", async () => {
        await sendEmailToPaymentReceiver(params);

        const [message] = await waitForMessages(1);
        expect(message.To.map((t) => t.Address)).toEqual(["georgio@email.com"]);
        expect(message.Subject).toContain("#7");

        const html = await htmlOf(message);
        expect(html).toContain("100");
        expect(html).toContain("buyer@email.com");
    });
});

describe("messageHandler (real SMTP server)", () => {
    const deliver = (event: object) =>
        messageHandler({
            message: { value: Buffer.from(JSON.stringify(event)) },
        } as unknown as EachMessagePayload);

    const event = {
        createdAt: "2026-09-22T10:00:00.000Z",
        transactionId: 7,
        fromUserId: "buyer@email.com",
        toUserId: "georgio@email.com",
        amount: "100",
    };

    it("turns one Kafka event into two emails: one for each side of the payment", async () => {
        await deliver(event);

        const messages = await waitForMessages(2);

        expect(messages.map((m) => m.To[0].Address).sort()).toEqual([
            "buyer@email.com",
            "georgio@email.com",
        ]);
        // the two sides get different emails, not the same one twice
        expect(new Set(messages.map((m) => m.Subject)).size).toBe(2);
    });

    it("sends nothing for a malformed event", async () => {
        await deliver({ ...event, toUserId: "not-an-email" });

        expect(await waitForMessages(1, 1_000)).toHaveLength(0);
    });
});
