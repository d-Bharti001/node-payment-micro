import * as grpc from "@grpc/grpc-js";
import { vi } from "vitest";
// errorHandler.ts logs through the global `logger` and relies on server.ts having created it;
// the tests load the app without server.ts, so they have to create it too.
import "src/utils/logger";
import { loginUser, validateToken } from "src/grpc/authClient";
import { getBalance, transact } from "src/grpc/moneyMovementClient";

// The test file must replace both gRPC client modules with vi.fn() stubs (vi.mock), so these are
// the fakes standing in for the auth and money_movement services.
export const authService = {
    loginUser: vi.mocked(loginUser),
    validateToken: vi.mocked(validateToken),
};
export const moneyMovementService = {
    getBalance: vi.mocked(getBalance),
    transact: vi.mocked(transact),
};

// What @grpc/grpc-js rejects with when a service answers with an error status.
export function grpcError(code: grpc.status, details: string) {
    return Object.assign(new Error(`${code} ${details}`), { code, details });
}

// Makes the auth service accept any token as `userId`, and returns the headers to send.
export function signedInAs(userId: string) {
    authService.validateToken.mockResolvedValue(userId);
    return { Authorization: "Bearer test-token" };
}
