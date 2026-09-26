import { describe, expect, it } from "vitest";
import { escapeHtml } from "src/mailer/templates/escapeHtml";
import { paymentReceivedTemplate } from "src/mailer/templates/paymentReceived";
import { paymentSentTemplate } from "src/mailer/templates/paymentSent";

const createdAt = new Date("2026-09-22T10:00:00.000Z");

// These check that the email carries the right facts, not how it is worded or laid out.
describe("paymentSentTemplate", () => {
    const { subject, html } = paymentSentTemplate({
        transactionId: 42,
        amount: 100n,
        paymentReceiverEmail: "georgio@email.com",
        createdAt,
    });

    it("mentions the transaction in the subject", () => {
        expect(subject).toContain("#42");
    });

    it("mentions the amount, the transaction id, the other party and the time", () => {
        expect(html).toContain("100");
        expect(html).toContain("42");
        expect(html).toContain("georgio@email.com");
        expect(html).toContain("10:00:00"); // the time is shown in UTC
    });

    it("prints amounts beyond Number.MAX_SAFE_INTEGER exactly", () => {
        const big = paymentSentTemplate({
            transactionId: 1,
            amount: 9007199254740993n,
            paymentReceiverEmail: "a@x.com",
            createdAt,
        });
        expect(big.html).toContain("9007199254740993");
    });

    it("escapes HTML in the other party's address", () => {
        const evil = paymentSentTemplate({
            transactionId: 1,
            amount: 1n,
            paymentReceiverEmail: `<script>alert("x")</script>@x.com`,
            createdAt,
        });
        expect(evil.html).not.toContain("<script>");
        expect(evil.html).toContain("&lt;script&gt;");
    });
});

describe("paymentReceivedTemplate", () => {
    const { subject, html } = paymentReceivedTemplate({
        transactionId: 42,
        amount: 100n,
        paymentSenderEmail: "buyer@email.com",
        createdAt,
    });

    it("mentions the transaction in the subject", () => {
        expect(subject).toContain("#42");
    });

    it("mentions the amount, the transaction id, the other party and the time", () => {
        expect(html).toContain("100");
        expect(html).toContain("42");
        expect(html).toContain("buyer@email.com");
        expect(html).toContain("10:00:00"); // the time is shown in UTC
    });

    it("escapes HTML in the other party's address", () => {
        const evil = paymentReceivedTemplate({
            transactionId: 1,
            amount: 1n,
            paymentSenderEmail: "<img src=x>@x.com",
            createdAt,
        });
        expect(evil.html).not.toContain("<img");
        expect(evil.html).toContain("&lt;img");
    });
});

describe("escapeHtml", () => {
    it.each([
        ["&", "&amp;"],
        ["<", "&lt;"],
        [">", "&gt;"],
        ['"', "&quot;"],
        ["'", "&#39;"],
    ])("escapes %s", (input, expected) => {
        expect(escapeHtml(input)).toBe(expected);
    });

    it("escapes & first, so the entities it produces are not escaped again", () => {
        expect(escapeHtml("<&>")).toBe("&lt;&amp;&gt;");
    });

    it("leaves ordinary text alone", () => {
        expect(escapeHtml("georgio@email.com")).toBe("georgio@email.com");
    });
});
