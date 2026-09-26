import { randomUUID } from "node:crypto";
import { createTopic, kafkaClient } from "../../support/kafka";

// A fresh topic for one test
export async function newTopic(): Promise<string> {
    const topic = `payments-${randomUUID()}`;
    await createTopic(topic, 3);
    return topic;
}

export interface ReceivedMessage {
    partition: number;
    key: string;
    value: string;
}

// Reads `count` messages from the beginning of `topic`, then stops the consumer.
export async function readTopic(
    topic: string,
    count: number,
    timeoutMs = 15_000,
): Promise<ReceivedMessage[]> {
    const consumer = kafkaClient().consumer({ groupId: randomUUID() });
    const received: ReceivedMessage[] = [];

    // The gate opens once enough messages have arrived; the fuse fails the test if they don't.
    let enoughArrived!: () => void;
    const gate = new Promise<void>((resolve) => (enoughArrived = resolve));
    let timer: NodeJS.Timeout | undefined;
    const fuse = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () =>
                reject(
                    new Error(
                        `only ${received.length} of ${count} messages arrived on topic ${topic}`,
                    ),
                ),
            timeoutMs,
        );
    });

    try {
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: true });
        await consumer.run({
            eachMessage: async ({ partition, message }) => {
                received.push({
                    partition,
                    key: message.key!.toString(),
                    value: message.value!.toString(),
                });
                if (received.length >= count) enoughArrived();
            },
        });
        await Promise.race([gate, fuse]);
    } finally {
        clearTimeout(timer);
        await consumer.disconnect();
    }

    return received;
}
