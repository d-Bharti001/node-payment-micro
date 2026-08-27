import path from "path";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import type { ProtoGrpcType } from "proto/money_movement";
import { MoneyMovementServiceHandler } from "src/handlers";

export async function createGrpcServer(): Promise<grpc.Server> {
    const PROTO_PATH = path.resolve(__dirname, "../proto/money_movement.proto");
    const packageDefinition = await protoLoader.load(PROTO_PATH, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

    const server = new grpc.Server();
    server.addService(
        proto.money_movement.MoneyMovementService.service,
        MoneyMovementServiceHandler,
    );

    return server;
}
