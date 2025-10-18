import express from "express";
import crypto from "crypto";
const router = express.Router();

function genKey() {
  return crypto.randomBytes(9).toString("base64").replace(/\W/g, "").slice(0,22).toUpperCase();
}

router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    const rows = await db.query("SELECT * FROM tickets ORDER BY created_at DESC");
    res.json(rows);
  } else {
    const rows = await db.all("SELECT * FROM tickets ORDER BY created_at DESC");
    res.json(rows);
  }
});

router.post("/", async (req, res) => {
  const { type, username, ip_address, revision_link, reason } = req.body;
  const key = genKey();
  const db = req.app.locals.db;

  if (db.type === "mysql") {
    await db.execute(
      "INSERT INTO tickets (key_token, type, username, ip_address, revision_link, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [key, type, username, ip_address, revision_link, reason]
    );
    const rows = await db.query("SELECT id FROM tickets WHERE key_token = ?", [key]);
    const ticketId = rows[0].id || rows[0][0].id;
    await db.execute("INSERT INTO ticket_events (ticket_id, event_text) VALUES (?, ?)", [ticketId, `Tiket dibuat oleh ${username || 'anon'}`]);
    res.json({ success: true, key });
  } else {
    const r = await db.run(
      "INSERT INTO tickets (key_token, type, username, ip_address, revision_link, reason) VALUES (?, ?, ?, ?, ?, ?)",
      [key, type, username, ip_address, revision_link, reason]
    );
    const ticketId = r.lastID;
    await db.run("INSERT INTO ticket_events (ticket_id, event_text) VALUES (?, ?)", [ticketId, `Tiket dibuat oleh ${username || 'anon'}`]);
    res.json({ success: true, key });
  }
});

router.get("/:key", async (req, res) => {
  const key = req.params.key;
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    const rows = await db.query("SELECT * FROM tickets WHERE key_token = ?", [key]);
    if (!rows.length) return res.status(404).json({ error: "not found" });
    const ticket = rows[0];
    const events = await db.query("SELECT event_time as time, event_text as text FROM ticket_events WHERE ticket_id = ? ORDER BY event_time ASC", [ticket.id]);
    res.json({ ...ticket, events });
  } else {
    const ticket = await db.get("SELECT * FROM tickets WHERE key_token = ?", [key]);
    if (!ticket) return res.status(404).json({ error: "not found" });
    const events = await db.all("SELECT event_time as time, event_text as text FROM ticket_events WHERE ticket_id = ? ORDER BY event_time ASC", [ticket.id]);
    res.json({ ...ticket, events });
  }
});

router.post("/:key/events", async (req, res) => {
  const { key } = req.params;
  const { text } = req.body;
  const db = req.app.locals.db;
  if (db.type === "mysql") {
    const rows = await db.query("SELECT id FROM tickets WHERE key_token = ?", [key]);
    if (!rows.length) return res.status(404).json({ error: "not found" });
    const ticketId = rows[0].id || rows[0][0].id;
    await db.execute("INSERT INTO ticket_events (ticket_id, event_text) VALUES (?, ?)", [ticketId, text]);
    res.json({ success: true });
  } else {
    const t = await db.get("SELECT id FROM tickets WHERE key_token = ?", [key]);
    if (!t) return res.status(404).json({ error: "not found" });
    await db.run("INSERT INTO ticket_events (ticket_id, event_text) VALUES (?, ?)", [t.id, text]);
    res.json({ success: true });
  }
});

export default router;
