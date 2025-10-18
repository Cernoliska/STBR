import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { getDb } from "./db.js";
import ticketsRouter from "./routes/tickets.js";
import adminRouter from "./routes/admin.js";
import usersRouter from "./routes/users.js";
import authRouter, { requireLogin } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use("/auth", authRouter);

const db = await getDb();
app.locals.db = db;

app.use("/api/tickets", ticketsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);

app.use(express.static(path.join(process.cwd(), "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "frontend", "index.html"));
});

app.listen(PORT, () => console.log(`STBR running on http://localhost:${PORT}`));
