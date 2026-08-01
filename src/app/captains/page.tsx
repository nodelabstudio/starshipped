import Image from "next/image";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCaptainStats, getShipCountsByUser } from "@/lib/queries";
import { credits } from "@/lib/format";

export const dynamic = "force-dynamic";

// Full droidmail addresses are for signed-in captains only.
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local?.[0] ?? ""}•••@${domain ?? ""}`;
}

export default async function CaptainsPage() {
  const client = await clerkClient();
  const [{ data: users }, shipCounts, captainStats, { userId }] = await Promise.all([
    client.users.getUserList({ limit: 100, orderBy: "+created_at" }),
    getShipCountsByUser(),
    getCaptainStats(),
    auth(),
  ]);

  // Leaderboard: earned credits desc, then fleet size desc, then Clerk order.
  const ranked = users
    .map((user, index) => ({ user, index }))
    .sort((a, b) => {
      const earnedA = captainStats.get(a.user.id)?.earned ?? 0;
      const earnedB = captainStats.get(b.user.id)?.earned ?? 0;
      if (earnedB !== earnedA) return earnedB - earnedA;
      const shipsA = shipCounts.get(a.user.id) ?? 0;
      const shipsB = shipCounts.get(b.user.id) ?? 0;
      if (shipsB !== shipsA) return shipsB - shipsA;
      return a.index - b.index;
    })
    .map(({ user }) => user);

  return (
    <div className="pt-10 space-y-8">
      <div>
        <p className="eyebrow aurebesh mb-2">Crew roster</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          All captains
        </h1>
      </div>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ranked.map((user, rank) => {
          const email = user.primaryEmailAddress?.emailAddress ?? "unknown";
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            email.split("@")[0];
          const shipCount = shipCounts.get(user.id) ?? 0;
          const stats = captainStats.get(user.id);
          return (
            <li key={user.id} className="panel p-5 flex items-center gap-4">
              <p
                className={`font-mono text-xs tracking-[0.15em] shrink-0 ${
                  rank === 0 ? "text-amber" : "text-dim"
                }`}
              >
                #{rank + 1}
              </p>
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
                  Droidmail:{" "}
                  <span className="text-holo">{userId ? email : maskEmail(email)}</span>
                </p>
                <p className="eyebrow mt-1">
                  {shipCount} {shipCount === 1 ? "ship" : "ships"} in fleet
                </p>
                <p className="font-mono text-xs mt-1">
                  {stats ? (
                    <>
                      <span className="text-amber">{credits(stats.earned)}</span>
                      <span className="text-dim">
                        {" "}
                        &middot; {stats.deliveries}{" "}
                        {stats.deliveries === 1 ? "delivery" : "deliveries"}
                      </span>
                    </>
                  ) : (
                    <span className="text-dim">No deliveries yet</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
