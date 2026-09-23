import * as grpc from "@grpc/grpc-js";
import type { MoneyMovementServiceHandlers } from "proto/money_movement/MoneyMovementService";

import { withTransaction } from "src/database/withTransaction";
import { creditBalance } from "src/repository/balance/creditBalance";
import { debitBalance } from "src/repository/balance/debitBalance";
import { insertOutboxEvent } from "src/repository/outbox/insertOutboxEvent";
import { getByIdempotencyKey } from "src/repository/transaction/getByIdempotencyKey";
import { insertTransaction } from "src/repository/transaction/insertTransaction";
import {
    InsufficientBalanceError,
    ResourceNotFoundError,
    isDuplicateEntryError,
} from "src/utils/errors";

// Positive integer, no sign, no decimal point, no leading zeros/scientific notation
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export const transact: MoneyMovementServiceHandlers["Transact"] = async function (call, callback) {
    try {
        const { idempotencyKey, fromUserId, toUserId, amount: amountStr } = call.request;

        if (
            !idempotencyKey ||
            !fromUserId ||
            !toUserId ||
            !amountStr ||
            !POSITIVE_INTEGER_PATTERN.test(amountStr)
        ) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message:
                    "Idempotency key, From User ID, To User ID, and a positive integer amount are required",
            });
        }

        if (fromUserId === toUserId) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "transfer to same account is not allowed",
            });
        }

        const amount = BigInt(amountStr);

        const transactionId = await withTransaction(async (conn) => {
            try {
                const insertId = await insertTransaction(conn, {
                    idempotencyKey,
                    fromUserId,
                    toUserId,
                    amount,
                    status: "completed",
                });

                // Lock the two balances rows in a fixed order (independent of
                // which side is debited/credited), so two concurrent transfers
                // running in opposite directions between the same two users
                // can't deadlock on each other's locks.
                if (fromUserId < toUserId) {
                    await debitBalance(conn, fromUserId, amount);
                    await creditBalance(conn, toUserId, amount);
                } else {
                    await creditBalance(conn, toUserId, amount);
                    await debitBalance(conn, fromUserId, amount);
                }

                await insertOutboxEvent(conn, {
                    key: String(insertId),
                    payload: {
                        transactionId: insertId,
                        fromUserId,
                        toUserId,
                        amount: amount.toString(),
                    },
                });

                return insertId;
            } catch (err) {
                if (isDuplicateEntryError(err)) {
                    // Another attempt with this same idempotency key already
                    // ran to completion (InnoDB's unique-index lock made this
                    // INSERT wait for it to commit/rollback before failing) -
                    // return that attempt's outcome instead of processing again.
                    const existing = await getByIdempotencyKey(conn, fromUserId, idempotencyKey);
                    if (existing) {
                        return existing.id;
                    }
                }
                throw err;
            }
        });

        return callback(null, { transactionId });
    } catch (err) {
        if (err instanceof ResourceNotFoundError) {
            return callback({ code: err.code, message: err.message });
        }
        if (err instanceof InsufficientBalanceError) {
            return callback({ code: err.code, message: err.message });
        }
        return callback({
            code: grpc.status.INTERNAL,
            message: (err as Error).message ?? "something went wrong",
        });
    }
};
