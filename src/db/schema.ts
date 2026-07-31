import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const ships = pgTable("ships", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  containers: integer("containers").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  cost: integer("cost").notNull(),
  containers: integer("containers").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    shipId: integer("ship_id")
      .notNull()
      .references(() => ships.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("assignments_ship_job_unique").on(table.shipId, table.jobId)],
);

export const shipsRelations = relations(ships, ({ many }) => ({
  assignments: many(assignments),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  ship: one(ships, { fields: [assignments.shipId], references: [ships.id] }),
  job: one(jobs, { fields: [assignments.jobId], references: [jobs.id] }),
}));

export type Ship = typeof ships.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
