// Origin -> destination readout for a cargo run.
export function RouteLine({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  return (
    <div className="flex items-center gap-3 font-mono text-sm uppercase tracking-[0.1em]">
      <span className="flex items-center gap-2 text-ink">
        <span className="size-1.5 rounded-full bg-holo shadow-[0_0_6px_rgba(92,200,255,0.6)]" />
        {origin}
      </span>
      <span
        className="flex-1 min-w-6 border-t border-dashed border-line relative"
        aria-hidden
      >
        <span className="absolute -right-0.5 -top-[4.5px] text-holo text-[10px] leading-none">
          &#9656;
        </span>
      </span>
      <span className="flex items-center gap-2 text-ink">
        <span className="size-1.5 rounded-full bg-amber shadow-[0_0_6px_rgba(255,183,87,0.6)]" />
        {destination}
      </span>
    </div>
  );
}
