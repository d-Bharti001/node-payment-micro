import type { AuthServiceHandlers } from "proto/auth/AuthService";
import { loginUser } from "./loginUser";
import { validateToken } from "./validateToken";

export const AuthServiceHandler: AuthServiceHandlers = {
    LoginUser: loginUser,
    ValidateToken: validateToken,
};
