# DECISIONS.md

Each entry: Date, Decision, Reason, Alternatives considered, Impact.

---

## 2026-08-15 — Build Expo Go from source on GitHub Actions macOS runners

**Decision**: Use GitHub-hosted `macos-26` runners to compile Expo Go from
`expo/expo` source, rather than requiring a local Mac.

**Reason**: iOS compilation requires Xcode, which is macOS-only. Most
people who'd want this don't own a Mac. GitHub's hosted macOS runners are
free and unmetered on public repositories, giving a genuinely free path to
a real, correctly-linked iOS binary.

**Alternatives considered**: Requiring a local Mac (excludes most users);
a paid CI service (unnecessary cost when GitHub Actions is free for this
use case on a public repo); cross-compilation (not possible for iOS/Xcode
targets).

**Impact**: The repo must stay public to keep this free (documented in
README and [CONTRIBUTING.md](CONTRIBUTING.md)); build times are bounded by
GitHub's macOS runner performance (~60–150 min for this build).

---

## 2026-08-15 — Build unsigned, sign separately with Sideloadly

**Decision**: The GitHub Actions workflow never signs the IPA.
`CODE_SIGNING_ALLOWED=NO` and related flags are passed explicitly to
`xcodebuild`. Signing is documented as a separate, local, Windows-side step
using Sideloadly.

**Reason**: Signing requires an Apple ID. Doing it in CI would mean storing
Apple credentials (or a derived certificate/key) in GitHub Secrets, where
an automated system holds and uses them unattended — a real security and
trust liability this project should never take on. Keeping compilation
(needs macOS, not your identity) and signing (needs your identity, not
macOS) as separate stages, on separate machines, avoids that entirely.

**Alternatives considered**: Fully automated signing via `fastlane match`
or similar with Apple credentials in Secrets (rejected outright — exactly
the credential-custody problem this decision avoids); requiring a paid
Apple Developer Program account with an API key instead of a personal
Apple ID (rejected — defeats the "no paid account needed" goal, and API
keys are still a credential this repo shouldn't hold).

**Impact**: Every build output is explicitly labeled as an unsigned,
physical-device IPA requiring a separate signing step — never implied to
be directly installable. See [IPA_SIGNING.md](IPA_SIGNING.md).

---

## 2026-08-16 — SDK 56 and SDK 57 coexist in one parameterized workflow

**Decision**: Add SDK 56 support to the existing SDK 57 workflow by
parameterizing it (`expo_sdk` choice input), rather than duplicating it
into two separate workflow files.

**Reason**: Direct verification against the live `expo/expo` `sdk-56` and
`sdk-57` branches (blobless sparse-checkout + diff of `apps/expo-go/**`,
`.github/workflows/ios-unit-tests.yml`, root `package.json`, `Gemfile.lock`,
`Brewfile`, `.gitmodules`, `pnpm-lock.yaml`) found the two branches use an
**identical toolchain**: same Node (22.14.0), same pnpm (10), same Ruby
(3.2.2), same CocoaPods (1.16.2, byte-identical `Gemfile.lock`), same
Xcode (26.4.1) and `macos-26` runner (byte-identical
`ios-unit-tests.yml`), same minimum iOS (16.4), same `Brewfile`, same
`.gitmodules`, same `apps/expo-go/README.md` build recipe. The only
differences are the branch name itself, the embedded
`apps/expo-go/sdkVersions.json` value, and downstream dependency versions
that `pnpm install --frozen-lockfile` resolves automatically per-branch.
Given that, forking into two workflow files would mean maintaining two
near-identical 400+ line files that would drift out of sync over time —
strictly worse than one file with a small, explicit config-resolution
step. See [SDK_56.md](SDK_56.md) for the full verified diff.

**Alternatives considered**: Two fully separate workflow files (rejected —
duplication risk, no technical requirement given the identical toolchain
found by direct verification); a reusable/called workflow
(`workflow_call`) with a matrix (considered reasonable, but a single
`workflow_dispatch` file with a config-resolution step was simpler for a
single-job pipeline and keeps the "what will this run do" summary in one
place at the top of the log, per the original spec's preference for a
single reusable workflow).

**Impact**: Adding a third or later SDK means adding one `case` arm to the
"Resolve SDK-specific configuration" step — provided that SDK is first
verified (not assumed) to share the toolchain, per
[CONTRIBUTING.md](CONTRIBUTING.md#how-another-ai-agent-should-approach-future-modifications).
If a future SDK's toolchain genuinely differs, the config-resolution step
is exactly where that per-SDK branching belongs.

---

## 2026-08-16 — SDK 57 remains the default

**Decision**: The `expo_sdk` workflow input defaults to `"57"`.

**Reason**: SDK 57 is the version this repository was originally built and
proven against — it has a confirmed working end-to-end result (built,
uploaded as a GitHub Release, installed and run successfully via SideStore
and LiveContainer; see
[SDK_57.md](SDK_57.md#known-working-state)). SDK 56 was added afterward and,
as of this writing, has not yet been exercised through an actual GitHub
Actions run (toolchain verified from source, but not yet build-tested in
CI — see [SDK_56.md](SDK_56.md#verification-status)). Defaulting to the
already-proven option is the safer default for anyone who runs the
workflow without changing the SDK input.

**Alternatives considered**: No default / require explicit selection
(rejected — `workflow_dispatch` `choice` inputs require a default value in
practice, and an explicit default is more informative than an arbitrary
first-listed option); default to SDK 56 as "newest" (rejected — SDK 57 is
actually the more recently released SDK per expo.dev's changelog dates,
and more importantly is the one with confirmed working results here).

**Impact**: Running the workflow with no input changes reproduces the
already-known-working SDK 57 path.

---

## 2026-08-16 — SSH submodule checkout fixed via global git URL rewrite

**Decision**: Add a step (`git config --global url."https://github.com/".insteadOf
"git@github.com:"`) before checkout, applying to both SDK 56 and SDK 57.

**Reason**: `expo/expo`'s `.gitmodules` declares the `react-native-lab/react-native`
submodule via an SSH URL (`git@github.com:expo/react-native.git`) on both
branches (verified byte-identical). The original assumption — that
`actions/checkout`'s built-in SSH→HTTPS rewrite would handle this
automatically — turned out to be wrong in practice for the recursive
submodule clone specifically: a real CI run failed with `Permission
denied (publickey)` on that submodule, even though the top-level
`expo/expo` checkout succeeded over HTTPS. A global git URL rewrite,
applied before checkout, fixes it regardless of what `actions/checkout`
does internally, because it rewrites every subsequent git invocation
(including the recursive submodule clone) unconditionally.

**Alternatives considered**: Adding an SSH deploy key as a GitHub Secret
(rejected — unnecessary for a public repo, and adds a credential this repo
doesn't need); passing `ssh-key: ''` explicitly to `actions/checkout`
(this is effectively the default and was already the case — didn't fix the
observed failure); vendoring/mirroring the `react-native-lab` submodule
content directly into this repo (rejected — defeats the "always build
current upstream" design and adds a large binary-heavy tree to maintain).

**Impact**: This fix is SDK-agnostic (since `.gitmodules` is identical
across branches) and is applied once, ahead of the checkout step, covering
both SDK 56 and SDK 57 builds.

---

## 2026-08-16 — Release publishing is opt-in, and never touches the existing SDK 57 release

**Decision**: The workflow does not automatically create a GitHub Release
on every run. A `create_release` boolean input (default `false`) opts in;
when enabled, it creates a **new**, uniquely-tagged release
(`expo-go-sdk<56|57>-<timestamp>`) each time, and never overwrites an
existing tag.

**Reason**: The project owner had already manually uploaded a "SDK 57 for
iOS" release as a deliberate, curated reference artifact. Automatically
creating releases on every workflow run would either spam Releases with
one entry per run, or risk colliding with/overwriting that existing
reference release if a naming scheme wasn't chosen carefully. Defaulting
to Actions-artifact-only output (30-day retention, scoped to the run) is
the lower-risk default; anyone who wants a persistent Release can opt in
explicitly per-run.

**Alternatives considered**: Always create a release per run (rejected —
spam risk, and higher chance of an accidental naming collision with the
existing manual release); overwrite/update a single "latest" release per
SDK (rejected — this is exactly the kind of silent-overwrite behavior the
original spec explicitly prohibited for the existing SDK 57 release, and
extending that caution to all releases this workflow creates is more
consistent than special-casing just the one).

**Impact**: The existing "SDK 57 for iOS" release is untouched by any
workflow run, opted-in or not — its tag is never referenced or generated
by the `create_release` step's timestamp-based tagging scheme.

---

## 2026-08-16 — SDK 56's `SceneGeometry` compile failure fixed with a self-deprecating source patch, not a pinned commit

**Decision**: When a real GitHub Actions run confirmed `sdk-56` fails to
compile (`cannot find 'SceneGeometry' in scope` in
`expo-screen-capture/ios/ScreenCaptureModule.swift`), the fix implemented
was a small, embedded source patch (`patches/sdk56/SceneGeometry.swift`,
copied into the checkout by a new "Apply known SDK 56 source patches"
step) that only applies if the target file doesn't already exist —
rather than pinning `expo_ref` to a fixed commit SHA.

**Reason**: The failure was traced to one specific, isolated cause: commit
`735ce71` on `sdk-56` backported a change to `expo-screen-capture` that
calls `SceneGeometry.keyWindow()`, without also backporting the
`SceneGeometry.swift` utility file itself from `expo-modules-core` (which
exists on `main` but not on `sdk-56`). Pinning `expo_ref` to a commit
before this backport would "fix" the build but freeze SDK 56 builds at
that point in time forever, silently missing any later real fixes/patches
Expo lands on `sdk-56` (including, ironically, if Expo fixes this exact
issue). A source patch that supplies just the missing file lets the
workflow keep tracking the live `sdk-56` branch tip (the documented
default behavior — see the `expo_ref` input's own description) while
working around only this one specific, well-understood gap.

**Alternatives considered**: Pin `expo_ref` to the last-known-good commit
(`c87637c7ae07b8e38786015c481250aa5f03da4b`) as the primary fix (rejected
as the *default* — this is documented instead as an explicit fallback in
[TROUBLESHOOTING.md](TROUBLESHOOTING.md), since it's simpler/lower-risk
but freezes the branch); fetching `SceneGeometry.swift` live from
`expo/expo`'s `main` branch at build time via `curl`/`git show` instead of
committing a copy into this repo (rejected — makes the build depend on
`main`'s content at whatever moment it happens to run, which could change
or even be removed without warning; a committed copy is deterministic and
auditable); patching `ScreenCaptureModule.swift` itself to revert to the
older pre-`SceneGeometry` keyWindow lookup instead of supplying the
missing dependency (rejected — more invasive, and diverges further from
what `sdk-56`'s own source actually contains, versus supplying exactly the
one missing piece).

**Impact**: `patches/sdk56/` exists as a precedent for handling future
similar per-SDK upstream gaps — see
[CONTRIBUTING.md](CONTRIBUTING.md#what-not-to-change-casually) for guidance on
extending this pattern. The patch step's existence-check makes it
self-deprecating: once Expo fixes the incomplete backport upstream (adding
`SceneGeometry.swift` to `sdk-56` themselves), this step will detect the
file already exists and skip applying the patch, requiring no workflow
change to stay correct — though the stale patch file and step should
still be removed once that's confirmed, to avoid carrying dead weight.
This was NOT verified by an actual macOS/Xcode compile in the environment
that produced the patch (source-only verification — see
[SDK_56.md](SDK_56.md#known-upstream-issue-scenegeometry-confirmed-patched)
for exactly what was and wasn't confirmed); the next actual GitHub Actions
run is the real test.

---

## 2026-11-01 — One automatic workflow for SDK 54–58

**Decision**: Keep only `build-expo-go.yml`. Expose the SDK selector and
optional release checkbox; remove `expo_ref`, `xcode_version`, and the
obsolete SDK-57-only workflow. Work for this update is committed to `main`
at the owner's request.

**Reason**: The owner wants to choose a supported SDK and optionally
publish an IPA without managing native build settings. SDK 54/55 use Yarn
and older toolchains; SDK 58 uses Node 24 and pnpm 12.2.1. Direct source
inspection showed these cannot all reuse SDK 57's configuration.

**Impact**: A small Linux configuration job resolves one SDK case before
the macOS job starts, including its runner. SDK 54's older plist wrapper
receives Xcode environment variables. Defaults for SDK 56/57 and the
conditional SDK 56 patch remain. Existing releases are preserved, and
new releases are still opt-in. Exact upstream commits and actual Xcode
versions are recorded. The preferred Xcode falls back automatically to
the image default if retired; future compatibility needs build evidence.

**Evidence**: [SDK_SUPPORT.md](SDK_SUPPORT.md) records inspected commits
and distinguishes local/source checks from historical native builds and
device testing. The earlier SDK 56 pending-build status was corrected
against the successful August run and published IPA.

## 2026-11-01 — Per-SDK notes and Releases-first downloads

**Decision**: Keep the README focused on downloading an IPA from GitHub
Releases, followed by local signing. Show ticks for SDK builder support,
and keep detailed verification evidence in the support document.

**Release notes**: Maintain `releases/sdk-54.md` through `sdk-58.md`, with
verified upstream dates and SDK-specific context. The existing workflow
appends actual build provenance and SHA-256 via a notes file. Published
SDK tags are compared numerically before assigning Latest to a new build.

**Existing releases**: SDK 57 and 56 were already in the correct SDK order.
Their titles and notes were updated in place, using recovered build logs;
their tags, asset IDs, sizes, hashes, URLs, and publication dates were
preserved. No release deletion or recreation was needed. The SDK 57 note
explicitly identifies that its August 16 artifact predates the August 27
Hermes fix. Notes for other SDKs do not claim a published IPA exists.

## 2026-11-01 — A hosted LiveContainer source with one choice per SDK

**Decision**: Host `apps.json` directly from `main` at a stable raw GitHub
URL and list the latest published IPA for each SDK as a separate entry.
LiveContainer's source browser installs the first version of an app entry;
one entry with five historical versions would hide the SDK choice.

**Integrity**: Download each selected release IPA, match size and SHA-256
against GitHub metadata, then read the actual Info.plist. Preserve the
real shared bundle identifier. Never list failed builds or placeholder
URLs, or label physical import/launch as verified from catalog checks.

**Automation**: The existing IPA workflow refreshes the source after
release publishing through the Contents API on main, with conflict
retries and a fresh release snapshot. This keeps one workflow and the
two existing inputs. Source generation does not change release assets.

**SDK 54 correction**: Its first build failed because the current branch
imports DeclaredAgeRange, unavailable in Xcode 16.4. Xcode 26.2 provides
that framework; the runtime guard retains support for older iOS devices.
The configuration was corrected and a fresh SDK 54 release run dispatched.
That run compiled and uploaded the IPA successfully; its later release
step failed with HTTP 403. The exact artifact was recovered and published.

## 2026-11-01 — Preserve releases while sorting by SDK

**Result**: Published SDKs now sort 58, 57, 56, 55, 54. SDK 54's recovered
build uses an earlier builder commit and sorts below these curated entries.
GitHub's Latest badge remains on the highest SDK.

**Method**: GitHub derives a release's ordering date from its tag. Converted
the four existing timestamped build tags from lightweight to annotated
tags, with ascending current tagger timestamps for SDK 55 through 58. Each
annotated tag peels to the exact original source commit. Original build
and publication provenance remains in the release notes. These curation
timestamps are not Expo's upstream SDK release dates.

**Preserved**: Release IDs, asset IDs, IPA bytes, SHA-256 digests, download
URLs, notes, and download counts. No existing release or IPA was deleted
or recreated. Changing draft publication alone did not reorder these
entries. Public release metadata and verified IPA backups were saved
locally before changing tag annotations.

## 2026-11-01 — Responsive download website in web/

**Decision**: Use a static Astro page with one hydrated React interface,
the real published SDK catalog, and the selected silver/glass artwork.
Self-host fonts and optimize transparent artwork to WebP. Restrained
perspective provides the requested 3D appearance without WebGL overhead;
reduced motion keeps the image still. The actual generated design-system
Button and its transitive MetalRing module are retained; unused registry
components and the experimental mesh implementation were removed.

**Hosting**: Vercel Hobby, project expo-go-ios-builder, root web/, free
subdomain https://expo-go-builds.vercel.app. Production source is main.
Canonical links, sitemap, robots, social image, and structured data describe
community downloads with attribution to official Expo. Search indexing and
physical device installation are separate from browser verification.

## 2026-11-01 — Android downloads and SDK 52/53

**Decision**: Expand the one workflow to prepare both platforms for SDKs
52–58. iOS IPAs are compiled from the matching Expo branch. Android APKs
are the original official Expo binaries, mirrored without rebuilding or
re-signing. This preserves Expo's signature and directly installable APKs;
it does not claim both platform artifacts came from this builder's source
checkout or have identical app version numbers.

**Verification**: Resolve stable client versions through Expo's public
versions metadata. Verify the official APK's asset size, SHA-256,
cryptographic signature, package, version, and minimum Android API before
publishing it. Attach a machine-readable Android receipt and human-readable
provenance to the same SDK release. Never publish placeholder links.

**Older SDKs**: SDK 52/53 have legacy plist generators, Yarn lockfiles, and
historical Expo Go app versions `2.32.x`/`2.33.x`. Their iOS configuration
is inspected separately and requires native build evidence before being
called successfully built. The SDK support document records that evidence.

**Automation**: A scheduled check in the existing workflow detects changed
stable Expo client versions and requests builds using that same workflow.
Unsupported future SDKs need reviewed source/toolchain configuration;
automatic discovery does not justify guessing their build settings.

## 2026-11-01 — Release authorization after main advances

**Failure**: SDK 54 run `41270904815` successfully produced the unsigned
arm64 IPA, then GitHub rejected release creation with HTTP 403. The job
already had `Contents: write`. Its old builder commit modified workflow
files relative to current `main`, triggering GitHub's additional workflow
authorization requirement for release targets.

**Correction**: Create the release tag against current `main`, retaining
the actual Expo commit and builder commit in release provenance. No source
history is rewritten and no more powerful user token is required. The
completed SDK 54 artifact was recovered without recompilation; its exact
size and SHA-256 were verified before publishing. GitHub documents the
permission rule in its [release API reference](https://docs.github.com/en/rest/releases/releases#create-a-release).

## 2026-11-02 — Reference layout and static hero artwork

**Decision**: Remove the experimental procedural Three.js sculpture and its
dependencies. Use the existing transparent `hero-dark.webp` and
`hero-light.webp` artwork with contain sizing and reserved space above the
mobile heading. No artificial floor lighting or baked rectangular stage.
The approved download layout uses smaller matching controls in both themes,
local GitHub and Solar icons, and separate IPA/APK downloads for each SDK.
This preserves the chosen artwork without requiring WebGL or a render loop.

**Older builds**: SDK 52 and 53 completed native compilation and published
paired IPA/APK releases after isolating CMake 3.31.10 for older Hermes.
Their successful runs are linked in SDK_SUPPORT.md. Physical-device launch
testing remains separate from CI and browser verification.

**Release order verification**: On November 2, the public GitHub release page
and release API both listed SDKs 58, 57, 56, 55, 54, 53, 52. Every entry
contained its IPA, original signed APK, and Android verification receipt.
No further release deletion or tag changes were necessary. The scheduled
release watcher also completed successfully after the SDK 52/53 fixes.
