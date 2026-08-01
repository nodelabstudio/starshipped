import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ships } from "@/db/schema";
import { registry } from "@/lib/format";

// Match the rest of the app: render on request so the card tracks the ship's
// current location instead of baking in build-time state.
export const dynamic = "force-dynamic";

export const alt = "StarShipped fleet registry ship card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The fleet's Blob renders are webp, which satori can't decode — re-encode
// to a PNG data URI with sharp. Returns null (the "NO VISUAL" placeholder)
// when the ship has no image or the fetch/decode fails; a broken Blob must
// not 500 the whole card.
async function loadShipImage(imageUrl: string | null) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipId = Number(id);
  // Read-only lookup: no settleArrivals here, OG scrapers must not mutate.
  const ship = Number.isInteger(shipId)
    ? await getDb().query.ships.findFirst({ where: eq(ships.id, shipId) })
    : undefined;
  if (!ship) notFound();

  const [michroma, shareTechMono, shipImage] = await Promise.all([
    readFile(join(process.cwd(), "src/fonts/Michroma-Regular.ttf")),
    readFile(join(process.cwd(), "src/fonts/ShareTechMono-Regular.ttf")),
    loadShipImage(ship.imageUrl),
  ]);

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
            alignItems: "center",
            gap: 48,
            border: "1px solid #1c2a47",
            backgroundColor: "#0b1220",
            padding: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 500,
              height: 312,
              flexShrink: 0,
              border: "1px solid #1c2a47",
              backgroundColor: "#081018",
            }}
          >
            {shipImage ? (
              <img
                src={shipImage}
                alt=""
                width={498}
                height={310}
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Share Tech Mono",
                  fontSize: 20,
                  letterSpacing: "0.25em",
                  color: "#8aa0c2",
                }}
              >
                NO VISUAL
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 476,
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div
                style={{
                  fontFamily: "Share Tech Mono",
                  fontSize: 20,
                  letterSpacing: "0.25em",
                  color: "#8aa0c2",
                }}
              >
                {`FLEET REGISTRY · ${registry(ship.id)}`}
              </div>
              <div
                style={{
                  fontFamily: "Michroma",
                  fontSize: 38,
                  lineHeight: 1.3,
                  letterSpacing: "0.06em",
                  color: "#e9eff8",
                  textTransform: "uppercase",
                }}
              >
                {ship.name}
              </div>
              <div
                style={{
                  fontFamily: "Share Tech Mono",
                  fontSize: 26,
                  letterSpacing: "0.12em",
                  color: "#5cc8ff",
                }}
              >
                {`CAPACITY ${ship.containers} CTU`}
              </div>
              <div
                style={{
                  fontFamily: "Share Tech Mono",
                  fontSize: 26,
                  letterSpacing: "0.12em",
                  color: "#ffb757",
                }}
              >
                {`LOCATION · ${ship.location.toUpperCase()}`}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderTop: "1px solid #1c2a47",
                paddingTop: 20,
              }}
            >
              <div
                style={{
                  fontFamily: "Michroma",
                  fontSize: 22,
                  letterSpacing: "0.3em",
                  color: "#5cc8ff",
                }}
              >
                STARSHIPPED
              </div>
              <div
                style={{
                  fontFamily: "Share Tech Mono",
                  fontSize: 17,
                  letterSpacing: "0.18em",
                  color: "#8aa0c2",
                }}
              >
                OUTER RIM FLEET LOGISTICS
              </div>
            </div>
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
