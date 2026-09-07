/// <reference types="react/canary" />
// ^ Loads React canary types project-wide (ViewTransition ships in Next's
// vendored React canary; @types/react gates it behind this opt-in).
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Michroma, Saira, Share_Tech_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Nav } from "@/components/nav";
import { SoundEffects } from "@/components/sound-effects";
import { DispatchReceipt } from '@/components/dispatch-receipt';
import { PortMark } from '@/components/port-mark';
import "./globals.css";
import './spaceport.css';

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

const aurebesh = localFont({
  src: "../fonts/Aurebesh.ttf",
  variable: "--font-aurebesh",
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
          colorPrimary: "#eeb777",
          colorBackground: "#101920",
          colorForeground: "#eee8da",
          borderRadius: "2px",
        },
      }}
    >
      <html
        lang="en"
        className={`${michroma.variable} ${saira.variable} ${shareTechMono.variable} ${aurebesh.variable} h-full antialiased`}
      >
        <body className="starfield min-h-full flex flex-col">
          <SoundEffects />
          <Nav />
          <main className="site-main flex-1">
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
          <DispatchReceipt />
          <footer className="port-footer">
            <div className="site-shell">
              <span className="port-footer-brand"><PortMark />STARSHIPPED</span>
              <p>Independent fleet logistics.<br /><span>Est. 2018 / Rebuilt 2026</span></p>
              <p className="port-footer-credit">Originally by<br />Mario Borras &amp; Angel Rodriguez<br /><a href="/models/credits.txt" className="port-text-link">3D artwork credits</a></p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
