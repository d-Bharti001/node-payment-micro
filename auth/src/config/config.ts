import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    GRPC_PORT: z.coerce.number().int().positive(),
    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: z.coerce.number().int().positive(),
    MYSQL_DATABASE: z.string().min(1),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string().min(1),
    JWT_SIGNING_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

const env = parsed.data;

export const DEVELOPMENT = env.NODE_ENV === "development";
export const TEST = env.NODE_ENV === "test";

export const GRPC_PORT = env.GRPC_PORT;

export const MYSQL_HOST = env.MYSQL_HOST;
export const MYSQL_PORT = env.MYSQL_PORT;
export const MYSQL_DATABASE = env.MYSQL_DATABASE;
export const MYSQL_USER = env.MYSQL_USER;
export const MYSQL_PASSWORD = env.MYSQL_PASSWORD;

export const JWT_SIGNING_KEY = env.JWT_SIGNING_KEY;
