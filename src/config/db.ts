import mongoose from "mongoose";
import { getMongoUri } from "./mongoUri.js";

// Keep the successful promise so warm recovery uses Mongoose's existing client.
let connectionPromise: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(getMongoUri(), { serverSelectionTimeoutMS: 5000 })
      .then(() => undefined)
      .catch((error: unknown) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}
