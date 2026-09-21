import type { EachMessagePayload } from "kafkajs";
import "src/utils/logger";
import { KAFKA_TOPIC } from "src/config/config";
import { consumer } from "src/kafka/consumer";
import { insertLedgerEntries } from "src/repository/ledger/insertLedgerEntries";
import { PaymentsTopicMessageValue } from "src/kafka/payload";

const POSITIVE_INTEGER_PATTERN = /^(0|[1-9]\d*)$/;

let consumerConnected = false;

function decodePaymentsMessage(raw: Buffer): PaymentsTopicMessageValue {
    const parsed = JSON.parse(raw.toString());

    if (typeof parsed !== "object" || parsed === null) {
        throw new Error("payments message is not a JSON object");
    }

    const { transactionId, fromUserId, toUserId, amount, createdAt } = parsed;

    if (typeof transactionId !== "number" || !Number.isInteger(transactionId)) {
        throw new Error(`invalid transactionId: ${transactionId}`);
    }
    if (typeof fromUserId !== "string" || fromUserId === "") {
        throw new Error(`invalid fromUserId: ${fromUserId}`);
    }
    if (typeof toUserId !== "string" || toUserId === "") {
        throw new Error(`invalid toUserId: ${toUserId}`);
    }
    if (typeof amount !== "string" || !POSITIVE_INTEGER_PATTERN.test(amount)) {
        throw new Error(`invalid amount: ${amount}`);
    }

    const parsedCreatedAt = new Date(createdAt);
    if (Number.isNaN(parsedCreatedAt.getTime())) {
        throw new Error(`invalid createdAt: ${createdAt}`);
    }

    return {
        transactionId,
        fromUserId,
        toUserId,
        amount: BigInt(amount),
        createdAt: parsedCreatedAt,
    };
}

async function messageHandler({ message }: EachMessagePayload) {
    if (message.value === null) {
        logger.warn("received payments message with no value, skipping");
        return;
    }

    let payload: PaymentsTopicMessageValue;
    try {
        payload = decodePaymentsMessage(message.value);
    } catch (err) {
        logger.warn(`failed to decode payments message: ${err}`);
        return;
    }

    await insertLedgerEntries({
        transactionId: payload.transactionId,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
        amount: payload.amount,
        transactionTimestamp: payload.createdAt,
    });
}

export async function startConsumer() {
    await consumer.connect();
    consumerConnected = true;

    await consumer.subscribe({
        topic: KAFKA_TOPIC,
        fromBeginning: true,
    });

    await consumer.run({ eachMessage: messageHandler });
}

export async function stopConsumer() {
    if (consumerConnected) {
        await consumer.disconnect();
    }
}
