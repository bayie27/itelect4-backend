/// <reference path="./types/express.d.ts" />

import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { ensureDatabaseConnection } from "./middleware/ensureDatabaseConnection.js";
import { authRoutes } from "./routes/authRoutes.js";
import { evidenceRoutes } from "./routes/evidenceRoutes.js";
import { incidentRoutes } from "./routes/incidentRoutes.js";
import { responseActionRoutes } from "./routes/responseActionRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin === undefined || corsOrigins.includes(origin));
    },
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use("/api", ensureDatabaseConnection);

app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: true, db: connected });
});

app.use("/api/auth", authRoutes);
app.use("/api", responseActionRoutes);
app.use("/api", evidenceRoutes);
app.use("/api/incidents", incidentRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
