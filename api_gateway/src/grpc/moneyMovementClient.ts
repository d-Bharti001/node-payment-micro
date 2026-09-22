import path from "path";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import type { ProtoGrpcType } from "proto/money_movement/money_movement";
import type { MoneyMovementServiceClient } from "proto/money_movement/money_movement/MoneyMovementService";

import { MONEY_MOVEMENT_GRPC_HOSTNAME, MONEY_MOVEMENT_GRPC_PORT } from "src/config/config";

const PROTO_PATH = path.resolve(__dirname, "../../proto/money_movement/money_movement.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

const client: MoneyMovementServiceClient = new proto.money_movement.MoneyMovementService(
    `${MONEY_MOVEMENT_GRPC_HOSTNAME}:${MONEY_MOVEMENT_GRPC_PORT}`,
    grpc.credentials.createInsecure(),
);

export function getBalance(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        client.getBalance({ userId }, (err, response) => {
            if (err) return reject(err);
            resolve(response!.balance!);
        });
    });
}

export interface TransactParams {
    idempotencyKey: string;
    fromUserId: string;
    toUserId: string;
    amount: string;
}

export function transact({
    idempotencyKey,
    fromUserId,
    toUserId,
    amount,
}: TransactParams): Promise<string> {
    return new Promise((resolve, reject) => {
        client.transact({ idempotencyKey, fromUserId, toUserId, amount }, (err, response) => {
            if (err) return reject(err);
            resolve(response!.transactionId!);
        });
    });
}
