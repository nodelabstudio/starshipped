/// <reference types="react/canary" />
// ^ Loads React canary types project-wide (ViewTransition ships in Next's
// vendored React canary; @types/react gates it behind this opt-in).
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Michroma, Saira, Share_Tech_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Nav } from "@/components/nav";
import "./globals.css";

const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
});

const saira = Saira({
  subsets: ["latin"],
  variable: "--font-saira",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-stm",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://star.angelrod.dev"),
  title: "StarShipped",
  description:
    "Fleet logistics for the Outer Rim. Commission ships, post cargo runs, dispatch the fleet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#5cc8ff",
          colorBackground: "#0b1220",
          colorForeground: "#e9eff8",
          borderRadius: "2px",
        },
      }}
    >
      <html
        lang="en"
        className={`${michroma.variable} ${saira.variable} ${shareTechMono.variable} h-full antialiased`}
      >
        <body className="starfield min-h-full flex flex-col">
          <Nav />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20">
            {/* Only "warp"-tagged link navigations animate. Untyped
                transitions (e.g. router.refresh() when runs settle) must
                swap instantly, hence default "none" everywhere. */}
            <ViewTransition
              enter={{ warp: "warp", default: "none" }}
              exit={{ warp: "warp", default: "none" }}
              update={{ warp: "warp", default: "none" }}
              default="none"
            >
              {children}
            </ViewTransition>
          </main>
          <footer className="border-t border-line bg-void">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap gap-x-6 gap-y-1 items-baseline justify-between">
              <span className="font-display text-xs tracking-[0.25em] text-dim">
                STARSHIPPED
              </span>
              <span className="eyebrow">
                est. 2018 &middot; rebuilt 2026 &middot; originally by Mario Borras &amp; Angel
                Rodriguez
              </span>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
