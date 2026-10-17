import { Router } from "express";
import { createAuthToken } from "../auth/token.js";
import {
  isDuplicateKeyError,
  isValidUserRole,
  toPublicUser,
  User,
  verifyPassword,
} from "../models/User.js";
import { UserRole } from "../types/index.js";

export const authRoutes = Router();

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

authRoutes.post("/register", async (req, res) => {
  const body = asObject(req.body);
  if (!body) {
    res.status(400).json({ message: "A JSON object is required." });
    return;
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === undefined ? UserRole.RESPONDER : body.role;

  if (!name || name.length > 100) {
    res.status(400).json({ message: "Name is required and must be 100 characters or fewer." });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: "A valid email address is required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters." });
    return;
  }

  if (!isValidUserRole(role)) {
    res.status(400).json({ message: "Role must be responder or incident_commander." });
    return;
  }

  try {
    const user = await User.create({ name, email, password, role });
    res.status(201).json({ token: createAuthToken(user._id.toString()), user: toPublicUser(user) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ message: "An account with that email already exists." });
      return;
    }
    throw error;
  }
});

authRoutes.post("/login", async (req, res) => {
  const body = asObject(req.body);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.isActive || !(await verifyPassword(user, password))) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  res.status(200).json({ token: createAuthToken(user._id.toString()), user: toPublicUser(user) });
});
