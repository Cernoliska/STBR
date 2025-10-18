import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { initDB } from "./db.js";
import ticketRoutes from "./routes/tickets.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("frontend"));

const db = await initDB();
app.locals.db = db;

app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => console.log(`[Log]: STBR berjalan di http://localhost:${PORT}`));
