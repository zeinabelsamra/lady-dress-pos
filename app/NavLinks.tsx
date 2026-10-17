'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/products", label: "Products", icon: "👗", staff: false },
  { href: "/inventory", label: "Inventory", icon: "📦", staff: false },
  { href: "/checkout", label: "Checkout", icon: "🛍️", staff: true },
  { href: "/analytics", label: "Analytics", icon: "📊", staff: false },
  { href: "/expenses", label: "Expenses", icon: "🧾", staff: false },
  { href: "/users", label: "Users", icon: "👥", staff: false },
];

export default function NavLinks({ role }: { role: "ADMIN" | "STAFF" }) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? navLinks : navLinks.filter((l) => l.staff);

  return (
    <nav className="flex gap-1">
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              active
                ? "bg-white text-pink-700 shadow-sm"
                : "text-pink-900/80 hover:text-pink-900 hover:bg-white/50"
            }`}
          >
            <span aria-hidden>{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
