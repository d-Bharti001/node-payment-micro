import type { EachMessagePayload } from "kafkajs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageHandler } from "src/messageHandler";
import { sendEmailToPaymentReceiver, sendEmailToPaymentSender } from "src/mailer/sendEmail";

vi.mock("src/mailer/sendEmail", () => ({
    sendEmailToPaymentSender: vi.fn(),
    sendEmailToPaymentReceiver: vi.fn(),
}));

// The shape money_movement's outbox relay publishes: { createdAt, ...outbox payload }.
const validEvent = {
    createdAt: "2026-09-22T10:00:00.000Z",
    transactionId: 7,
    fromUserId: "buyer@email.com",
    toUserId: "georgio@email.com",
    amount: "100",
};

function deliver(value: unknown) {
    const raw =
        value === null
            ? null
            : Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
    return messageHandler({ message: { value: raw } } as unknown as EachMessagePayload);
}

beforeEach(() => {
    vi.mocked(sendEmailToPaymentSender).mockReset();
    vi.mocked(sendEmailToPaymentReceiver).mockReset();
});

describe("messageHandler: valid events", () => {
    const expectedParams = {
        transactionId: 7,
        amount: 100n,
        fromUserEmail: "buyer@email.com",
        toUserEmail: "georgio@email.com",
        createdAt: new Date("2026-09-22T10:00:00.000Z"),
    };

    it("sends one email to the payer and one to the payee, with the decoded event", async () => {
        await deliver(validEvent);

        expect(sendEmailToPaymentSender).toHaveBeenCalledOnce();
        expect(sendEmailToPaymentSender).toHaveBeenCalledWith(expectedParams);
        expect(sendEmailToPaymentReceiver).toHaveBeenCalledOnce();
        expect(sendEmailToPaymentReceiver).toHaveBeenCalledWith(expectedParams);
    });

    it("notifies the payer before the payee", async () => {
        await deliver(validEvent);

        expect(vi.mocked(sendEmailToPaymentSender).mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(sendEmailToPaymentReceiver).mock.invocationCallOrder[0],
        );
    });
});

describe("messageHandler: malformed events are skipped, not retried", () => {
    // Throwing would make kafkajs retry the same message forever, so a poison message must
    // resolve normally without sending any email.
    it.each([
        ["an empty value", null],
        ["invalid JSON", "{not json"],
        ["a JSON array", []],
        ["a string transactionId", { ...validEvent, transactionId: "7" }],
        ["a missing sender", { ...validEvent, fromUserId: undefined }],
        ["a sender that is not an email address", { ...validEvent, fromUserId: "not-an-email" }],
        ["a recipient without a domain dot", { ...validEvent, toUserId: "georgio@email" }],
        ["a recipient with whitespace", { ...validEvent, toUserId: "geor gio@email.com" }],
        ["a numeric amount", { ...validEvent, amount: 100 }],
        ["a negative amount", { ...validEvent, amount: "-5" }],
        ["an invalid createdAt", { ...validEvent, createdAt: "yesterday" }],
    ])("skips an event with %s", async (_name, value) => {
        await expect(deliver(value)).resolves.toBeUndefined();

        expect(sendEmailToPaymentSender).not.toHaveBeenCalled();
        expect(sendEmailToPaymentReceiver).not.toHaveBeenCalled();
    });
});

describe("messageHandler: SMTP failures", () => {
    it("rejects, so kafkajs retries, if the payer's email fails; the payee's is not attempted", async () => {
        vi.mocked(sendEmailToPaymentSender).mockRejectedValueOnce(new Error("smtp down"));

        await expect(deliver(validEvent)).rejects.toThrow("smtp down");
        expect(sendEmailToPaymentReceiver).not.toHaveBeenCalled();
    });

    // Known trade-off: there is no de-duplication, so the retry that follows a failure here sends
    // the payer's email a second time. The two sends are sequential, not atomic.
    it("rejects if the payee's email fails, after the payer's was already sent", async () => {
        vi.mocked(sendEmailToPaymentReceiver).mockRejectedValueOnce(new Error("smtp down"));

        await expect(deliver(validEvent)).rejects.toThrow("smtp down");
        expect(sendEmailToPaymentSender).toHaveBeenCalledOnce();
    });
});
