import { Request, Response, NextFunction } from "express";
import { getBalance as getBalanceRpc } from "src/grpc/moneyMovementClient";
import { toHttpError } from "src/utils/errors";

/**
 * @openapi
 * /balance:
 *   get:
 *     summary: Get the signed-in user's balance
 *     description: Returns the current balance of the authenticated caller.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: string
 *       401:
 *         description: Missing or invalid Authorization header
 *       404:
 *         description: No balance record for this user
 *       500:
 *         description: Something went wrong
 */
export async function getBalance(req: Request, res: Response, next: NextFunction) {
    try {
        const balance = await getBalanceRpc(req.userId!);
        return res.status(200).json({ balance });
    } catch (err) {
        next(toHttpError(err));
    }
}
