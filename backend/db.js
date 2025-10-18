import mysql from "mysql2/promise";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";
import ini from "ini";

const DB_TYPE = process.env.DB_TYPE || "sqlite";

export async function getDb() {
  if (DB_TYPE === "mysql") {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
    });
    return {
      type: "mysql",
      query: async (sql, params) => {
        const [rows] = await pool.execute(sql, params || []);
        return rows;
      },
      execute: async (sql, params) => {
        const [res] = await pool.execute(sql, params || []);
        return res;
      }
    };
  } else {
    const file = process.env.SQLITE_FILE || "./database/stbr.db";
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    const db = await open({
      filename: file,
      driver: sqlite3.Database
    });

    const schemaPath = path.join(process.cwd(), "database", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const schema = await fs.promises.readFile(schemaPath, "utf8");
      await db.exec(schema);
    }

    return {
      type: "sqlite",
      all: async (sql, params) => db.all(sql, params || []),
      get: async (sql, params) => db.get(sql, params || []),
      run: async (sql, params) => db.run(sql, params || [])
    };
  }
}
