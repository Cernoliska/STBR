import express from "express";
const router = express.Router();

router.get("/tickets", async (req, res) => {
  const db = req.app.locals.db;
  const tickets = await db.all("SELECT * FROM tickets ORDER BY created_at DESC");
  res.json(tickets);
});

router.post("/update", async (req, res) => {
  const db = req.app.locals.db;
  const { id, status, comment } = req.body;
  await db.run("UPDATE tickets SET status = ?, comments = ? WHERE id = ?", [
    status,
    comment,
    id,
  ]);
  res.json({ success: true });
});

router.post("/block-ip", async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "IP tidak valid" });
  console.log(`[Log]: IP ${ip} diblokir sementara (simulasi)`);
  res.json({ success: true, message: `IP ${ip} diblokir sementara` });
});

export default router;
