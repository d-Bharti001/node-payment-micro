const NODE_ENV = process.env.NODE_ENV!;

export const DEVELOPMENT = NODE_ENV === "development";
export const TEST = NODE_ENV === "test";

export const SERVER_PORT = Number(process.env.SERVER_PORT!);

export const AUTH_GRPC_HOSTNAME = process.env.AUTH_GRPC_HOSTNAME!;
export const AUTH_GRPC_PORT = process.env.AUTH_GRPC_PORT!;

export const MONEY_MOVEMENT_GRPC_HOSTNAME = process.env.MONEY_MOVEMENT_GRPC_HOSTNAME!;
export const MONEY_MOVEMENT_GRPC_PORT = process.env.MONEY_MOVEMENT_GRPC_PORT!;
