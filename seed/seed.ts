import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { createClerkClient } from "@clerk/backend";
import { getDb } from "../src/db";
import { ships, jobs, assignments } from "../src/db/schema";

// The original app's demo login from the 2018 README.
const GUEST_EMAIL = "guest@gmail.com";
const GUEST_PASSWORD = "guestpass";

const SHIPS = [
  { name: "Millennium Falcon", containers: 100, location: "Corellia", image: "millennium-falcon.webp" },
  { name: "Outrider", containers: 80, location: "Tatooine", image: "outrider.webp" },
  { name: "Imperial Star Destroyer", containers: 100, location: "Coruscant", image: "star-destroyer.webp" },
  { name: "Republic Cruiser", containers: 60, location: "Naboo", image: "republic-cruiser.webp" },
  { name: "Republic Interceptor", containers: 25, location: "Kamino", image: "republic-interceptor.webp" },
  { name: "XS Stock Light Freighter", containers: 45, location: "Corellia", image: "xs-stock-light.webp" },
  { name: "Archangel", containers: 70, location: "Bespin", image: "archangel.webp" },
];

const JOBS = [
  { name: "Tibanna Gas Haul", description: "Refined tibanna gas from Cloud City, sealed cryo-containers.", origin: "Bespin", destination: "Coruscant", cost: 12000, containers: 40 },
  { name: "Clone Supply Convoy", description: "Medical and armor resupply for the Kamino facilities.", origin: "Coruscant", destination: "Kamino", cost: 8500, containers: 60 },
  { name: "Wroshyr Timber Export", description: "Cut wroshyr lumber for Naboo palace restoration.", origin: "Kashyyyk", destination: "Naboo", cost: 5200, containers: 30 },
  { name: "Jakku Salvage Run", description: "Scrap-metal reclamation from crashed capital ships.", origin: "Jakku", destination: "Corellia", cost: 3100, containers: 25 },
  { name: "Hoth Outpost Resupply", description: "Thermal generators and rations. Cold-rated hulls only.", origin: "Corellia", destination: "Hoth", cost: 9800, containers: 20 },
];

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  // Recreate the guest captain, idempotently.
  let guest = (await clerk.users.getUserList({ emailAddress: [GUEST_EMAIL] })).data[0];
  if (!guest) {
    guest = await clerk.users.createUser({
      emailAddress: [GUEST_EMAIL],
      password: GUEST_PASSWORD,
      firstName: "Guest",
      lastName: "Captain",
      skipPasswordChecks: true,
    });
    console.log(`Created guest captain ${GUEST_EMAIL}`);
  } else {
    console.log(`Guest captain already exists`);
  }

  const db = getDb();
  const existing = await db.select({ id: ships.id }).from(ships).limit(1);
  if (existing.length > 0) {
    console.log("Ships already seeded, skipping.");
    return;
  }

  const insertedShips = [];
  for (const s of SHIPS) {
    const file = await readFile(path.join(import.meta.dirname, "images", s.image));
    const blob = await put(`ships/${s.image}`, file, {
      access: "public",
      allowOverwrite: true,
    });
    const [row] = await db
      .insert(ships)
      .values({ name: s.name, containers: s.containers, location: s.location, imageUrl: blob.url, userId: guest.id })
      .returning();
    insertedShips.push(row);
    console.log(`Seeded ship: ${row.name}`);
  }

  const insertedJobs = [];
  for (const j of JOBS) {
    const [row] = await db
      .insert(jobs)
      .values({ ...j, userId: guest.id })
      .returning();
    insertedJobs.push(row);
    console.log(`Seeded job: ${row.name}`);
  }

  // A few assignments so the board isn't empty.
  const pairs: Array<[number, number]> = [
    [0, 0], // Falcon -> Tibanna Gas Haul
    [2, 1], // Star Destroyer -> Clone Supply Convoy
    [1, 3], // Outrider -> Jakku Salvage Run
    [6, 4], // Archangel -> Hoth Outpost Resupply
  ];
  for (const [shipIdx, jobIdx] of pairs) {
    await db.insert(assignments).values({
      shipId: insertedShips[shipIdx].id,
      jobId: insertedJobs[jobIdx].id,
    });
  }
  console.log(`Seeded ${pairs.length} assignments`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
