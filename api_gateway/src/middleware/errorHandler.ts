import { NextFunction, Request, Response } from "express";
import { isErrorDueToClient } from "src/utils/errors";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    let statusCode: number = 500;
    let message: string = "something went wrong";

    let logError = true;

    if (isErrorDueToClient(err)) {
        statusCode = err.statusCode;
        message = err.message;
        logError = false;
    }

    if (logError) {
        // Log error for server debugging purposes
        logger.error(err);
    }

    return res.status(statusCode).json({ error: message });
}
