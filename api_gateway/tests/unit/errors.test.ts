import * as grpc from "@grpc/grpc-js";
import { describe, expect, it } from "vitest";
import {
    BadRequestError,
    ConflictError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
    isErrorDueToClient,
    toHttpError,
} from "src/utils/errors";

// What @grpc/grpc-js rejects with: `details` is the raw message from the service, while
// `message` has a "3 INVALID_ARGUMENT: ..." prefix added.
const grpcError = (code: grpc.status, details?: string) =>
    Object.assign(new Error(`${code} prefix: ${details}`), { code, details });

describe("toHttpError: gRPC status to HTTP error", () => {
    it.each([
        ["UNAUTHENTICATED", 401, grpc.status.UNAUTHENTICATED, UnauthorizedError],
        ["NOT_FOUND", 404, grpc.status.NOT_FOUND, NotFoundError],
        ["INVALID_ARGUMENT", 400, grpc.status.INVALID_ARGUMENT, BadRequestError],
        ["FAILED_PRECONDITION", 409, grpc.status.FAILED_PRECONDITION, ConflictError],
        ["INTERNAL", 500, grpc.status.INTERNAL, InternalServerError],
        ["UNAVAILABLE", 500, grpc.status.UNAVAILABLE, InternalServerError],
    ])("maps %s to HTTP %i", (_name, statusCode, code, ErrorClass) => {
        const err = toHttpError(grpcError(code, "some details"));

        expect(err).toBeInstanceOf(ErrorClass);
        expect((err as any).statusCode).toBe(statusCode);
    });

    it("uses the service's raw details as the message, without the gRPC prefix", () => {
        const err = toHttpError(grpcError(grpc.status.INVALID_ARGUMENT, "amount must be positive"));

        expect(err.message).toBe("amount must be positive");
    });

    it("falls back to a default message when the service gave no details", () => {
        expect(toHttpError(grpcError(grpc.status.NOT_FOUND)).message).toBe("not found");
    });

    it.each([
        ["a plain Error", new Error("boom")],
        ["a string", "boom"],
        ["undefined", undefined],
    ])("turns %s into a generic 500", (_name, thrown) => {
        const err = toHttpError(thrown);

        expect(err).toBeInstanceOf(InternalServerError);
        expect(err.message).toBe("something went wrong");
    });
});

describe("isErrorDueToClient", () => {
    it.each([
        ["BadRequestError", new BadRequestError("x")],
        ["UnauthorizedError", new UnauthorizedError("x")],
        ["NotFoundError", new NotFoundError("x")],
        ["ConflictError", new ConflictError("x")],
    ])("is true for %s", (_name, err) => {
        expect(isErrorDueToClient(err)).toBe(true);
    });

    it.each([
        ["InternalServerError", new InternalServerError("x")],
        ["a plain Error", new Error("x")],
    ])("is false for %s", (_name, err) => {
        expect(isErrorDueToClient(err)).toBe(false);
    });
});
