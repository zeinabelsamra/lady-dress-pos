import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import NavLinks from "./NavLinks";
import { getCurrentUser } from "../lib/auth";
import { logout } from "./login/actions";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Lady Dress POS",
  description: "Point of sale system for The Lady Dress boutique",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-screen flex flex-col font-sans antialiased">
        <header className="shrink-0 bg-pink-200 px-6 h-14 flex items-center gap-8 shadow-sm shadow-pink-200">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center text-base">👗</span>
            <span className="text-base font-semibold text-pink-900 tracking-tight">The Lady Dress</span>
          </Link>
          {user && (
            <>
              <NavLinks role={user.role} />
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-pink-900">
                  {user.name}
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-white/60 text-pink-700 px-2 py-0.5 rounded-full">
                    {user.role === "ADMIN" ? "Admin" : "Staff"}
                  </span>
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-pink-900/80 hover:text-pink-900 px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </>
          )}
        </header>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </body>
    </html>
  );
}
