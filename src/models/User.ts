import bcrypt from "bcryptjs";
import mongoose, { HydratedDocument, Model, Schema, model } from "mongoose";
import type { User as PublicUser } from "../types/index.js";
import { UserRole } from "../types/index.js";

export interface UserRecord {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
}

export type UserDocument = HydratedDocument<UserRecord>;

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.RESPONDER, required: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export const User: Model<UserRecord> =
  (mongoose.models.User as Model<UserRecord> | undefined) ?? model<UserRecord>("User", userSchema);

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt!.toISOString(),
  };
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export async function verifyPassword(user: UserDocument, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}

export function isValidUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole);
}
