import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const getSecretKey = () =>
  process.env.SECRET_KEY || "atm-default-secret-key-2026";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(payload: { id: string | bigint | number }): string {
  return jwt.sign({ id: String(payload.id) }, getSecretKey(), {
    expiresIn: "24h",
  });
}

export function verifyRequestToken(req: NextRequest): { id: string } {
  const rawHeader = req.headers.get("authorization") || "";
  const token = rawHeader.startsWith("Bearer ")
    ? rawHeader.slice(7).trim()
    : rawHeader.trim();

  if (!token) {
    throw new Error("No token provided");
  }

  const decoded = jwt.verify(token, getSecretKey()) as { id: string | number };
  return { id: String(decoded.id) };
}
