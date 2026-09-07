import Image from 'next/image';
import { PLANET_APPEARANCE } from '@/lib/planet-appearance';

export function WorldMark({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`world-mark ${className}`} aria-hidden="true">
    {PLANET_APPEARANCE[name] ? <Image src={`/portraits/${name.toLowerCase()}.png`} alt="" width={160} height={160} sizes="(max-width: 680px) 80px, 160px" /> : <span className="world-unknown" />}
  </span>;
}
