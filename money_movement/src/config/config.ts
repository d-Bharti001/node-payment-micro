const NODE_ENV = process.env.NODE_ENV!;

export const DEVELOPMENT = NODE_ENV === "development";
export const TEST = NODE_ENV === "test";

export const GRPC_PORT = Number(process.env.GRPC_PORT!);

export const MYSQL_HOST = process.env.MYSQL_HOST!;
export const MYSQL_PORT = Number(process.env.MYSQL_PORT!);
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE!;
export const MYSQL_USER = process.env.MYSQL_USER!;
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD!;

export const KAFKA_BROKERS = process.env.KAFKA_BROKERS!.split(",");
export const OUTBOX_POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000);
export const OUTBOX_POLL_BATCH_SIZE = Number(process.env.OUTBOX_POLL_BATCH_SIZE ?? 20);

export const KAFKA_CLIENT_ID = "money-movement";
export const KAFKA_TOPIC = "payments";
