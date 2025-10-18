import express from "express";
const router = express.Router();

router.get("/tickets", async (req, res) => {
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    const rows = await db.query("SELECT * FROM tickets ORDER BY created_at DESC");
    res.json(rows);
  } else {
    const rows = await db.all("SELECT * FROM tickets ORDER BY created_at DESC");
    res.json(rows);
  }
});

router.post("/update", async (req, res) => {
  const { key, status, comment } = req.body;
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    await db.execute("UPDATE tickets SET status=? WHERE key_token=?", [status, key]);
    const r = await db.query("SELECT id FROM tickets WHERE key_token=?", [key]);
    const id = r[0].id || r[0][0].id;
    await db.execute("INSERT INTO ticket_events (ticket_id, event_text) VALUES (?, ?)", [id, comment || `Status diubah: ${status}`]);
    res.json({ success: true });
  } else {
    const t = await db.get("SELECT id FROM tickets WHERE key_token=?", [key]);
    if (!t) return res.status(404).json({ error: "not found" });
    await db.run("UPDATE tickets SET status=? WHERE id=?", [status, t.id]);
    await db.run("INSERT INTO ticket_events (ticket_id, event_text) VALUES (?, ?)", [t.id, comment || `Status diubah: ${status}`]);
    res.json({ success: true });
  }
});

router.post("/block-ip", async (req, res) => {
  const { ip_address, reason, duration_hours, blocked_by } = req.body;
  const expires = new Date(Date.now() + (duration_hours||6) * 3600 * 1000).toISOString();
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    await db.execute("INSERT INTO ip_blocks (ip_address, blocked_by, reason, expires_at) VALUES (?, ?, ?, ?)", [ip_address, blocked_by, reason, expires]);
  } else {
    await db.run("INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_by, reason, expires_at) VALUES (?, ?, ?, ?)", [ip_address, blocked_by, reason, expires]);
  }
  res.json({ success: true });
});

router.get("/blocks", async (req, res) => {
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    const rows = await db.query("SELECT * FROM ip_blocks WHERE expires_at > NOW()");
    res.json(rows);
  } else {
    const rows = await db.all("SELECT * FROM ip_blocks WHERE expires_at > datetime('now')");
    res.json(rows);
  }
});

export default router;
