import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return secret;
}

export function createAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: "2h" });
}

export function getTokenUserId(token: string): string {
  const payload = jwt.verify(token, getJwtSecret());

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid authentication token.");
  }

  return payload.sub;
}
