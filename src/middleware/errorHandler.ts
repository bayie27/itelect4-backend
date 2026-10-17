import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Route not found." });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof mongoose.Error.ValidationError) {
    const fieldErrors = Object.fromEntries(
      Object.entries(error.errors).map(([field, issue]) => [field, issue.message]),
    );
    res.status(400).json({ message: "Validation failed.", fieldErrors });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: "A request value has an invalid format." });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
    res.status(400).json({ message: "Request body must contain valid JSON." });
    return;
  }

  console.error("Unhandled request error.");
  res.status(500).json({ message: "Internal server error." });
};
