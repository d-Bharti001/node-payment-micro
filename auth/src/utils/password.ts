import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export function hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}
