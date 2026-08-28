import { Request, Response, NextFunction } from "express";
import { transact as transactRpc } from "src/grpc/moneyMovementClient";
import { BadRequestError, toHttpError } from "src/utils/errors";

/**
 * @openapi
 * /transact:
 *   post:
 *     summary: Transfer money to another user
 *     description: Transfers the given amount from the authenticated caller to the specified recipient.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Client-generated key that prevents a retried request from being processed twice.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to_user_id, amount]
 *             properties:
 *               to_user_id:
 *                 type: string
 *                 description: user_id of the recipient.
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Amount to transfer, in the smallest currency unit. Must be a positive integer.
 *     responses:
 *       200:
 *         description: Transaction completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transaction_id:
 *                   type: string
 *       400:
 *         description: Idempotency-Key header or body fields missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Missing, malformed, invalid, or expired Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Request could not be completed due to a failed precondition, e.g. insufficient funds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Unexpected server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
