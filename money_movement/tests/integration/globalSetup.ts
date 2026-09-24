import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MySqlContainer } from "@testcontainers/mysql";
import mysql from "mysql2/promise";

export default async function setup() {
    const container = await new MySqlContainer("mysql:8.4")
        .withDatabase("money_movement")
        .withUsername("app")
        .withUserPassword("app-password")
        .start();

    const conn = await mysql.createConnection({
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
        user: container.getUsername(),
        password: container.getUserPassword(),
        multipleStatements: true,
    });

    const dir = join(process.cwd(), "migrations/sqls");
    for (const f of readdirSync(dir)
        .filter((f) => f.endsWith("-up.sql"))
        .sort()) {
        await conn.query(readFileSync(join(dir, f), "utf8"));
    }

    await conn.end();

    process.env.MYSQL_HOST = container.getHost();
    process.env.MYSQL_PORT = String(container.getPort());
    process.env.MYSQL_DATABASE = container.getDatabase();
    process.env.MYSQL_USER = container.getUsername();
    process.env.MYSQL_PASSWORD = container.getUserPassword();

    return async () => {
        await container.stop();
    };
}
