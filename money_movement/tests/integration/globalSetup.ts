import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MySqlContainer } from "@testcontainers/mysql";
import mysql from "mysql2/promise";
import { startKafka } from "../support/kafka";

export default async function setup() {
    const stopKafka = await startKafka();

    const mySqlContainer = await new MySqlContainer("mysql:8.4")
        .withDatabase("money_movement")
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
        await mySqlContainer.stop();
        await stopKafka();
    };
}
