import Image from "next/image";
import { clerkClient } from "@clerk/nextjs/server";
import { getShipCountsByUser } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CaptainsPage() {
  const client = await clerkClient();
  const [{ data: users }, shipCounts] = await Promise.all([
    client.users.getUserList({ limit: 100, orderBy: "+created_at" }),
    getShipCountsByUser(),
  ]);

  return (
    <div className="pt-10 space-y-8">
      <div>
        <p className="eyebrow mb-2">Crew roster</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          All captains
        </h1>
      </div>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((user) => {
          const email = user.primaryEmailAddress?.emailAddress ?? "unknown";
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            email.split("@")[0];
          const shipCount = shipCounts.get(user.id) ?? 0;
          return (
            <li key={user.id} className="panel p-5 flex items-center gap-4">
              <div className="relative size-12 shrink-0 border border-line overflow-hidden">
                <Image
                  src={user.imageUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xs tracking-[0.08em] uppercase truncate">
                  {name}
                </p>
                <p className="font-mono text-xs text-dim truncate mt-1">
                  Droidmail: <span className="text-holo">{email}</span>
                </p>
                <p className="eyebrow mt-1">
                  {shipCount} {shipCount === 1 ? "ship" : "ships"} in fleet
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
