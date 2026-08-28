import { Request, Response, NextFunction } from "express";
import { transact as transactRpc } from "src/grpc/moneyMovementClient";
import { BadRequestError, toHttpError } from "src/utils/errors";

export async function transact(req: Request, res: Response, next: NextFunction) {
    const idempotencyKey = req.header("Idempotency-Key");
    const { to_user_id, amount } = req.body ?? {};

    if (!idempotencyKey) {
        return next(new BadRequestError("Idempotency-Key header is required"));
    }
    if (!to_user_id || !amount) {
        return next(new BadRequestError("to_user_id and amount are required"));
    }

    // req.userId must be set by an authentication middleware
    const fromUserId = req.userId!;

    try {
        const transactionId = await transactRpc({
            idempotencyKey,
            fromUserId,
            toUserId: to_user_id,
            amount: String(amount),
        });
        return res.status(200).json({ transaction_id: transactionId });
    } catch (err) {
        next(toHttpError(err));
    }
}
