import { useSyncExternalStore } from "react";

// Shared 1s ticking clock for client components (the repo's lint rules forbid
// setState-in-effect, so timers go through useSyncExternalStore). getSnapshot
// must return this cached value, not Date.now() directly: React re-renders
// whenever getSnapshot's result changes, so a live read recurses on any render
// slower than 1ms ("Maximum update depth exceeded"). The cache only moves
// inside the interval callback.
let now = Date.now();

function subscribe(onChange: () => void) {
  const id = setInterval(() => {
    now = Date.now();
    onChange();
  }, 1000);
  return () => clearInterval(id);
}

// serverSnapshot is what SSR/hydration renders before the clock starts.
export function useNow(serverSnapshot: number) {
  return useSyncExternalStore(subscribe, () => now, () => serverSnapshot);
}
