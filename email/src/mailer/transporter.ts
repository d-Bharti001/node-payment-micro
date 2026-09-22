import nodemailer from "nodemailer";

import { SMTP_HOST, SMTP_PORT } from "src/config/config";

export const smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    pool: true,
});

export async function verifySmtpTransporter(): Promise<void> {
    await smtpTransporter.verify();
}

export function closeSmtpTransporter(): void {
    smtpTransporter.close();
}
