import { escapeHtml } from "./escapeHtml";

interface PaymentSentTemplateParams {
    transactionId: number;
    amount: bigint;
    paymentReceiverEmail: string;
    createdAt: Date;
}

export function paymentSentTemplate({
    transactionId,
    amount,
    paymentReceiverEmail,
    createdAt,
}: PaymentSentTemplateParams): { subject: string; html: string } {
    return {
        subject: `Payment sent for Transaction #${transactionId}`,
        html: `
            <p>You sent amount <b>${amount.toString()}</b> to ${escapeHtml(paymentReceiverEmail)}.</p>
            <p>Transaction ID: <b>${transactionId}</b></p>
            <p>Time: ${createdAt.toUTCString()}</p>
        `,
    };
}
