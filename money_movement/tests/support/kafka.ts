import net from "node:net";
import { GenericContainer, Wait } from "testcontainers";
import { Kafka, logLevel } from "kafkajs";

function availablePort(): Promise<number> {
    return new Promise((resolve) => {
        const server = net.createServer().listen(0, () => {
            const { port } = server.address() as net.AddressInfo;
            server.close(() => resolve(port));
        });
    });
}

export const kafkaClient = () =>
    new Kafka({
        clientId: "test",
        brokers: process.env.KAFKA_BROKERS!.split(","),
        logLevel: logLevel.NOTHING,
    });

export async function createTopic(topic: string, numPartitions = 3) {
    const admin = kafkaClient().admin();
    await admin.connect();
    await admin.createTopics({
        waitForLeaders: true,
        topics: [{ topic, numPartitions }],
    });
    await admin.disconnect();
}

// Starts one broker, sets KAFKA_BROKERS for the tests, and returns a function that stops it
export async function startKafka(): Promise<() => Promise<void>> {
    // The broker must advertise the port it is reachable on from the host,
    // so pick a free port up front and bind the container's 9092 to it
    const port = await availablePort();
    const container = await new GenericContainer("apache/kafka-native:3.8.0")
        .withExposedPorts({ container: 9092, host: port })
        .withEnvironment({
            CLUSTER_ID: "5L6g3nShT-eMCtK--X86sw",
            KAFKA_NODE_ID: "1",
            KAFKA_PROCESS_ROLES: "broker,controller",
            KAFKA_LISTENERS: "PLAINTEXT://:9092,CONTROLLER://:9093",
            KAFKA_ADVERTISED_LISTENERS: `PLAINTEXT://localhost:${port}`,
            KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT",
            KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER",
            KAFKA_CONTROLLER_QUORUM_VOTERS: "1@localhost:9093",
            KAFKA_INTER_BROKER_LISTENER_NAME: "PLAINTEXT",
            KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: "1",
            KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: "1",
            KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: "1",
            KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: "0", // consumers join their group at once
        })
        .withWaitStrategy(Wait.forLogMessage(/Kafka Server started/))
        .start();

    process.env.KAFKA_BROKERS = `localhost:${port}`;

    return async () => {
        await container.stop();
    };
}
