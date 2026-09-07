import Image from 'next/image';

export function HangarBackdrop() {
  return <Image src="/art/spaceport-hangar.png" alt="" fill sizes="(max-width: 900px) 100vw, 75vw" className="hangar-backdrop" />;
}
