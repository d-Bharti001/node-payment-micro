import * as grpc from "@grpc/grpc-js";

export class BadRequestError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = "BadRequestError";
        this.statusCode = 400;
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

export class UnauthorizedError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = "UnauthorizedError";
        this.statusCode = 401;
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class NotFoundError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
        this.statusCode = 404;
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class ConflictError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = "ConflictError";
        this.statusCode = 409;
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class InternalServerError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = "InternalServerError";
        this.statusCode = 500;
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}

export function isErrorDueToClient(err: Error) {
    return (
        err instanceof BadRequestError ||
        err instanceof UnauthorizedError ||
        err instanceof NotFoundError ||
        err instanceof ConflictError
    );
}

export function toHttpError(err: unknown): Error {
    if (!(err instanceof Error) || !("code" in err)) {
        return new InternalServerError("something went wrong");
    }

    const grpcErr = err as grpc.ServiceError;

    switch (grpcErr.code) {
        case grpc.status.UNAUTHENTICATED:
            return new UnauthorizedError(grpcErr.details ?? "unauthenticated");
        case grpc.status.NOT_FOUND:
            return new NotFoundError(grpcErr.details ?? "not found");
        case grpc.status.INVALID_ARGUMENT:
            return new BadRequestError(grpcErr.details ?? "invalid request");
        case grpc.status.FAILED_PRECONDITION:
            return new ConflictError(grpcErr.details ?? "request could not be completed");
        default:
            return new InternalServerError(grpcErr.details ?? "something went wrong");
    }
}
