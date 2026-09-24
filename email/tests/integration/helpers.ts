// Thin client for Mailpit's REST API, used to check what actually arrived in the mailbox.
const api = () => process.env.MAILPIT_API_URL!;

export interface MailpitMessage {
    ID: string;
    From: { Address: string };
    To: { Address: string }[];
    Subject: string;
}

export async function clearMailbox() {
    await fetch(`${api()}/api/v1/messages`, { method: "DELETE" });
}

// SMTP delivery is asynchronous from the test's point of view, so poll briefly.
export async function waitForMessages(count: number, timeoutMs = 5_000): Promise<MailpitMessage[]> {
    const deadline = Date.now() + timeoutMs;
    let messages: MailpitMessage[] = [];
    while (Date.now() < deadline) {
        const res = await fetch(`${api()}/api/v1/messages`);
        messages = ((await res.json()) as { messages: MailpitMessage[] }).messages ?? [];
        if (messages.length >= count) return messages;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return messages;
}

export async function htmlOf(message: MailpitMessage): Promise<string> {
    const res = await fetch(`${api()}/api/v1/message/${message.ID}`);
    return ((await res.json()) as { HTML: string }).HTML;
}
