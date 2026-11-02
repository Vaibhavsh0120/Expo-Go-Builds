# Public release review — November 2, 2026

The website, published SDK 52–58 downloads, release automation, and search setup
were reviewed from source and against the public services. SEO was published in
`42e5ddb`; security headers and release recovery were published in `82392b6`.

## Visual follow-up

The owner's subsequent direction is to keep `/` and `/sdk/N/` visually identical,
with only SDK N preselected. Both now render `DownloadPage.astro` and the same
`Site` component; the separate SDK page composition and styles have been removed.
Route-specific search metadata stays in the document head. Browser comparisons
of `/` with SDK 57 selected against `/sdk/57/` found identical visible text and
section geometry at 390, 768, 1440, and 1728px in both themes. All seven SDK
routes retain their selection and matching IPA/APK URLs after hydration, live
catalog refresh, and reload. Built-page checks now require the shared dropdown,
heading, artwork, and correct primary downloads on every SDK route.

The owner caught an omission in the earlier review: the SDK pages had no Expo
hero artwork, although the homepage did. The earlier checks did not establish
visual parity, and their completion wording was too broad.

The homepage and all seven SDK pages now use the same theme-aware artwork
component. SDK pages show it to the right on desktop and above the downloads
on smaller screens. The built-page check now requires both artwork variants on
every route; it was observed failing before the repair and passing afterward.

Chrome checks covered all eight routes in both themes at 320, 390, 768, 1024,
1440, and 1728px: 96 states. Every state had one visible, loaded theme-correct
image, two download links, no horizontal overflow, and no artwork/control
overlap. Desktop and mobile screenshots were captured for every route in both
themes. All 23 disclosures and every installation-guide link were exercised;
current-SDK navigation was checked on all seven SDK pages. An independent
static review validated local destinations across 221 links and all 16 image
references. Better Design's monthly service quota was exhausted during this
follow-up; no additional service approval is claimed. Browser geometry and
screenshots supplied the rendered evidence.

## Public availability

- Production: <https://expo-go-builds.vercel.app/>. Vercel reports READY, with
  password, SSO, and trusted-IP protection disabled for the public site.
- The homepage and all seven SDK pages return HTTP 200 without authentication.
- All 14 IPA/APK asset URLs return HTTP 200 to unauthenticated HEAD requests.
  Response lengths match the feeds. Every feed URL, size, and SHA-256 matches
  the current published GitHub release metadata. This check did not redownload
  and hash every complete binary.
- Both public raw GitHub catalogs return seven SDK entries.
- The SDK selector maps all seven SDKs to their matching IPA and APK. Theme
  switching persists after reload; keyboard opening and Escape dismissal work.
  The copy action reports success, the installation link focuses its heading,
  and installation/FAQ disclosures expand.
- All 14 direct download links remain present with JavaScript disabled. Blocking
  the raw GitHub catalog requests retains the bundled downloads and displays
  the fallback notice. All browser overrides were restored afterward.
- No horizontal overflow was measured at 320, 390, 768, 1024, 1440, or 1728px on
  the homepage. SDK 58 was also reviewed at 390, 1440, and 1728px. The spacing
  tool flags the intentional auto-margin between the brand and navigation,
  and infers a false section gap from nested sections; these are not evidence
  of broken layout. Text-only and measured checks do not replace screenshots.

## Search discovery

- Unique titles, descriptions, canonical links, and structured data are generated
  for eight pages from the maintained release catalogs and SDK notes.
- Google ownership was verified in the requested account using the HTML tag.
- Search Console reports **Sitemap processed successfully**, with **8 discovered
  pages**. Its initial “Couldn't fetch” status cleared without a code change.
- Google's live homepage test reports **URL is available to Google** and
  **Page can be indexed**.
- The indexed-data view still reports **Discovered – currently not indexed**.
  A separate manual indexing request returned **Quota exceeded**. No successful
  priority-indexing request or search ranking is claimed. The processed sitemap
  remains available for normal discovery; a manual request may be retried after
  Google's quota resets.
- IndexNow accepted all eight canonical URLs with HTTP 202. Receipt is not proof
  that any engine has indexed or ranked the pages.

## Security and automation

- Independent source review found no additional material credential exposure,
  command-injection path, or current download-origin mismatch.
- The npm audit returned **0 known vulnerabilities**, including development
  dependencies, against the installed lockfile at review time.
- Production serves HTTPS/HSTS, `nosniff`, `DENY` framing protection, strict
  cross-origin referrer handling, disabled camera/microphone/geolocation, and
  a Content Security Policy limiting resources to local files and the public
  raw GitHub catalog endpoint. No CSP warnings or browser console errors were
  observed after deployment.
- The static Astro page uses inline scripts/styles, so its policy explicitly
  permits them. This is a documented compatibility allowance, not a claim of
  complete XSS prevention. No `unsafe-eval` or third-party scripts are allowed.
- Fixed publisher queue replacement: SDK publishers now retain pending jobs
  with `queue: max` while remaining serialized.
- Added independent scheduled reconciliation of verified IPA and APK catalogs.
  A transient feed-publication failure can be repaired without another native
  build. It shares the publisher queue and writes only when content changes.
  The new scheduled path is configuration-tested; its first scheduled cloud run
  was not executed as part of this review.

## Verification and limits

- Python: **33 tests passed**, including regression tests first observed failing
  for the missing publisher queue and catalog-recovery path.
- Web: **12 tests passed**; Astro/TypeScript check had no errors or warnings;
  production build and eight-page SEO checks passed.
- The declared PyYAML test dependency was installed in temporary audit tooling;
  the initial missing dependency was an environment issue.
- Existing native build/release evidence remains in [SDK support](SDK_SUPPORT.md).
  No fresh macOS build, physical-device install, IPA signing, or LiveContainer
  import was performed during this review. Device testing remains separate from
  public URL, binary metadata, browser, and automation checks.
- Security review and dependency audits are point-in-time evidence, not a
  guarantee that future code, dependencies, upstream builds, or hosting changes
  will remain free of defects.
