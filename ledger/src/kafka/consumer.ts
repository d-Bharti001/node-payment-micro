import type { EachMessageHandler } from "kafkajs";
import { Kafka } from "kafkajs";

import { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID, KAFKA_TOPIC } from "src/config/config";

const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({
    groupId: KAFKA_GROUP_ID,
});

let connected = false;

export async function startConsumer(messageHandler: EachMessageHandler) {
    if (connected) {
        return;
    }

    await consumer.connect();

    await consumer.subscribe({
        topic: KAFKA_TOPIC,
        fromBeginning: true,
    });

    await consumer.run({ eachMessage: messageHandler });

    connected = true;
}

export async function stopConsumer() {
    if (!connected) {
        return;
    }

    await consumer.disconnect();

    connected = false;
}
