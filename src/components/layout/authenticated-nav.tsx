"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";

const destinations = [
  { href: "/app", label: "Today", icon: "dumbbell" },
  { href: "/app/program/edit", label: "Routine", icon: "map" },
  { href: "/app/library", label: "Library", icon: "library" },
  { href: "/app/progress", label: "Progress", icon: "progress" },
] as const;

export function authenticatedDestinationIsCurrent(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === href || pathname.startsWith("/workout/");
  if (href === "/app/program/edit") return pathname === "/app/program" || pathname.startsWith("/app/program/");
  if (href === "/app/progress") return ["/app/progress", "/app/history", "/app/prs"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return pathname === href || pathname.startsWith(`${href}/`);
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
