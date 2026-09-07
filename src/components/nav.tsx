"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { SoundToggle } from "./sound-toggle";
import { PortMark } from './port-mark';

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
      className="port-header sticky top-0 z-40"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="site-nav site-shell">
        <Link
          href="/"
          transitionTypes={["warp"]}
          data-sfx="warp"
          className="site-wordmark font-display text-sm tracking-[0.3em] text-ink hover:text-holo transition-colors"
        >
          <PortMark />STARSHIPPED
        </Link>
        <nav aria-label="Main navigation" className="site-nav-links flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                aria-current={active ? 'page' : undefined}
                href={link.href}
                transitionTypes={["warp"]}
                data-sfx="warp"
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
        <div className="site-nav-account flex items-center gap-3">
          <SoundToggle />
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
