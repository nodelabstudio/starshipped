import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put, del } from "@vercel/blob";
import { eq, like } from "drizzle-orm";
import { getDb } from "../src/db";
import { ships } from "../src/db/schema";

// One-off: convert seed images to WebP, re-upload to Blob, point ship rows at
// the new URLs, and delete the old blobs.
const IMAGES_DIR = path.join(import.meta.dirname, "images");

async function main() {
  const files = (await readdir(IMAGES_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  for (const file of files) {
    const src = path.join(IMAGES_DIR, file);
    const base = file.replace(/\.(jpe?g|png)$/i, "");
    const out = path.join(IMAGES_DIR, `${base}.webp`);
    await sharp(src).webp({ quality: 82 }).toFile(out);
    await unlink(src);
    console.log(`Converted ${file} -> ${base}.webp`);
  }

  const db = getDb();
  const rows = await db.select().from(ships).where(like(ships.imageUrl, "%/ships/%"));
  for (const ship of rows) {
    if (!ship.imageUrl || ship.imageUrl.includes(".webp")) continue;
    const oldUrl = ship.imageUrl;
    const oldFile = decodeURIComponent(new URL(oldUrl).pathname.split("/").pop()!);
    const base = oldFile.replace(/\.(jpe?g|png)$/i, "");
    const localWebp = path.join(IMAGES_DIR, `${base}.webp`);
    const data = await readFile(localWebp);
    const blob = await put(`ships/${base}.webp`, data, {
      access: "public",
      allowOverwrite: true,
    });
    await db.update(ships).set({ imageUrl: blob.url }).where(eq(ships.id, ship.id));
    await del(oldUrl);
    console.log(`${ship.name}: ${oldFile} -> ${base}.webp`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
