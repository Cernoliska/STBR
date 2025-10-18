import sqlite3 from "sqlite3";
import { open } from "sqlite";

export const initDB = async () => {
  const db = await open({
    filename: "./database/stbr.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      username TEXT,
      ip TEXT,
      revision_link TEXT,
      reason TEXT,
      comments TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      role TEXT DEFAULT 'user'
    );
  `);
                
  await db.run(
    `INSERT OR IGNORE INTO users (username, role) VALUES (?, 'developer')`,
    ["Janorovic Volkov"]
  );

  return db;
};
