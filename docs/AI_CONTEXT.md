# AI_CONTEXT.md — read this first if you're an AI agent modifying this repo

## What this repository does

This repository is a single GitHub Actions workflow
(`.github/workflows/build-expo-go.yml`) that builds the real, open-source
**Expo Go** iOS app from `expo/expo` source, on a GitHub-hosted macOS
runner, as an **unsigned physical-device (arm64) `.ipa`**. It does not
vendor any Expo source itself — it checks out `expo/expo` fresh into a
subdirectory (`expo-src`) at build time.

The output is meant to be signed afterward by the user, locally, with a
tool like Sideloadly, using their own free Apple ID — see
[IPA_SIGNING.md](IPA_SIGNING.md).

## Why it exists

Expo Go's own App Store build sometimes lags behind the newest SDK release,
or isn't available in some regions. This repo lets someone build a current
Expo Go from source, for free, on infrastructure they already have access
to (a GitHub account), without needing a Mac or a paid Apple Developer
Program membership.

## Supported SDK versions

- **SDK 57** — the original target of this repo. Has a confirmed working
  build: successfully compiled in GitHub Actions, uploaded as a GitHub
  Release ("SDK 57 for iOS"), and installed/run successfully via SideStore
  and LiveContainer. See [SDK_57.md](SDK_57.md#known-working-state).
- **SDK 56** — added alongside SDK 57 by verifying the actual `sdk-56`
  branch of `expo/expo` (not by assuming it's SDK 57 with a string
  swapped). See [SDK_56.md](SDK_56.md) for the full verified diff and
  [SDK_56.md#verification-status](SDK_56.md#verification-status) for what
  is and isn't yet confirmed end-to-end.

## How the build pipeline works

One job, one macOS runner, roughly this shape (see
[BUILD_ARCHITECTURE.md](BUILD_ARCHITECTURE.md) for the full diagram):

```
resolve SDK config (branch, naming)
  → select Xcode
  → fix SSH→HTTPS for git submodules
  → checkout expo/expo @ <branch> (recursive submodules, LFS)
  → install native build tools (cmake, ninja)
  → Node.js + pnpm install (monorepo root, unfiltered)
  → install react-native-lab (Expo's RN fork) deps
  → build the `expo` package (tsc)
  → Ruby + CocoaPods install (bundle exec pod install)
  → generate dynamic macros / plists
  → xcodebuild (Release, -sdk iphoneos, CODE_SIGNING_ALLOWED=NO)
  → find + verify the .app bundle (arch, plist, codesign state)
  → package Payload/Expo Go.app → .ipa
  → upload as a GitHub Actions artifact
  → (optional, opt-in) publish as a GitHub Release
```

## Important files

- **`.github/workflows/build-expo-go.yml`** — the entire pipeline. Single
  workflow, `workflow_dispatch`-triggered, with an `expo_sdk` choice input
  (`"57"` default, or `"56"`). A `Resolve SDK-specific configuration` step
  near the top is the *only* place SDK-specific values (branch, output
  names) are decided — everything downstream reads from
  `steps.config.outputs.*`.
- **`docs/SDK_56.md`** / **`docs/SDK_57.md`** — the verified, per-SDK
  configuration reference. If you're checking "does X differ between SDK
  56 and 57," these two files (and the diff notes in SDK_56.md) are the
  source of truth, not assumption.
- **`docs/DECISIONS.md`** — why the workflow is structured the way it is.
  Read this before restructuring anything.
- **`README.md`** — user-facing quick start.

## Important constraints

- **No Apple credentials, ever.** No Apple ID password, 2FA code,
  certificate, or private key should ever be requested by, stored in, or
  passed to this workflow or any GitHub Secret in this repo. Signing is
  explicitly out of scope for CI — see [IPA_SIGNING.md](IPA_SIGNING.md).
- **No Expo-internal secrets are required or used.** The build works from
  the public, checked-in fallback config
  (`template-files/keys.json`-equivalent path) — see
  `secrets/README.md` in `expo/expo` itself if you're ever tempted to add
  one.
- **The repo should stay public.** GitHub's macOS runners are free and
  unmetered only on public repos; on private repos macOS minutes burn at
  10× the normal rate.
- **The existing SDK 57 GitHub Release ("SDK 57 for iOS") must never be
  deleted, replaced, or silently overwritten** by workflow changes. It's a
  manually-uploaded, static reference artifact — see
  [SDK_57.md](SDK_57.md#how-the-release-relates-to-the-github-actions-build).
- **Release creation from the workflow is opt-in** (`create_release` input,
  default `false`) and creates a *new*, uniquely-tagged release each time
  — it never touches an existing tag/release.

## What NOT to change casually

- **The toolchain versions** (Node 22.14.0, pnpm 10, Ruby 3.2.2, CocoaPods
  1.16.2, Xcode 26.4.1, macos-26) — these are pinned because they're
  verified to match what `expo/expo`'s own CI uses. If you're bumping one,
  re-verify against the live `ios-unit-tests.yml` and `Gemfile.lock` on the
  relevant branch first — don't guess.
- **The `xcodebuild` flag set** in the "Build Expo Go" step — every flag
  has a documented reason (see the inline comment block above that step).
  Removing `CODE_SIGNING_ALLOWED=NO` or similar will break the "no Apple
  Developer account needed" property this whole repo exists for.
- **The SSH→HTTPS git config step** — without it, the `react-native-lab`
  submodule checkout fails with `Permission denied (publickey)` on a
  keyless runner. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
- **The `Resolve SDK-specific configuration` step's case statement** — this
  is the single source of truth for per-SDK values. Don't duplicate SDK
  branching logic elsewhere in the workflow.

## How another AI agent should approach future modifications

1. **Read [DECISIONS.md](DECISIONS.md) first** to understand why things are
   structured the way they are.
2. **Never assume a new SDK (58+) matches 56/57's toolchain.** Sparse-clone
   the relevant branch and diff it against the nearest known-verified SDK,
   the same way [SDK_56.md](SDK_56.md) was produced — see the method
   described there (`git clone --filter=blob:none --no-checkout
   --depth 1 --branch <branch>` + `sparse-checkout`).
3. **Keep SDK-specific values in the `Resolve SDK-specific configuration`
   step's case statement** — add a new `case` arm, don't scatter
   conditionals through the rest of the workflow.
4. **Preserve the validation step's 11 checks** (see
   [SDK_57.md](SDK_57.md#validation-steps)) for any new SDK — they're
   SDK-agnostic and are what makes the job fail loudly instead of silently
   uploading a broken IPA.
5. **Don't touch the existing GitHub Release.** If you add automatic
   release publishing behavior, keep it opt-in and additive (unique tag
   per run), never overwriting.
6. **Update the relevant `docs/SDK_*.md` "Verification status" table**
   whenever you actually run and confirm (or fail to confirm) a build —
   keep the "verified from source" vs. "verified in CI" vs. "unverified"
   distinction honest and current.
