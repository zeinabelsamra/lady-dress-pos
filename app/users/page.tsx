import type { Metadata } from "next";
import { prisma } from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Users — The Lady Dress" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="page-title mb-1">Users</h1>
        <p className="text-sm text-stone-500 mb-6">
          <span className="font-medium text-pink-700">Administrators</span> can use everything.{" "}
          <span className="font-medium text-sky-700">Staff</span> can only use Checkout.
        </p>
        <UsersClient
          meId={me.id}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role === "ADMIN" ? "ADMIN" : "STAFF",
            createdAt: u.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
