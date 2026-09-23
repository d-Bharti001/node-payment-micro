import { SENDER_EMAIL } from "src/config/config";
import { smtpTransporter } from "src/mailer/transporter";
import { paymentSentTemplate } from "src/mailer/templates/paymentSent";
import { paymentReceivedTemplate } from "src/mailer/templates/paymentReceived";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    await smtpTransporter.sendMail({
        from: SENDER_EMAIL,
        to,
        subject,
        html,
    });
}

export interface PaymentEmailParams {
    transactionId: number;
    amount: bigint;
    fromUserEmail: string;
    toUserEmail: string;
    createdAt: Date;
}

export async function sendEmailToPaymentSender({
    transactionId,
    amount,
    fromUserEmail,
    toUserEmail,
    createdAt,
}: PaymentEmailParams): Promise<void> {
    const { subject, html } = paymentSentTemplate({
        transactionId,
        amount,
        paymentReceiverEmail: toUserEmail,
        createdAt,
    });
    await sendEmail(fromUserEmail, subject, html);
}

export async function sendEmailToPaymentReceiver({
    transactionId,
    amount,
    fromUserEmail,
    toUserEmail,
    createdAt,
}: PaymentEmailParams): Promise<void> {
    const { subject, html } = paymentReceivedTemplate({
        transactionId,
        amount,
        paymentSenderEmail: fromUserEmail,
        createdAt,
    });
    await sendEmail(toUserEmail, subject, html);
}
