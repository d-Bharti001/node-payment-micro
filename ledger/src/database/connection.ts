import mysql from "mysql2/promise";

import {
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_DATABASE,
    MYSQL_USER,
    MYSQL_PASSWORD,
} from "src/config/config";

const dbPool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,

    supportBigNumbers: true,
    bigNumberStrings: true,
});

export default dbPool;
