import { Request, Response, NextFunction } from "express";
import { loginUser } from "src/grpc/authClient";
import { BadRequestError, toHttpError } from "src/utils/errors";

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
