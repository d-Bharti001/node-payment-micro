import { afterAll, beforeEach, describe, expect, it } from "vitest";
import dbPool from "src/database/connection";
import type { KafkaTopicMessage } from "src/kafka/producer";
import { pollOnce } from "src/outbox/pollOnce";
import { outboxRows, resetDb, seedOutbox } from "./helpers";

afterAll(() => dbPool.end());
beforeEach(() => resetDb());

// A fake Kafka producer that records every batch it is asked to send.
function fakeProducer() {
    const batches: KafkaTopicMessage[][] = [];
    return {
        batches,
        send: async (messages: KafkaTopicMessage[]) => {
            batches.push(messages);
        },
        keys: () => batches.flat().map((m) => m.key),
    };
}

// The payload money_movement's transact() writes into the outbox.
const event = (n: number) => ({
    key: String(n),
    payload: { transactionId: n, fromUserId: "a@x.com", toUserId: "b@x.com", amount: "100" },
});

describe("pollOnce: publishing", () => {
    it("publishes unpublished events oldest first and marks them published", async () => {
        await seedOutbox([event(1), event(2), event(3)]);
        const producer = fakeProducer();

        await pollOnce(producer.send, 10);

        expect(producer.keys()).toEqual(["1", "2", "3"]);
        const rows = await outboxRows();
        expect(rows.every((r) => r.published_at !== null)).toBe(true);
    });

    it("never re-sends an event that was already published", async () => {
        await seedOutbox([event(1), event(2)]);
        const producer = fakeProducer();

        await pollOnce(producer.send, 10);
        await pollOnce(producer.send, 10);

        expect(producer.batches).toHaveLength(1);
    });

    it("does not call the producer when there is nothing to publish", async () => {
        const producer = fakeProducer();

        await pollOnce(producer.send, 10);

        expect(producer.batches).toEqual([]);
    });

    it("respects the batch size and keeps the order across polls", async () => {
        await seedOutbox(Array.from({ length: 10 }, (_, i) => event(i + 1)));
        const producer = fakeProducer();

        await pollOnce(producer.send, 3);
        expect(producer.keys()).toEqual(["1", "2", "3"]);

        await pollOnce(producer.send, 3);
        expect(producer.keys()).toEqual(["1", "2", "3", "4", "5", "6"]);
        expect((await outboxRows()).filter((r) => r.published_at === null)).toHaveLength(4);
    });
});

describe("pollOnce: message format (what ledger and email decode)", () => {
    it("publishes to the row's topic, keyed by message_key, with createdAt merged into the payload", async () => {
        await seedOutbox([event(1)]);
        const producer = fakeProducer();

        await pollOnce(producer.send, 10);

        const [message] = producer.batches[0];
        expect(message.topic).toBe("payments");
        expect(message.key).toBe("1");
        expect(JSON.parse(message.value)).toEqual({
            createdAt: expect.any(String),
            transactionId: 1,
            fromUserId: "a@x.com",
            toUserId: "b@x.com",
            amount: "100", // a string, as the consumers require
        });
    });

    it("sets createdAt to when the event was created, not when it was published", async () => {
        await seedOutbox([event(1)]);
        const [row] = await outboxRows();
        const producer = fakeProducer();

        await pollOnce(producer.send, 10);

        // compared with what the same connection pool reads back, so the test does not depend on
        // the machine's timezone
        expect(new Date(JSON.parse(producer.batches[0][0].value).createdAt).getTime()).toBe(
            row.created_at.getTime(),
        );
    });

    it("puts a payload that is not a JSON object under an `info` key", async () => {
        await seedOutbox([
            { key: "1", payload: ["a", "b"] },
            { key: "2", payload: "just text" },
        ]);
        const producer = fakeProducer();

        await pollOnce(producer.send, 10);

        expect(producer.batches[0].map((m) => JSON.parse(m.value).info)).toEqual([
            ["a", "b"],
            "just text",
        ]);
    });
});

describe("pollOnce: failures", () => {
    it("leaves events unpublished when sending fails, and the next poll retries them", async () => {
        await seedOutbox([event(1), event(2)]);

        await expect(
            pollOnce(async () => {
                throw new Error("kafka down");
            }, 10),
        ).rejects.toThrow("kafka down");
        expect((await outboxRows()).every((r) => r.published_at === null)).toBe(true);

        const producer = fakeProducer();
        await pollOnce(producer.send, 10);

        expect(producer.keys()).toEqual(["1", "2"]);
        expect((await outboxRows()).every((r) => r.published_at !== null)).toBe(true);
    });
});

describe("pollOnce: several relays at once (replicas: 2)", () => {
    it("never publish the same event twice, thanks to SKIP LOCKED", async () => {
        await seedOutbox(Array.from({ length: 10 }, (_, i) => event(i + 1)));

        // Each relay holds its claimed rows locked inside its transaction while it "sends". The
        // barrier keeps both inside that window at the same time; if the second relay were blocked
        // by the first one's row locks it would never get here and this test would fail.
        const claimedBy: string[][] = [];
        let arrived = 0;
        let release!: () => void;
        const bothClaimed = new Promise<void>((resolve) => (release = resolve));
        const neverArrived = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("the second relay never claimed any rows")), 8_000),
        );

        const send = async (messages: KafkaTopicMessage[]) => {
            claimedBy.push(messages.map((m) => m.key));
            if (++arrived === 2) release();
            await Promise.race([bothClaimed, neverArrived]);
        };

        await Promise.all([pollOnce(send, 5), pollOnce(send, 5)]);

        expect(claimedBy.map((keys) => keys.length)).toEqual([5, 5]);
        const all = claimedBy.flat().sort((a, b) => Number(a) - Number(b));
        expect(all).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 1)));
        expect((await outboxRows()).every((r) => r.published_at !== null)).toBe(true);
    });
});
