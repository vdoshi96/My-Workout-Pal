import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

type NavItem = "home" | "program" | "library" | "sample" | "sign-in";

const items = [
  { id: "program", href: "/program", label: "Program", icon: "map" },
  { id: "library", href: "/library", label: "Library", icon: "library" },
  { id: "sample", href: "/sample-progress", label: "Sample", icon: "sample" },
  { id: "sign-in", href: "/sign-in", label: "Sign in", icon: "sign-in" },
] as const;

export function PublicShell({
  children,
  current,
}: Readonly<{ children: ReactNode; current: NavItem }>) {
  return (
    <div className="public-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="public-header">
        <Link className="brand" href="/" prefetch={false}>
          <span className="brand-mark" aria-hidden="true"><Icon name="map" /></span>
          <span>
            <strong>My Workout Pal</strong>
            <small>Training route atlas</small>
          </span>
        </Link>
        <nav className="public-nav" aria-label="Primary">
          {items.map((item) => (
            <Link
              aria-current={current === item.id ? "page" : undefined}
              href={item.href}
              key={item.id}
              prefetch={false}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
