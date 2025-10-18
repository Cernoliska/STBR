import express from "express";
const router = express.Router();

router.get("/:username", async (req, res) => {
  const username = req.params.username;
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    const rows = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (!rows.length) return res.json({ role: "user" });
    res.json(rows[0]);
  } else {
    const u = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    res.json(u || { role: "user" });
  }
});

export default router;
