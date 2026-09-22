import grpc from "@grpc/grpc-js";
import type { MoneyMovementServiceHandlers } from "proto/money_movement/MoneyMovementService";

import dbPool from "src/database/connection";
import { getBalance as getBalanceRow } from "src/repository/balance/getBalance";
import { ResourceNotFoundError } from "src/utils/errors";

export const getBalance: MoneyMovementServiceHandlers["GetBalance"] = async function (
    call,
    callback,
) {
    try {
        const { userId } = call.request;

        if (!userId) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "User ID is required",
            });
        }

        const conn = await dbPool.getConnection();
        let row;
        try {
            row = await getBalanceRow(conn, userId);
        } finally {
            conn.release();
        }

        if (!row) {
            throw new ResourceNotFoundError(
                grpc.status.NOT_FOUND,
                `no balance found for user: ${userId}`,
            );
        }

        return callback(null, { balance: row.balance });
    } catch (err) {
        if (err instanceof ResourceNotFoundError) {
            return callback({ code: err.code, message: err.message });
        }
        return callback({
            code: grpc.status.INTERNAL,
            message: (err as Error).message ?? "something went wrong",
        });
    }
};
