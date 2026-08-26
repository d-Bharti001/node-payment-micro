import dbPool from "src/database/connection";
import { hashPassword } from "src/utils/password";

interface SeedUser {
    userId: string;
    password: string;
}

const SEED_USERS: SeedUser[] = [
    { userId: "georgio@email.com", password: "georgio123" },
    { userId: "buyer@email.com", password: "buyer123" },
];

async function seedUser({ userId, password }: SeedUser): Promise<void> {
    const passwordHashed = await hashPassword(password);

    await dbPool.execute(
        `
        INSERT INTO users (user_id, password_hashed)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE password_hashed = VALUES(password_hashed)
        `,
        [userId, passwordHashed],
    );

    console.log(`seeded user: ${userId}`);
}

async function main(): Promise<void> {
    for (const user of SEED_USERS) {
        await seedUser(user);
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await dbPool.end();
    });
