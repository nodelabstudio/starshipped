export function PortMark({ className = '' }: { className?: string }) {
  return <svg className={`port-mark ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M5 22V10L16 4l11 6v12l-11 6-11-6Z" stroke="currentColor" strokeWidth="1.2" />
    <path d="m10 12 12-1-9 8 9-1M10 22l3-3M19 11l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="bevel" />
  </svg>;
}
