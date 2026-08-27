import dbPool from "src/database/connection";

// Matches the buyer user seeded by the auth service (auth/scripts/seed.ts)
const BUYER_USER_ID = "buyer@email.com";
const BUYER_STARTING_BALANCE = BigInt(500_000);

async function seedBalances(): Promise<void> {
    await dbPool.execute(
        `
        INSERT IGNORE INTO balances (user_id, balance)
        VALUES (?, ?)
        `,
        [BUYER_USER_ID, BUYER_STARTING_BALANCE],
    );

    console.log(`seeded balance: ${BUYER_USER_ID} -> ${BUYER_STARTING_BALANCE}`);
}

seedBalances()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await dbPool.end();
    });
