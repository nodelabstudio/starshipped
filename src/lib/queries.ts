import { count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { ships, jobs, assignments } from "@/db/schema";

export function getShips() {
  return getDb().query.ships.findMany({ orderBy: desc(ships.createdAt) });
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
