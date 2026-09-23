import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { ProtoGrpcType } from "proto/auth";
import { AuthServiceHandler } from "src/handlers/auth";

export async function createGrpcServer(): Promise<grpc.Server> {
    const PROTO_PATH = path.resolve(__dirname, "../proto/auth.proto");
    const packageDefinition = await protoLoader.load(PROTO_PATH, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

    const server = new grpc.Server();
    server.addService(proto.auth.AuthService.service, AuthServiceHandler);

    return server;
}
