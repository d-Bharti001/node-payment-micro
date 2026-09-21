import { Kafka } from "kafkajs";

import { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID, KAFKA_TOPIC } from "src/config/config";

const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS,
});

export const consumer = kafka.consumer({
    groupId: KAFKA_GROUP_ID,
});
