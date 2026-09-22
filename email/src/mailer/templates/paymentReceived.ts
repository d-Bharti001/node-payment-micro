import { escapeHtml } from "./escapeHtml";

interface PaymentReceivedTemplateParams {
    transactionId: number;
    amount: bigint;
    paymentSenderEmail: string;
    createdAt: Date;
}

export function paymentReceivedTemplate({
    transactionId,
    amount,
    paymentSenderEmail,
    createdAt,
}: PaymentReceivedTemplateParams): { subject: string; html: string } {
    return {
        subject: `Payment received for Transaction #${transactionId}`,
        html: `
            <p>You received amount <b>${amount.toString()}</b> from ${escapeHtml(paymentSenderEmail)}.</p>
            <p>Transaction ID: <b>${transactionId}</b></p>
            <p>Time: ${createdAt.toUTCString()}</p>
        `,
    };
}
