import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "../../lib/prisma";
import { getCurrentUser, homeFor } from "../../lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in — The Lady Dress" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  // First run: no accounts yet, so set up the owner's admin account
  const hasUsers = (await prisma.user.count()) > 0;
  return <LoginForm mode={hasUsers ? "login" : "setup"} />;
}
