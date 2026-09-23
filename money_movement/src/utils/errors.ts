import * as grpc from "@grpc/grpc-js";

export class ResourceNotFoundError extends Error {
    code: grpc.status;

    constructor(code: grpc.status, message: string) {
        super(message);
        this.name = "ResourceNotFoundError";
        this.code = code;
        Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
    }
}

export class InsufficientBalanceError extends Error {
    code: grpc.status;

    constructor(message: string) {
        super(message);
        this.name = "InsufficientBalanceError";
        this.code = grpc.status.FAILED_PRECONDITION;
        Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
    }
}

// mysql2 sets .code to the MySQL error name (e.g. "ER_DUP_ENTRY" for errno 1062)
// on the Error it throws/rejects with. See mysql2/lib/packets/packet.js:asError.
export function isDuplicateEntryError(err: unknown): boolean {
    return err instanceof Error && (err as NodeJS.ErrnoException).code === "ER_DUP_ENTRY";
}
