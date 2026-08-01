import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { ships } from "../src/db/schema";

// One-off: convert the 2026-08-01 fleet-expansion images to WebP, upload to
// Blob, and register the ships under the same captain that owns the rest of
// the fleet. Idempotent: skips ships whose name is already on the registry.
//
// Image sources (downloaded 2026-08-01, openly licensed):
// - marauder.jpg    CC0    masbt, flickr.com/photos/…/11575373524 ("The Freelancer", Star Citizen fan render)
// - ghost.jpg       CC0    masbt, flickr.com/photos/…/11939517433 (same series)
// - malevolence.jpg PDM    chris-hayes, flickr.com/photos/…/52323924609 (AI-generated capital ships)
// - profundity.jpg  PDM    chris-hayes, flickr.com/photos/…/52322695197 (AI-generated capital ships)
// - ebon-hawk.jpg   CC BY  Ninjagraphy, flickr.com/photos/…/8621608380 ("Spaceship") — attribution required.
const IMAGES_DIR = path.join(import.meta.dirname, "images");

const NEW_SHIPS = [
  { name: "Marauder", containers: 55, location: "Bespin", image: "marauder" },
  { name: "Ghost", containers: 40, location: "Jakku", image: "ghost" },
  { name: "Malevolence", containers: 100, location: "Tatooine", image: "malevolence" },
  { name: "Profundity", containers: 90, location: "Kashyyyk", image: "profundity" },
  { name: "Ebon Hawk", containers: 30, location: "Endor", image: "ebon-hawk" },
];

async function main() {
  const db = getDb();

  // Same owner as the existing fleet (the production guest captain).
  const [existing] = await db.select({ userId: ships.userId }).from(ships).limit(1);
  if (!existing) throw new Error("No existing ships to take the owner from — seed first.");

  for (const s of NEW_SHIPS) {
    const [dupe] = await db
      .select({ id: ships.id })
      .from(ships)
      .where(eq(ships.name, s.name));
    if (dupe) {
      console.log(`${s.name}: already registered, skipping`);
      continue;
    }

    const jpg = path.join(IMAGES_DIR, `${s.image}.jpg`);
    const webp = path.join(IMAGES_DIR, `${s.image}.webp`);
    await sharp(jpg).webp({ quality: 82 }).toFile(webp);
    await unlink(jpg);

    const data = await readFile(webp);
    const blob = await put(`ships/${s.image}.webp`, data, {
      access: "public",
      allowOverwrite: true,
    });
    const [row] = await db
      .insert(ships)
      .values({
        name: s.name,
        containers: s.containers,
        location: s.location,
        imageUrl: blob.url,
        userId: existing.userId,
      })
      .returning();
    console.log(`Registered ${row.name} (${row.containers} CTU) at ${row.location}`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
