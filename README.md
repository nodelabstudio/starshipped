# StarShipped

Star Wars fleet logistics for the Outer Rim. Commission ships, post cargo runs,
and dispatch the fleet across ten planets — from Tatooine to Kashyyyk.

Originally designed and built in 2018 as a Ruby on Rails app by
**Mario Borras & Angel Rodriguez**. Rebuilt in 2026 on Next.js, with the
original ship images preserved as seed data.

**Live:** https://starshipped.vercel.app
**Demo login:** `guest@gmail.com` · `kessel-run-2268`

## What it does

- **Fleet** — commission ships with a name, container capacity (5–100 CTU),
  planet location, and an image. Anyone can browse; only a ship's captain can
  edit or decommission it.
- **Cargo runs** — post jobs with an origin, destination, pay, and containers
  needed.
- **Dispatch** — assign ships to runs (many-to-many), release them when done.
- **Captains** — every registered user, with their fleet counts.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, server actions) + React 19 + Tailwind 4
- [Clerk](https://clerk.com) — authentication (Vercel Marketplace integration)
- [Neon Postgres](https://neon.tech) + [Drizzle ORM](https://orm.drizzle.team) (Vercel Marketplace integration)
- [Vercel Blob](https://vercel.com/docs/vercel-blob) — ship image storage

## Local development

```bash
npm install
vercel env pull .env.local   # pulls DATABASE_URL, Clerk keys, Blob token
npm run dev
```

## Database

```bash
npm run db:push   # push schema in src/db/schema.ts to Neon
npm run db:seed   # create the guest captain, upload ship images, seed data
```

The seed is idempotent — it skips if ships already exist.

## Credits & licenses

- Code: [MIT](LICENSE).
- Ship renders added in 2026 (`seed/add-fleet-ships.ts`): two CC0 renders by
  masbt and two public-domain renders by chris-hayes, both via Flickr; the
  Ebon Hawk image is ["Spaceship" by Ninjagraphy](https://www.flickr.com/photos/ninjagraphy/8621608380)
  ([CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)). Source URLs are
  recorded in the script.
- Fonts: [Aurebesh by SilvinoR](https://github.com/silvinor/font-aurebesh)
  (OFL-1.1, license bundled at `src/fonts/AUREBESH-LICENSE.md`); Michroma and
  Share Tech Mono from [Google Fonts](https://fonts.google.com) (OFL-1.1).
- StarShipped is a fan project for learning and demo purposes. It is not
  affiliated with, endorsed by, or sponsored by Lucasfilm Ltd. or Disney.
  Star Wars ship and planet names are trademarks of their respective owners.
