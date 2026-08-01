"use server";

import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { ships, jobs, assignments } from "@/db/schema";
import { PLANETS, MIN_CONTAINERS, MAX_CONTAINERS } from "@/lib/planets";
import { travelMs } from "@/lib/starmap";

export type FormState = { error: string } | null;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

// Allowed upload types; blob keys use our own extension, never the client filename.
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function isUniqueViolation(e: unknown) {
  return (e as { code?: string })?.code === "23505";
}

function parsePlanet(value: FormDataEntryValue | null) {
  const planet = String(value ?? "");
  return (PLANETS as readonly string[]).includes(planet) ? planet : null;
}

async function uploadImage(file: File) {
  const blob = await put(`ships/${Date.now()}.${IMAGE_TYPES[file.type]}`, file, {
    access: "public",
    contentType: file.type,
  });
  return blob.url;
}

type ParseResult<T> = { ok: false; error: string } | { ok: true; values: T; file: File | null };

function parseShipForm(
  formData: FormData,
): ParseResult<{ name: string; containers: number; location: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const containers = Number(formData.get("containers"));
  const location = parsePlanet(formData.get("location"));
  if (!name) return { ok: false, error: "Every ship needs a name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Ship names are capped at ${MAX_NAME_LENGTH} characters.` };
  }
  if (
    !Number.isInteger(containers) ||
    containers < MIN_CONTAINERS ||
    containers > MAX_CONTAINERS
  ) {
    return {
      ok: false,
      error: `Container capacity must be between ${MIN_CONTAINERS} and ${MAX_CONTAINERS}.`,
    };
  }
  if (!location) {
    return { ok: false, error: "Pick a known planet for the ship's location." };
  }

  const image = formData.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  if (file && !IMAGE_TYPES[file.type]) {
    return {
      ok: false,
      error: "The visual feed must be a JPEG, PNG, WebP, GIF, or AVIF image.",
    };
  }
  if (file && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image is too large — keep it under 5 MB." };
  }
  return { ok: true, values: { name, containers, location }, file };
}

export async function createShip(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to commission a ship." };

  const parsed = parseShipForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const imageUrl = parsed.file ? await uploadImage(parsed.file) : null;

  let shipId: number;
  try {
    const [row] = await getDb()
      .insert(ships)
      .values({ ...parsed.values, imageUrl, userId })
      .returning({ id: ships.id });
    shipId = row.id;
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: "A ship with that name is already registered." };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/ships/${shipId}`);
}

export async function updateShip(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to update this ship." };

  const ship = await getDb().query.ships.findFirst({ where: eq(ships.id, id) });
  if (!ship) return { error: "That ship is no longer on the registry." };
  if (ship.userId !== userId) {
    return { error: "Only this ship's captain can update it." };
  }

  const parsed = parseShipForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const imageUrl = parsed.file ? await uploadImage(parsed.file) : ship.imageUrl;

  try {
    await getDb()
      .update(ships)
      .set({ ...parsed.values, imageUrl })
      .where(eq(ships.id, id));
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: "A ship with that name is already registered." };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/ships/${id}`);
}

export async function deleteShip(id: number) {
  const { userId } = await auth();
  if (!userId) return;
  const ship = await getDb().query.ships.findFirst({ where: eq(ships.id, id) });
  if (!ship || ship.userId !== userId) return;
  await getDb().delete(ships).where(eq(ships.id, id));
  revalidatePath("/", "layout");
  redirect("/ships");
}

function parseJobForm(formData: FormData): ParseResult<{
  name: string;
  description: string | null;
  origin: string;
  destination: string;
  cost: number;
  containers: number;
}> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const origin = parsePlanet(formData.get("origin"));
  const destination = parsePlanet(formData.get("destination"));
  const cost = Number(formData.get("cost"));
  const containers = Number(formData.get("containers"));
  if (!name) return { ok: false, error: "Every cargo run needs a name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Run names are capped at ${MAX_NAME_LENGTH} characters.` };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Cargo details are capped at ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }
  if (!origin || !destination) {
    return { ok: false, error: "Pick a known planet for origin and destination." };
  }
  if (origin === destination) {
    return { ok: false, error: "Origin and destination can't be the same planet." };
  }
  if (!Number.isInteger(cost) || cost < 0) {
    return { ok: false, error: "Pay must be zero or more credits." };
  }
  if (!Number.isInteger(containers) || containers < 1 || containers > MAX_CONTAINERS) {
    return { ok: false, error: `Containers needed must be between 1 and ${MAX_CONTAINERS}.` };
  }
  return {
    ok: true,
    values: { name, description: description || null, origin, destination, cost, containers },
    file: null,
  };
}

export async function createJob(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to post a cargo run." };

  const parsed = parseJobForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const [row] = await getDb()
    .insert(jobs)
    .values({ ...parsed.values, userId })
    .returning({ id: jobs.id });
  revalidatePath("/", "layout");
  redirect(`/jobs/${row.id}`);
}

export async function updateJob(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to update this cargo run." };

  const job = await getDb().query.jobs.findFirst({ where: eq(jobs.id, id) });
  if (!job) return { error: "That cargo run is no longer on the board." };
  if (job.userId !== userId) {
    return { error: "Only the captain who posted this run can update it." };
  }

  const parsed = parseJobForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  await getDb().update(jobs).set(parsed.values).where(eq(jobs.id, id));
  revalidatePath("/", "layout");
  redirect(`/jobs/${id}`);
}

export async function deleteJob(id: number) {
  const { userId } = await auth();
  if (!userId) return;
  const job = await getDb().query.jobs.findFirst({ where: eq(jobs.id, id) });
  if (!job || job.userId !== userId) return;
  await getDb().delete(jobs).where(eq(jobs.id, id));
  revalidatePath("/", "layout");
  redirect("/jobs");
}

export async function createAssignment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to dispatch a ship." };

  const shipId = Number(formData.get("shipId"));
  const jobId = Number(formData.get("jobId"));
  if (!Number.isInteger(shipId) || shipId <= 0 || !Number.isInteger(jobId) || jobId <= 0) {
    return { error: "Pick both a ship and a cargo run." };
  }

  const [ship, job] = await Promise.all([
    getDb().query.ships.findFirst({
      where: eq(ships.id, shipId),
      with: { assignments: true },
    }),
    getDb().query.jobs.findFirst({
      where: eq(jobs.id, jobId),
      with: { assignments: true },
    }),
  ]);
  if (!ship || !job) {
    return { error: "That ship or run is no longer on the registry." };
  }
  if (ship.assignments.some((a) => a.completedAt === null)) {
    return { error: `${ship.name} is in hyperspace — wait for it to dock.` };
  }
  if (job.assignments.some((a) => a.completedAt === null)) {
    return { error: "That contract is already claimed — a ship is en route." };
  }
  if (job.assignments.some((a) => a.completedAt !== null)) {
    return { error: "That contract has already been fulfilled." };
  }
  if (ship.containers < job.containers) {
    return {
      error: `${ship.name} only holds ${ship.containers} CTU — this run needs ${job.containers}.`,
    };
  }

  const departsAt = new Date();
  const arrivesAt = new Date(departsAt.getTime() + travelMs(job.origin, job.destination));

  try {
    await getDb().insert(assignments).values({ shipId, jobId, departsAt, arrivesAt });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: "That ship is already dispatched to that run." };
    }
    if ((e as { code?: string })?.code === "23503") {
      return { error: "That ship or run is no longer on the registry." };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  return null;
}

export async function deleteAssignment(id: number) {
  const { userId } = await auth();
  if (!userId) return;
  const run = await getDb().query.assignments.findFirst({
    where: eq(assignments.id, id),
    with: { ship: true },
  });
  if (!run || run.ship.userId !== userId) return;
  await getDb().delete(assignments).where(eq(assignments.id, id));
  revalidatePath("/", "layout");
}
