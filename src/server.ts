import "dotenv/config";
import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";

async function startServer(): Promise<void> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in the local .env file.");
  }

  const portValue = process.env.PORT ?? "4000";
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid port number between 1 and 65535.");
  }

  try {
    await connectDatabase();
  } catch {
    throw new Error("MongoDB connection failed. Check the Atlas URI, database user, and network access list.");
  }

  app.listen(port, () => {
    console.log(`CIRS backend listening on port ${port}.`);
  });
}

startServer().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Server failed to start.");
  process.exitCode = 1;
});
