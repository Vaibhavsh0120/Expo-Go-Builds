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
README and [AI_CONTEXT.md](AI_CONTEXT.md)); build times are bounded by
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
[AI_CONTEXT.md](AI_CONTEXT.md#how-another-ai-agent-should-approach-future-modifications).
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
