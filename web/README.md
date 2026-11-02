# Expo Go Builds website

Static Astro page with server-rendered React controls, the generated Better Design silver component system, and optimized silver and glass hero artwork. Primary downloads work from the rendered HTML before JavaScript loads. SDK selection uses an accessible Radix custom list with keyboard navigation, selected state, Escape dismissal and collision-aware placement. SDK selection and source copying hydrate on load; theme switching works before React loads.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run check:seo
```

Vercel: set the project root directory to `web`, framework to Astro, build command to `npm run build`, and output directory to `dist`. No server adapter is required. `SITE_URL` optionally overrides the canonical site origin; the default is `https://expo-go-builds.vercel.app`.

`prebuild` refreshes bundled data from the repository’s `apps.json` and `android.json` when available. Otherwise it uses the checked-in snapshot. The page refreshes from the public iOS and Android catalogs at runtime, validates repository-owned IPA/APK links, and keeps the bundled release list when the network fails. An SDK without an actual release entry is disabled. The source contains separate SDK entries; the download button uses the selected SDK and platform. Both themes share the same typography and geometry.

Theme follows the system until a person chooses light or dark. Each click on the small top-right toggle switches the visible appearance and saves that choice locally. The early inline page script handles clicks before React loads; CSS keeps the visible icon aligned with the effective theme. The transparent hero-dark and hero-light artwork uses contain sizing with space around every edge, without a canvas, artificial floor or cropped image background. Useful content and download links never depend on animation.

Browser icons use a flat, transparent Expo symbol from Simple Icons: dark in light mode and white in dark mode. They follow the saved website theme and system changes. Run `node scripts/build-icons.mjs` to regenerate the SVG, PNG, ICO and touch-icon exports from `src/assets/expo.svg`. The adaptive SVG also follows system appearance without JavaScript.

The actual generated Button and its MetalRing module are retained. Unused registry components and dependencies were removed to keep the project small. The primary download explicitly disables the optional decorative ring.

## Design source

Approved Better Design project: `09bcce15-d350-4958-9624-8c04a2d7b442`. The actual generated React components are under `src/components/ui` and the generated tokens (with noncyclic self-hosted font mappings) are in `src/styles/globals.css`. `site.css` adds the requested matching light theme and page composition. Icons use local Solar outline SVGs and the recognizable GitHub brand mark, with the original theme and copy icons retained.

## Verification

`npm test` checks catalog validation, SDK asset mapping, LiveContainer source encoding, and theme switching before React loads, including system changes and unavailable storage. `npm run check` checks Astro and TypeScript. `npm run build` verifies static generation. Physical iPhone signing/import depends on the person’s installation tool and is separate from browser verification.

Responsive browser verification covers 320–1920px widths, matching light/dark geometry, equal download cards, iPad portrait and desktop layouts. SDK 52–58 links, clipboard copying, theme persistence, FAQ expansion, bundled downloads when catalog refresh fails, and all 14 no-JavaScript download links were checked. The measured spacing review found no critical or serious issues after excluding intentionally cropped, inert background decoration.

The canonical repository is `Vaibhavsh0120/Expo-Go-Builds`. Catalog validation also accepts its former repository path so previously published download URLs remain usable after the rename.

## Search discovery

The homepage and `/sdk/52/` through `/sdk/58/` have unique titles, descriptions, canonical URLs, and structured data based on published downloads. `/sitemap.xml` lists these pages and `robots.txt` points crawlers to it. SDK release summaries are generated from the maintained repository notes by `prebuild`.

Keep the Google Search Console ownership meta tag in `src/components/SiteHead.astro`. After deployment, submit `https://expo-go-builds.vercel.app/sitemap.xml` in the verified URL-prefix property. Sitemap submission and URL inspection requests help discovery; they do not guarantee indexing or ranking.

`npm run check:seo` validates the built HTML, metadata, sitemap, and published download links. Once the public ownership file is deployed, `npm run notify:indexnow` submits the canonical sitemap URLs to IndexNow. Its ownership key is public verification data, not a credential; an accepted notification confirms receipt only.

`vercel.json` supplies content-type, framing, referrer, permissions, and content security headers. The policy allows local assets and the public GitHub catalog origin. Inline scripts and styles remain allowed for Astro's static hydration and theme setup; no third-party script origin or `unsafe-eval` is permitted. Check site updates in a browser for policy violations.

Installation instructions use separate native Android and iPhone/iPad disclosures, closed by default and usable without JavaScript. Installation is a separate full-width section below the balanced source and download columns, with a smaller responsive gap before the FAQ. The guide link highlights its heading for 700 ms after scrolling finishes. iOS tools use three columns on wide screens, two on tablets and one on phones. Native controls and scrollbars follow the selected theme.
