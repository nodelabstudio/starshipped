import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { ships, jobs } from "../src/db/schema";

// One-off: create the guest captain in the Clerk PRODUCTION instance and
// re-point seeded ships/jobs from the dev-instance user id to the new one.
// Requires CLERK_SECRET_KEY to be the sk_live key.
const GUEST_EMAIL = "guest@gmail.com";
const GUEST_PASSWORD = "kessel-run-2268";

async function main() {
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("CLERK_SECRET_KEY is not a production key");
  }
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  let guest = (await clerk.users.getUserList({ emailAddress: [GUEST_EMAIL] })).data[0];
  if (!guest) {
    guest = await clerk.users.createUser({
      emailAddress: [GUEST_EMAIL],
      password: GUEST_PASSWORD,
      firstName: "Guest",
      lastName: "Captain",
      skipPasswordChecks: true,
    });
    console.log("Created production guest captain");
  } else {
    console.log("Production guest captain already exists");
  }

  const db = getDb();
  const seededShips = await db.select({ userId: ships.userId }).from(ships).limit(1);
  const oldId = seededShips[0]?.userId;
  if (!oldId) throw new Error("No ships found");
  if (oldId === guest.id) {
    console.log("Ships already owned by production guest, nothing to do");
    return;
  }
  const movedShips = await db
    .update(ships)
    .set({ userId: guest.id })
    .where(eq(ships.userId, oldId))
    .returning({ id: ships.id });
  const movedJobs = await db
    .update(jobs)
    .set({ userId: guest.id })
    .where(eq(jobs.userId, oldId))
    .returning({ id: jobs.id });
  console.log(
    `Re-pointed ${movedShips.length} ships and ${movedJobs.length} jobs from ${oldId} to ${guest.id}`,
  );
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
