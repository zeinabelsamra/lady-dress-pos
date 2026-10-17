'use server'

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { checkPassword, hashPassword, requireAdmin, type Role } from "../../lib/auth";

type ActionResult = { error: string } | null;

const toRole = (r: string): Role => (r === "ADMIN" ? "ADMIN" : "STAFF");

async function adminCount() {
  return prisma.user.count({ where: { role: "ADMIN" } });
}

export async function addUser(name: string, password: string, role: Role): Promise<ActionResult> {
  await requireAdmin();
  if (!name.trim()) return { error: "Name is required." };
  const pwErr = checkPassword(password);
  if (pwErr) return { error: pwErr };
  if (await prisma.user.findUnique({ where: { name: name.trim() } }))
    return { error: `"${name.trim()}" already exists.` };

  await prisma.user.create({
    data: { name: name.trim(), passwordHash: await hashPassword(password), role: toRole(role) },
  });
  revalidatePath("/users");
  return null;
}

// Sets a new password and logs that user out everywhere else.
export async function resetPassword(userId: number, password: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const pwErr = checkPassword(password);
  if (pwErr) return { error: pwErr };

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } }),
    ...(userId === me.id ? [] : [prisma.session.deleteMany({ where: { userId } })]),
  ]);
  revalidatePath("/users");
  return null;
}

export async function changeRole(userId: number, role: Role): Promise<ActionResult> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };
  if (user.role === "ADMIN" && toRole(role) === "STAFF" && (await adminCount()) <= 1)
    return { error: "There must be at least one administrator." };

  await prisma.user.update({ where: { id: userId }, data: { role: toRole(role) } });
  revalidatePath("/users");
  return null;
}

export async function deleteUser(userId: number): Promise<ActionResult> {
  const me = await requireAdmin();
  if (userId === me.id) return { error: "You can't delete your own account." };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };
  if (user.role === "ADMIN" && (await adminCount()) <= 1)
    return { error: "There must be at least one administrator." };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
  return null;
}
