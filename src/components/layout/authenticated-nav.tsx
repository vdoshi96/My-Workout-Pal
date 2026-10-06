"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";

const destinations = [
  { href: "/app", label: "Today", icon: "dumbbell" },
  { href: "/app/program/edit", label: "Routine", icon: "map" },
  { href: "/app/library", label: "Library", icon: "library" },
  { href: "/app/progress", label: "Progress", icon: "progress" },
] as const;

/**
 * A routine day opened from Today (its `from` is `/app…`) still belongs to Today,
 * so the tab bar follows where the person came from.
 */
export function effectiveNavigationPath(pathname: string, from: string | null | undefined): string {
  const isDayPage = /^\/app\/program\/[^/]+$/u.test(pathname) && pathname !== "/app/program/edit";
  if (isDayPage && typeof from === "string" && /^\/app(?:[?#]|$)/u.test(from)) return "/app";
  return pathname;
}

export function authenticatedDestinationIsCurrent(currentPathname: string, href: string, from?: string | null): boolean {
  const pathname = effectiveNavigationPath(currentPathname, from);
  if (href === "/app") return pathname === href || pathname.startsWith("/workout/");
  if (href === "/app/program/edit") return pathname === "/app/programs" || pathname === "/app/program" || pathname.startsWith("/app/program/");
  if (href === "/app/progress") return ["/app/progress", "/app/history", "/app/prs"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AuthenticatedNav() {
  const pathname = usePathname();
  // The router's own search params change in the same render as the pathname.
  const from = useSearchParams()?.get("from") ?? null;

  return (
    <nav aria-label="Account" className="member-nav">
      {destinations.map((destination) => (
        <Link
          aria-current={authenticatedDestinationIsCurrent(pathname, destination.href, from) ? "page" : undefined}
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
