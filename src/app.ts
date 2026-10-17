import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { authRoutes } from "./routes/authRoutes.js";
import { incidentRoutes } from "./routes/incidentRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({ ok: true, db: connected });
});

app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
