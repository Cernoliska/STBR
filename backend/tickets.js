import express from "express";
const router = express.Router();

router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  const rows = await db.all("SELECT * FROM tickets ORDER BY created_at DESC");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { type, username, ip, revision_link, reason, comments } = req.body;
  await db.run(
    "INSERT INTO tickets (type, username, ip, revision_link, reason, comments) VALUES (?, ?, ?, ?, ?, ?)",
    [type, username, ip, revision_link, reason, comments]
  );
  res.json({ success: true });
});

export default router;
