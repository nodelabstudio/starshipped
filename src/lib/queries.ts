import { and, count, desc, eq, isNull, lte, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { ships, jobs, assignments } from "@/db/schema";

export function getShips() {
  return getDb().query.ships.findMany({
    orderBy: desc(ships.createdAt),
    with: { assignments: { with: { job: true } } },
  });
}

// Land any runs whose arrival time has passed. The ship moves first and
// completedAt is set last: neon-http has no transactions, so a crash between
// the two writes leaves the row eligible for retry (the double-write is
// idempotent).
export async function settleArrivals() {
  const db = getDb();
  const due = await db.query.assignments.findMany({
    where: and(isNull(assignments.completedAt), lte(assignments.arrivesAt, new Date())),
    with: { job: true },
  });
  for (const a of due) {
    await db
      .update(ships)
      .set({ location: a.job.destination })
      .where(eq(ships.id, a.shipId));
    await db
      .update(assignments)
      .set({ completedAt: a.arrivesAt })
      .where(eq(assignments.id, a.id));
  }
}

export type ActivityEvent = {
  kind: "departed" | "delivered";
  at: number;
  shipId: number;
  shipName: string;
  jobId: number;
  jobName: string;
  origin: string;
  destination: string;
};

export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const rows = await getDb().query.assignments.findMany({
    with: { ship: true, job: true },
  });
  const events: ActivityEvent[] = [];
  for (const a of rows) {
    const base = {
      shipId: a.ship.id,
      shipName: a.ship.name,
      jobId: a.job.id,
      jobName: a.job.name,
      origin: a.job.origin,
      destination: a.job.destination,
    };
    events.push({ kind: "departed", at: a.departsAt.getTime(), ...base });
    if (a.completedAt) {
      events.push({ kind: "delivered", at: a.completedAt.getTime(), ...base });
    }
  }
  return events.sort((a, b) => b.at - a.at).slice(0, 8);
}

export function getShip(id: number) {
  return getDb().query.ships.findFirst({
    where: eq(ships.id, id),
    with: { assignments: { with: { job: true } } },
  });
}

export function getJobs() {
  return getDb().query.jobs.findMany({
    orderBy: desc(jobs.createdAt),
    with: { assignments: { with: { ship: true } } },
  });
}

export function getJob(id: number) {
  return getDb().query.jobs.findFirst({
    where: eq(jobs.id, id),
    with: { assignments: { with: { ship: true } } },
  });
}

export function getAssignments() {
  return getDb().query.assignments.findMany({
    orderBy: desc(assignments.createdAt),
    with: { ship: true, job: true },
  });
}

export async function getFleetStats() {
  const db = getDb();
  const [shipRow] = await db
    .select({ count: count(), capacity: sum(ships.containers) })
    .from(ships);
  const [jobRow] = await db
    .select({ count: count(), credits: sum(jobs.cost) })
    .from(jobs);
  return {
    ships: shipRow.count,
    capacity: Number(shipRow.capacity ?? 0),
    jobs: jobRow.count,
    credits: Number(jobRow.credits ?? 0),
  };
}

export async function getShipCountsByUser() {
  const rows = await getDb()
    .select({ userId: ships.userId, count: count() })
    .from(ships)
    .groupBy(ships.userId);
  return new Map(rows.map((r) => [r.userId, r.count]));
}
