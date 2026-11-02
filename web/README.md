# Expo Go Builds website

Static Astro page with server-rendered React controls, the generated Better Design silver component system, and optimized silver and glass hero artwork. Primary downloads work from the rendered HTML before JavaScript loads. SDK selection, theme switching and source copying hydrate on load.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

Vercel: set the project root directory to `web`, framework to Astro, build command to `npm run build`, and output directory to `dist`. No server adapter is required. `SITE_URL` optionally overrides the canonical site origin; the default is `https://expo-go-builds.vercel.app`.

`prebuild` refreshes bundled data from the repository’s `apps.json` and `android.json` when available. Otherwise it uses the checked-in snapshot. The page refreshes from the public iOS and Android catalogs at runtime, validates repository-owned IPA/APK links, and keeps the bundled release list when the network fails. An SDK without an actual release entry is disabled. The source contains separate SDK entries; the download button uses the selected SDK and platform. Both themes share the same typography and geometry.

Theme follows the system until a person chooses light or dark. The toggle cycles system → light → dark → system and persists locally. The transparent hero-dark and hero-light artwork uses contain sizing with space around every edge, without a canvas, artificial floor or cropped image background. Useful content and download links never depend on animation.

The actual generated Button and its MetalRing module are retained. Unused registry components and dependencies were removed to keep the project small. The primary download explicitly disables the optional decorative ring.

## Design source

Approved Better Design project: `09bcce15-d350-4958-9624-8c04a2d7b442`. The actual generated React components are under `src/components/ui` and the generated tokens (with noncyclic self-hosted font mappings) are in `src/styles/globals.css`. `site.css` adds the requested matching light theme and page composition. Icons use local Solar outline SVGs and the recognizable GitHub brand mark, with the original theme and copy icons retained.

## Verification

`npm test` checks catalog parsing, untrusted/malformed asset rejection, distinct SDK asset mapping, and LiveContainer source encoding. `npm run check` checks Astro and TypeScript. `npm run build` verifies static generation. Physical iPhone signing/import depends on the person’s installation tool and is separate from browser verification.

Responsive browser verification covers 320–1920px widths, matching light/dark geometry, equal download cards, iPad portrait and desktop layouts. SDK 52–58 links, clipboard copying, theme persistence, FAQ expansion, bundled downloads when catalog refresh fails, and all 14 no-JavaScript download links were checked. The measured spacing review found no critical or serious issues after excluding intentionally cropped, inert background decoration.
