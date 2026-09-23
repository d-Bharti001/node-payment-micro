const NODE_ENV = process.env.NODE_ENV!;

export const DEVELOPMENT = NODE_ENV === "development";
export const TEST = NODE_ENV === "test";

export const SMTP_HOST = process.env.SMTP_HOST!;
export const SMTP_PORT = Number(process.env.SMTP_PORT!);
export const SENDER_EMAIL = process.env.SENDER_EMAIL!;

export const KAFKA_BROKERS = process.env.KAFKA_BROKERS!.split(",");

export const KAFKA_CLIENT_ID = "email";
export const KAFKA_TOPIC = "payments";
export const KAFKA_GROUP_ID = "email-group";
