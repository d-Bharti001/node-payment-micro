import dbPool from "src/database/connection";
import { loginUser } from "src/handlers/auth/loginUser";
import { validateToken } from "src/handlers/auth/validateToken";
import { hashPassword } from "src/utils/password";

export interface GrpcResult {
    err: any;
    res: any;
}

// Invokes a gRPC handler directly, the way the gRPC server would.
function invoke(handler: any, request: Record<string, unknown>): Promise<GrpcResult> {
    return new Promise((resolve) => {
        handler({ request }, (err: any, res: any) => resolve({ err, res }));
    });
}

export const callLogin = (userId: string, password: string) =>
    invoke(loginUser, { userId, password });
export const callValidateToken = (jwt: string) => invoke(validateToken, { jwt });

// Wipes the users table and seeds the given { userId: plaintextPassword } pairs (hashed).
export async function resetUsers(users: Record<string, string> = {}) {
    await dbPool.query("TRUNCATE TABLE users");
    for (const [userId, password] of Object.entries(users)) {
        await dbPool.execute("INSERT INTO users (user_id, password_hashed) VALUES (?, ?)", [
            userId,
            await hashPassword(password),
        ]);
    }
}

export async function deleteUser(userId: string) {
    await dbPool.execute("DELETE FROM users WHERE user_id = ?", [userId]);
}
