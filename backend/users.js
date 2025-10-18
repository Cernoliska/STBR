import express from "express";
const router = express.Router();

router.get("/:username", async (req, res) => {
  const db = req.app.locals.db;
  const user = await db.get("SELECT * FROM users WHERE username = ?", [
    req.params.username,
  ]);
  res.json(user || { role: "user" });
});

export default router;
