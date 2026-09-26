import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MySqlContainer } from "@testcontainers/mysql";
import mysql from "mysql2/promise";
import { createTopic, startKafka } from "../support/kafka";

// Starts one MySQL (same version as the k8s manifests) for the whole run and applies the real
// migrations, so the test schema can't drift from production.
export default async function setup() {
    const stopKafka = await startKafka();
    await createTopic("payments", 3);

    const mySqlContainer = await new MySqlContainer("mysql:8.4")
        .withDatabase("ledger")
        .withUsername("app")
        .withUserPassword("app-password")
        .start();

    const mySqlConn = await mysql.createConnection({
        host: mySqlContainer.getHost(),
        port: mySqlContainer.getPort(),
        database: mySqlContainer.getDatabase(),
        user: mySqlContainer.getUsername(),
        password: mySqlContainer.getUserPassword(),
        multipleStatements: true,
    });

    const dir = join(process.cwd(), "migrations/sqls");
    for (const f of readdirSync(dir)
        .filter((f) => f.endsWith("-up.sql"))
        .sort()) {
        await mySqlConn.query(readFileSync(join(dir, f), "utf8"));
    }

    await mySqlConn.end();

    process.env.MYSQL_HOST = mySqlContainer.getHost();
    process.env.MYSQL_PORT = String(mySqlContainer.getPort());
    process.env.MYSQL_DATABASE = mySqlContainer.getDatabase();
    process.env.MYSQL_USER = mySqlContainer.getUsername();
    process.env.MYSQL_PASSWORD = mySqlContainer.getUserPassword();

    return async () => {
        await stopKafka();
        await mySqlContainer.stop();
    };
}
