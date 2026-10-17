import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "./prisma";

export type Role = "ADMIN" | "STAFF";
export type CurrentUser = { id: number; name: string; role: Role };

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

// ── Passwords ────────────────────────────────────────────
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function checkPassword(password: string): string | null {
  return password.length < 4 ? "Password must be at least 4 characters." : null;
}

// ── Sessions ─────────────────────────────────────────────
// The cookie holds a random token; the database only stores its hash.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Set COOKIE_SECURE=true once the app is served over HTTPS
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}

// Who is logged in (null if nobody). Cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return { ...session.user, role: session.user.role === "ADMIN" ? "ADMIN" : "STAFF" };
});

// ── Guards: call at the top of every page and server action ──
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/checkout");
  return user;
}

export function homeFor(user: CurrentUser) {
  return user.role === "ADMIN" ? "/products" : "/checkout";
}
