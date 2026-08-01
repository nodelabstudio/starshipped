"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";

const LINKS = [
  { href: "/ships", label: "Fleet" },
  { href: "/jobs", label: "Cargo runs" },
  { href: "/assignments", label: "Dispatch" },
  { href: "/map", label: "Starmap" },
  { href: "/captains", label: "Captains" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header
      className="border-b border-line bg-void sticky top-0 z-40"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link
          href="/"
          transitionTypes={["warp"]}
          className="font-display text-sm tracking-[0.3em] text-ink hover:text-holo transition-colors"
        >
          STARSHIPPED
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 flex-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                transitionTypes={["warp"]}
                className={`px-3 py-1.5 font-mono text-xs tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
                  active
                    ? "text-holo border-b border-holo"
                    : "text-dim hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="font-mono text-xs tracking-[0.15em] uppercase text-dim hover:text-ink transition-colors"
            >
              Sign in
            </Link>
            <Link href="/sign-up" className="btn-primary !py-1.5 !px-3 !text-xs">
              Register
            </Link>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
