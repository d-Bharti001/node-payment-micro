import grpc from "@grpc/grpc-js";
import type { AuthServiceHandlers } from "proto/auth/AuthService";
import { getUserByUserId } from "src/repository/user/getUser";
import { JwtError, ResourceNotFoundError } from "src/utils/errors";
import { verifyJWT } from "src/utils/jwt";

export const validateToken: AuthServiceHandlers["ValidateToken"] = async function (call, callback) {
    try {
        const { jwt } = call.request;

        if (!jwt) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "token missing",
            });
        }

        const userId = await verifyJWT(jwt);

        const user = await getUserByUserId(userId);

        return callback(null, { userId: user["user_id"] });
    } catch (err) {
        if (err instanceof JwtError) {
            return callback({
                code: err.code,
                message: err.message ?? "token verification failed",
            });
        }
        if (err instanceof ResourceNotFoundError) {
            return callback({
                code: err.code,
                message: err.message,
            });
        }
        return callback({
            code: grpc.status.INTERNAL,
            message: (err as Error).message ?? "something went wrong",
        });
    }
};
