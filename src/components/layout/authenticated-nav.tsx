"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";

const destinations = [
  { href: "/app", label: "Home", icon: "map" },
  { href: "/app/library", label: "Library", icon: "library" },
  { href: "/app/history", label: "History", icon: "history" },
  { href: "/app/progress", label: "Progress", icon: "progress" },
  { href: "/app/settings", label: "Settings", icon: "settings" },
] as const;

export function authenticatedDestinationIsCurrent(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === href || pathname.startsWith("/app/program") : pathname === href || pathname.startsWith(`${href}/`);
}

export function AuthenticatedNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="member-nav">
      {destinations.map((destination) => (
        <Link
          aria-current={authenticatedDestinationIsCurrent(pathname, destination.href) ? "page" : undefined}
          href={destination.href}
          key={destination.href}
          prefetch={false}
        >
          <Icon name={destination.icon} />
          <span>{destination.label}</span>
        </Link>
      ))}
    </nav>
  );
}
