import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startConsumer, stopConsumer } from "src/kafka/consumer";
import { closeSmtpTransporter } from "src/mailer/transporter";
import { messageHandler } from "src/messageHandler";
import { clearMailbox, waitForMessages } from "../helpers";
import { event, publish } from "./helpers";

beforeAll(() => startConsumer(messageHandler));
afterAll(async () => {
    await stopConsumer();
    closeSmtpTransporter();
});
beforeEach(() => clearMailbox());

describe("email consumer (real Kafka, real SMTP server)", () => {
    it("emails both sides of the payment for one Kafka event", async () => {
        await publish("1", event(1));

        const messages = await waitForMessages(2, 20_000);
        expect(messages.map((m) => m.To[0].Address).sort()).toEqual([
            "buyer@email.com",
            "georgio@email.com",
        ]);
    });

    it("skips a malformed message without blocking the ones after it", async () => {
        await publish("2", "not json {{", event(2));

        expect(await waitForMessages(2, 20_000)).toHaveLength(2);

        // nothing was sent for the malformed message
        expect(await waitForMessages(3, 1_500)).toHaveLength(2);
    });
});
