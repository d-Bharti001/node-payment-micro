import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import { connectProducer, disconnectProducer, sendMessages } from "src/kafka/producer";
import { pollOnce } from "src/outbox/pollOnce";
import { outboxRows, resetDb, seedOutbox } from "../helpers";
import { newTopic, readTopic } from "./helpers";

beforeAll(() => connectProducer());
afterAll(async () => {
    await disconnectProducer();
    await dbPool.end();
});

beforeEach(() => resetDb());

// An outbox event, as transact() writes it, but on a topic chosen by the test
const event = (n: number, topic: string) => ({
    key: String(n),
    topic,
    payload: { transactionId: n, fromUserId: "a@x.com", toUserId: "b@x.com", amount: "100" },
});

describe("outbox relay to Kafka", () => {
    it("publishes outbox event to the topic and marks them published", async () => {
        const topic = await newTopic();
        await seedOutbox([event(1, topic), event(2, topic), event(3, topic)]);

        await pollOnce(sendMessages, 10);

        const messages = await readTopic(topic, 3);
        expect(messages.map((m) => m.key).sort()).toEqual(["1", "2", "3"]);
        expect(JSON.parse(messages.find((m) => m.key === "1")!.value)).toEqual({
            createdAt: expect.any(String),
            transactionId: 1,
            fromUserId: "a@x.com",
            toUserId: "b@x.com",
            amount: "100", // a string, as the consumers (ledger, email) require
        });
        expect((await outboxRows()).every((r) => r.published_at !== null)).toBe(true);
    });

    it("sends each event to its own topic when one poll covers several topics", async () => {
        const topicA = await newTopic();
        const topicB = await newTopic();

        // interleaved on purpose, so the topic grouping in sendMessages has work to do
        await seedOutbox([event(1, topicA), event(2, topicB), event(3, topicA), event(4, topicB)]);

        await pollOnce(sendMessages, 10);

        const [a, b] = await Promise.all([readTopic(topicA, 2), readTopic(topicB, 2)]);
        expect(a.map((m) => m.key).sort()).toEqual(["1", "3"]);
        expect(b.map((m) => m.key).sort()).toEqual(["2", "4"]);
    });
});
