import { Kafka } from "kafkajs";

import { KAFKA_BROKERS, KAFKA_CLIENT_ID } from "src/config/config";

const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS,
});

const producer = kafka.producer();
let connected = false;

export interface KafkaTopicMessage {
    topic: string;
    key: string;
    value: string;
}

type KafkaMessage = Omit<KafkaTopicMessage, "topic">;

export async function connectProducer(): Promise<void> {
    if (connected) return;
    await producer.connect();
    connected = true;
}

export async function disconnectProducer(): Promise<void> {
    if (!connected) return;
    await producer.disconnect();
    connected = false;
}

export async function sendMessages(messages: KafkaTopicMessage[]): Promise<void> {
    const topicsMap = new Map<string, KafkaMessage[]>();
    for (const message of messages) {
        if (!topicsMap.has(message.topic)) {
            topicsMap.set(message.topic, []);
        }
        topicsMap.get(message.topic)?.push({
            key: message.key,
            value: message.value,
        });
    }
    const topicMessages = Array.from(topicsMap.entries()).map(([topic, messages]) => ({
        topic,
        messages,
    }));

    await producer.sendBatch({ topicMessages });
}
