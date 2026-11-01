"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/vehicles", label: "Vehicles", icon: "🚗" },
  { href: "/jobcards", label: "Jobcards", icon: "📋" },
  { href: "/invoices", label: "Invoices", icon: "🧾" },
  { href: "/payments", label: "Payments", icon: "💳" },
  { href: "/appointments", label: "Appointments", icon: "📅" },
  { href: "/accounting", label: "Accounting", icon: "📊" },
  { href: "/dashboard", label: "Dashboard", icon: "📈" },
];

const bottomLinks = [
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();

  function renderLink(link: { href: string; label: string; icon: string }) {
    const active =
      pathname === link.href || pathname.startsWith(link.href + "/");
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 ${
          active
            ? "bg-gray-800 text-white border-blue-500"
            : "text-gray-400 hover:text-white hover:bg-gray-800/60 border-transparent"
        }`}
      >
        <span className="text-base">{link.icon}</span>
        <span>{link.label}</span>
      </Link>
    );
  }

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-800 shrink-0">
        <Link href="/home" className="text-xl font-bold tracking-tight">
          DRIVE
        </Link>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
          Shop Management
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {links.map(renderLink)}
      </nav>

      <div className="border-t border-gray-800 shrink-0">
        {bottomLinks.map(renderLink)}
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 truncate mb-2">{email}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-400 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}