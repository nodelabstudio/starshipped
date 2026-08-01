import { eq, isNull } from "drizzle-orm";
import { getDb } from "../src/db";
import { assignments } from "../src/db/schema";
import { travelMs } from "../src/lib/starmap";

// One-off backfill: give every unfinished assignment a fresh departure now
// and an arrival based on its job's route.
async function main() {
  const db = getDb();
  const rows = await db.query.assignments.findMany({
    where: isNull(assignments.completedAt),
    with: { job: true },
  });

  for (const row of rows) {
    const departsAt = new Date();
    const arrivesAt = new Date(
      departsAt.getTime() + travelMs(row.job.origin, row.job.destination),
    );
    await db
      .update(assignments)
      .set({ departsAt, arrivesAt })
      .where(eq(assignments.id, row.id));
  }
  console.log(`Backfilled run times on ${rows.length} assignments`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
