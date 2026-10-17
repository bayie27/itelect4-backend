import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";

export const ensureDatabaseConnection: RequestHandler = async (req, res, next) => {
  try {
    await connectDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB is not connected.");
    }
    next();
  } catch {
    console.error("MongoDB connection failed.");
    if (req.path === "/health") {
      res.status(503).json({ ok: true, db: false });
      return;
    }

    res.status(503).json({ message: "Database is unavailable." });
  }
};
