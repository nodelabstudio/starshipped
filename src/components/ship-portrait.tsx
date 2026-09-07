import Image from 'next/image';
import { shipModelForName } from '@/lib/ship-model';
import { PortMark } from './port-mark';

export function ShipPortrait({ name, src, priority = false, className = '' }: { name: string; src: string | null; priority?: boolean; className?: string }) {
  const model = shipModelForName(name);
  const source = model ? `/portraits/${model}.png` : src;
  return <div className={`ship-portrait ${model ? 'ship-portrait--studio' : ''} ${className}`}>
    {source ? <Image src={source} alt={name} fill priority={priority} sizes="(max-width: 680px) 90vw, (max-width: 1000px) 45vw, 30vw" className="ship-portrait-image" /> : <div className="ship-portrait-empty"><PortMark /><span>Awaiting a visual record</span></div>}
  </div>;
}
