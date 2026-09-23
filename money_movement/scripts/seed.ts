import dbPool from "src/database/connection";

interface SeedUserBalance {
    userId: string;
    balance: bigint;
}

const SEED_USERS: SeedUserBalance[] = [
    { userId: "georgio@email.com", balance: 0n },
    { userId: "buyer@email.com", balance: 500_000n },
];

async function seedBalance({ userId, balance }: SeedUserBalance): Promise<void> {
    await dbPool.execute(
        `
        INSERT INTO balances (user_id, balance)
        VALUES (?, ?)
        ON DUPLICATE KEY
        UPDATE user_id = user_id
        `,
        [userId, balance.toString()],
    );

    console.log(`seeded balance: ${userId} -> ${balance.toString()}`);
}

async function main(): Promise<void> {
    for (const user of SEED_USERS) {
        await seedBalance(user);
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
