import Image from 'next/image';
import Link from 'next/link';
import { getShips, getJobs, settleArrivals } from '@/lib/queries';
import { registry } from '@/lib/format';
import { cargoState } from '@/lib/fleet-view';
import { ShipViewport } from '@/components/ship-viewport';
import { ActivityFeed } from '@/components/activity-feed';
import { CargoManifest } from '@/components/cargo-manifest';
import { PortMark } from '@/components/port-mark';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await settleArrivals();
  const [ships, jobs] = await Promise.all([getShips(), getJobs()]);
  const featured = ships.find((ship) => ship.name === 'Millennium Falcon') ?? ships.find((ship) => ship.name === 'Imperial Star Destroyer') ?? ships[0];
  const openJobs = jobs.filter((job) => cargoState(job.assignments) === 'available');
  const underway = ships.filter((ship) => ship.assignments.some((assignment) => assignment.completedAt === null)).length;
  const featuredJourney = featured?.assignments.find((assignment) => assignment.completedAt === null);
  return <div className="spaceport-home">
    <section className="port-hero">
      <Image src="/art/spaceport-hangar.png" alt="" fill priority sizes="100vw" className="port-hero-backdrop" />
      <div className="port-hero-shade" aria-hidden="true" />
      <div id="hero-copy" className="port-hero-copy"><p className="port-hero-overline"><PortMark />Independent fleet logistics</p><h1>For the<br />long haul.</h1><p>Commission a vessel, take a contract, and carry your cargo across ten worlds.</p>
        <div className="port-hero-actions"><Link href="/ships" className="btn-primary">Enter the hangar <span aria-hidden="true">↗</span></Link><Link href="/map" className="port-text-link">Open starmap</Link></div>
      </div>
      {featured ? <div className="port-hero-vessel"><ShipViewport src={featured.imageUrl} name={featured.name} containers={featured.containers} priority sizes="(max-width: 680px) 76vw, (max-width: 1100px) 50vw, 600px" className="aspect-[4/3]" presentation="hangar" modeOrder="hull-first" /><Link href={`/ships/${featured.id}`} className="hero-vessel-caption"><span>{registry(featured.id)} / {featured.name}</span><span>{featuredJourney ? `Bound for ${featuredJourney.job.destination}` : `In dock at ${featured.location}`}</span></Link></div> : null}
      <div className="port-hero-bottom"><span>Outer Rim operations</span><span>Est. 2018 <span aria-hidden="true">/</span> A galaxy of possibility</span></div>
    </section>
    <section className="port-operating-strip" aria-label="Fleet overview">
      <Link href="/ships"><strong>{ships.length}</strong><span>Vessels in the registry</span></Link><Link href="/assignments"><strong>{underway.toString().padStart(2, '0')}</strong><span>Currently underway</span></Link><Link href="/jobs"><strong>{openJobs.length.toString().padStart(2, '0')}</strong><span>Open cargo contracts</span></Link><div><strong>{ships.reduce((sum, ship) => sum + ship.containers, 0)}<small> CTU</small></strong><span>Combined cargo capacity</span></div>
    </section>
    <div className="port-home-lower"><section><div className="port-section-heading"><div><p className="port-kicker">Cargo board</p><h2>The next departure.</h2></div><Link href="/jobs" className="port-text-link">All contracts ↗</Link></div>
      {openJobs[0] ? <CargoManifest job={openJobs[0]} /> : <div className="port-empty"><h3>All cargo is accounted for.</h3><p>The next journey starts with a new contract.</p><Link href="/jobs/new" className="btn-ghost">Post a cargo run</Link></div>}
    </section><ActivityFeed /></div>
  </div>;
}
