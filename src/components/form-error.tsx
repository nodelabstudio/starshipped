export function FormError({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="border border-danger/40 bg-danger/5 px-4 py-3">
      <p className="font-mono text-xs tracking-[0.15em] uppercase text-danger">
        Transmission rejected
      </p>
      <p className="text-sm text-ink mt-1">{error}</p>
    </div>
  );
}
