import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

const COOKIE_NAME = "pike_user";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const identitySecret = process.env.USER_ID_SECRET || randomBytes(32).toString("hex");

function sign(userId: string): string {
  return createHmac("sha256", identitySecret).update(userId).digest("base64url");
}

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function verify(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return undefined;

  const userId = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const expectedSignature = sign(userId);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return undefined;
  return /^[0-9a-f-]{36}$/i.test(userId) ? userId : undefined;
}

export function getUserId(req: Request, res: Response): string {
  if (typeof res.locals.userId === "string") return res.locals.userId;
  const existingUserId = verify(readCookie(req, COOKIE_NAME));
  if (existingUserId) {
    res.locals.userId = existingUserId;
    return existingUserId;
  }

  const userId = randomUUID();
  const value = `${userId}.${sign(userId)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR_SECONDS}${secure}`,
  );
  res.locals.userId = userId;
  return userId;
}
