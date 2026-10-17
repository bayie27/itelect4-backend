import type { RequestHandler } from "express";
import { getTokenUserId } from "../auth/token.js";
import { User } from "../models/User.js";

export const authenticate: RequestHandler = (req, res, next) => {
  const authorization = req.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token. Send Authorization: Bearer <token>" });
    return;
  }

  const token = authorization.slice("Bearer ".length);
  if (!token) {
    res.status(401).json({ message: "No token. Send Authorization: Bearer <token>" });
    return;
  }

  let userId: string;
  try {
    userId = getTokenUserId(token);
  } catch {
    res.status(401).json({ message: "Token is invalid or has expired." });
    return;
  }

  void User.findById(userId)
    .select("role isActive")
    .then((user) => {
      if (!user || !user.isActive) {
        res.status(401).json({ message: "Authentication required." });
        return;
      }

      req.userId = userId;
      req.userRole = user.role;
      next();
    })
    .catch(next);
};
