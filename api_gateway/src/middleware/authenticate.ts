import { Request, Response, NextFunction } from "express";
import { validateToken } from "src/grpc/authClient";
import { UnauthorizedError, toHttpError } from "src/utils/errors";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new UnauthorizedError("missing or malformed Authorization header"));
    }

    const jwt = authHeader.slice("Bearer ".length);

    try {
        req.userId = await validateToken(jwt);
        next();
    } catch (err) {
        next(toHttpError(err));
    }
}
