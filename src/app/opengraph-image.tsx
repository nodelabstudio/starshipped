import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCaptainStats, getFleetStats } from "@/lib/queries";

// Match the rest of the app: render on request so the stats stay live
// instead of baking in build-time state.
export const dynamic = "force-dynamic";

export const alt = "StarShipped — fleet logistics for the Outer Rim";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Read-only fleet totals: no settleArrivals, OG scrapers must not mutate.
  const [stats, captains, michroma, shareTechMono] = await Promise.all([
    getFleetStats(),
    getCaptainStats(),
    readFile(join(process.cwd(), "src/fonts/Michroma-Regular.ttf")),
    readFile(join(process.cwd(), "src/fonts/ShareTechMono-Regular.ttf")),
  ]);
  let delivered = 0;
  let earned = 0;
  for (const c of captains.values()) {
    delivered += c.deliveries;
    earned += c.earned;
  }

  const tiles = [
    { label: "SHIPS IN FLEET", value: String(stats.ships) },
    { label: "FLEET CAPACITY", value: `${stats.capacity} CTU` },
    { label: "RUNS DELIVERED", value: String(delivered) },
    { label: "CREDITS EARNED", value: `${earned.toLocaleString("en-US")} CR` },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#05080f",
          padding: 40,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid #1c2a47",
            backgroundColor: "#0b1220",
            padding: 56,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                fontFamily: "Share Tech Mono",
                fontSize: 20,
                letterSpacing: "0.25em",
                color: "#8aa0c2",
              }}
            >
              OUTER RIM FLEET LOGISTICS
            </div>
            <div
              style={{
                fontFamily: "Michroma",
                fontSize: 64,
                letterSpacing: "0.18em",
                color: "#e9eff8",
              }}
            >
              STARSHIPPED
            </div>
            <div
              style={{
                fontFamily: "Share Tech Mono",
                fontSize: 24,
                letterSpacing: "0.1em",
                color: "#5cc8ff",
              }}
            >
              Every ship. Every run. One manifest.
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {tiles.map((tile) => (
              <div
                key={tile.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  flexGrow: 1,
                  border: "1px solid #1c2a47",
                  backgroundColor: "#101a2e",
                  padding: "24px 28px",
                }}
              >
                <div
                  style={{
                    fontFamily: "Share Tech Mono",
                    fontSize: 30,
                    color: "#ffb757",
                  }}
                >
                  {tile.value}
                </div>
                <div
                  style={{
                    fontFamily: "Share Tech Mono",
                    fontSize: 15,
                    letterSpacing: "0.18em",
                    color: "#8aa0c2",
                  }}
                >
                  {tile.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Michroma", data: michroma, style: "normal", weight: 400 },
        {
          name: "Share Tech Mono",
          data: shareTechMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
