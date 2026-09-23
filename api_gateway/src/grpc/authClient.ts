import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { ProtoGrpcType } from "proto/auth/auth";
import type { AuthServiceClient } from "proto/auth/auth/AuthService";

import { AUTH_GRPC_HOSTNAME, AUTH_GRPC_PORT } from "src/config/config";

const PROTO_PATH = path.resolve(__dirname, "../../proto/auth/auth.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

const client: AuthServiceClient = new proto.auth.AuthService(
    `${AUTH_GRPC_HOSTNAME}:${AUTH_GRPC_PORT}`,
    grpc.credentials.createInsecure(),
);

export function loginUser(userId: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        client.loginUser({ userId, password }, (err, response) => {
            if (err) return reject(err);
            resolve(response!.jwt!);
        });
    });
}

export function validateToken(jwt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        client.validateToken({ jwt }, (err, response) => {
            if (err) return reject(err);
            resolve(response!.userId!);
        });
    });
}
