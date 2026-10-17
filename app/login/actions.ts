'use server'

import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import {
  checkPassword,
  createSession,
  destroySession,
  hashPassword,
  homeFor,
  verifyPassword,
} from "../../lib/auth";

type ActionResult = { error: string } | null;

export async function login(name: string, password: string): Promise<ActionResult> {
  const user = await prisma.user.findUnique({ where: { name: name.trim() } });
  // Same message either way so names can't be guessed
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "Wrong name or password." };

  await createSession(user.id);
  redirect(homeFor({ id: user.id, name: user.name, role: user.role === "ADMIN" ? "ADMIN" : "STAFF" }));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// First run only: create the owner's admin account.
export async function setupAdmin(name: string, password: string): Promise<ActionResult> {
  if (await prisma.user.count()) return { error: "Setup is already done. Please log in." };
  if (!name.trim()) return { error: "Name is required." };
  const pwErr = checkPassword(password);
  if (pwErr) return { error: pwErr };

  const user = await prisma.user.create({
    data: { name: name.trim(), passwordHash: await hashPassword(password), role: "ADMIN" },
  });
  await createSession(user.id);
  redirect("/products");
}
