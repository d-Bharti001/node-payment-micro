import bcrypt from "bcrypt";
import grpc from "@grpc/grpc-js";
import type { AuthServiceHandlers } from "proto/auth/AuthService";
import { getUserByUserId } from "src/repository/user/getUser";
import { createJWT } from "src/utils/jwt";
import { JwtError, ResourceNotFoundError } from "src/utils/errors";

export const loginUser: AuthServiceHandlers["LoginUser"] = async function (call, callback) {
    try {
        const { userId, password } = call.request;

        if (!userId || !password) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "User ID and Password are required",
            });
        }

        const user = await getUserByUserId(userId);

        const matched = await bcrypt.compare(password, user["password_hashed"]);

        if (!matched) {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                message: "invalid credentials",
            });
        }

        const token = await createJWT(user["user_id"]);

        return callback(null, { jwt: token });
    } catch (err) {
        if (err instanceof JwtError) {
            return callback({
                code: err.code,
                message: err.message ?? "jwt cannot be created",
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
