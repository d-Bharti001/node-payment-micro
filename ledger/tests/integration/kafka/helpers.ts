import { Partitioners } from "kafkajs";
import { kafkaClient } from "../../support/kafka";

// Polls `check` until it returns something truthy, or fails after `timeoutMs`.
export async function waitFor<T>(
    check: () => Promise<T | null | undefined | false>,
    what: string,
    timeoutMs = 20_000,
): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const result = await check();
        if (result) return result;
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`timed out waiting for ${what}`);
}

// Sends the values to the payments topic under one key. The same key means the same partition,
// so the messages are consumed in exactly this order.
export async function publish(key: string, ...values: (object | string)[]) {
    const producer = kafkaClient().producer({ createPartitioner: Partitioners.DefaultPartitioner });
    await producer.connect();
    await producer.send({
        topic: "payments",
        messages: values.map((value) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value),
        })),
    });
    await producer.disconnect();
}

// An event as money_movement's outbox relay publishes it.
export const event = (transactionId: number, overrides: object = {}) => ({
    createdAt: "2026-09-22T10:00:00.000Z",
    transactionId,
    fromUserId: "buyer@email.com",
    toUserId: "georgio@email.com",
    amount: "100",
    ...overrides,
});
