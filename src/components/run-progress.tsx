"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNow } from "@/lib/use-now";

function eta(ms: number) {
  const s = Math.max(Math.ceil(ms / 1000), 0);
  if (s >= 3600) {
    return `ETA ${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
  }
  return `ETA ${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Progress bar + countdown for an in-transit run. Times are epoch ms.
export function RunProgress({
  departsAt,
  arrivesAt,
}: {
  departsAt: number;
  arrivesAt: number;
}) {
  const router = useRouter();
  const refreshed = useRef(false);
  // Server snapshot is departsAt, so SSR renders the run at 0% and the client
  // snaps forward on hydration.
  const now = useNow(departsAt);

  const fraction = Math.min(
    Math.max((now - departsAt) / Math.max(arrivesAt - departsAt, 1), 0),
    1,
  );
  const arrived = now >= arrivesAt;

  // Refresh once on arrival so settlement lands without a manual reload.
  useEffect(() => {
    if (arrived && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [arrived, router]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-line" aria-hidden>
        <div
          className="h-full bg-holo shadow-[0_0_6px_rgba(92,200,255,0.5)]"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        className="font-mono text-xs text-dim whitespace-nowrap"
        suppressHydrationWarning
      >
        {arrived ? "ARRIVING" : eta(arrivesAt - now)}
      </span>
    </div>
  );
}
