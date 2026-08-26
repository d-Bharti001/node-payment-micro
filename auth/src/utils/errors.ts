import grpc from "@grpc/grpc-js";

export class ResourceNotFoundError extends Error {
    code: grpc.status;

    constructor(code: grpc.status, message: string) {
        super(message);
        this.name = "ResourceNotFoundError";
        this.code = code;
        Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
    }
}

export class JwtError extends Error {
    code: grpc.status;

    constructor(code: grpc.status, message: string) {
        super(message);
        this.name = "JwtError";
        this.code = code;
        Object.setPrototypeOf(this, JwtError.prototype);
    }
}
