import grpc from "@grpc/grpc-js";
import jwt from "jsonwebtoken";

import { JWT_SIGNING_KEY } from "src/config/config";
import { JwtError } from "src/utils/errors";

const ISSUER = "auth-service";
const EXPIRES_IN = "3h";

export function createJWT(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(
            {},
            JWT_SIGNING_KEY,
            {
                algorithm: "HS256",
                issuer: ISSUER,
                subject: userId,
                expiresIn: EXPIRES_IN,
            },
            (err, token) => {
                if (err || !token) {
                    return reject(
                        new JwtError(grpc.status.INTERNAL, err?.message ?? "failed to sign token"),
                    );
                }
                resolve(token);
            },
        );
    });
}

export function verifyJWT(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            JWT_SIGNING_KEY,
            { algorithms: ["HS256"], issuer: ISSUER },
            (err, claims) => {
                if (err) {
                    if (err instanceof jwt.TokenExpiredError) {
                        return reject(new JwtError(grpc.status.UNAUTHENTICATED, "token expired"));
                    }
                    return reject(new JwtError(grpc.status.UNAUTHENTICATED, "unauthenticated"));
                }

                const sub = (claims as jwt.JwtPayload)?.sub;
                if (!sub) {
                    return reject(new JwtError(grpc.status.INTERNAL, "claims missing subject"));
                }

                resolve(sub);
            },
        );
    });
}
