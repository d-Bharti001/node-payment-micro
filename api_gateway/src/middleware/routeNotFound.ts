import { Request, Response, NextFunction } from "express";
import { NotFoundError } from "src/utils/errors";

export function routeNotFoundHandler(req: Request, res: Response, next: NextFunction) {
    return next(new NotFoundError("Route not found"));
}
