import { Request, Response, NextFunction } from "express";
import { loginUser } from "src/grpc/authClient";
import { BadRequestError, toHttpError } from "src/utils/errors";

/**
 * @openapi
 * /login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user with their user ID and password. Required before initiating a payment.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, password]
 *             properties:
 *               user_id:
 *                 type: string
 *                 example: georgio@email.com
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jwt:
 *                   type: string
 *                   description: Bearer token to use for authenticated requests.
 *       400:
 *         description: user_id or password missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
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
export async function login(req: Request, res: Response, next: NextFunction) {
    const { user_id, password } = req.body ?? {};

    if (!user_id || !password) {
        return next(new BadRequestError("user_id and password are required"));
    }

    try {
        const jwt = await loginUser(user_id, password);
        return res.status(200).json({ jwt });
    } catch (err) {
        next(toHttpError(err));
    }
}
