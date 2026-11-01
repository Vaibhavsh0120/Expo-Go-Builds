# AI context for this repository

Read [DECISIONS.md](DECISIONS.md) for historical decisions and
[SDK_SUPPORT.md](SDK_SUPPORT.md) for current settings and evidence.

## Purpose and current interface

Build the real `expo/expo` Expo Go iOS app as an **unsigned physical-device
arm64 IPA** on GitHub-hosted macOS, then let the user sign it locally with
Sideloadly or a similar tool. This repository does not vendor Expo source.

There must be **one workflow file**:
`.github/workflows/build-expo-go.yml`. Its dispatch form exposes only:

- `expo_sdk`: 58, 57, 56, 55, or 54; default 57.
- `create_release`: an optional boolean, default false.

The owner requested automatic settings and work directly on `main` for
this update. Do not restore source-ref/Xcode inputs or SDK-specific
workflow files. The old `build-expo-go-sdk57.yml` is available in Git
history only.

## Configuration and execution

The `resolve-config` Linux job has one SDK case statement for the branch,
runner, Xcode, Node, package manager, Ruby, iOS target, macro mode, and SDK
metadata path. Its outputs select the macOS build job's runner and tools.
Keep SDK-specific values there; downstream steps consume job outputs.

SDK 54/55 use Yarn Classic; SDK 56/57 use pnpm 10; SDK 58 uses pnpm 12.2.1
and Node 24. Every SDK uses Yarn Classic for its React Native submodule.
SDK 54 needs the legacy expotools plist wrapper with Xcode environment
variables, while 55–58 use the shell generator with CLI flags. SDK 54's
metadata has a different path and schema; see [SDK_SUPPORT.md](SDK_SUPPORT.md).

Build sequence: select Xcode → rewrite SSH URLs to HTTPS → checkout this
builder and the selected Expo branch → verify embedded SDK and record SHA
→ native tools → Node/dependency tools → full monorepo install → React
Native submodule install → build `packages/expo` → locked Ruby gems →
generate plists → pod install → workspace check → unsigned xcodebuild →
app diagnostics → package and check ZIP → artifact → optional release.

## Constraints

- Never request, store, or use Apple credentials in CI. No Expo-internal
  secrets are needed: generation uses the checked-in public templates.
- Preserve unsigned physical-device flags, including `-sdk iphoneos`,
  `-destination generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO`, and the
  other signing overrides. Signing is a separate local step.
- Preserve existing releases, including the original SDK 57 reference.
  Release creation is opt-in and additive, with a fresh timestamp tag.
  Never overwrite or delete an existing release or tag.
- Keep all app/IPA diagnostics and validation: existence, ZIP structure,
  arm64/device metadata, bundle ID/version, SDK, minimum iOS, signing state,
  and size. Do not equate printed diagnostics with proven device use.
- Keep the pre-checkout SSH-to-HTTPS rewrite for the public React Native
  submodule and Git LFS support for Expo assets.
- Keep the conditional `patches/sdk56/SceneGeometry.swift` workaround
  unless source inspection proves upstream has fixed it. Never apply it
  to another SDK or overwrite an upstream utility.
- Verify any new toolchain against the selected branch's own source/CI
  and GitHub's runner inventory. SDK 58 does not match SDK 57's Node/pnpm
  requirements. SDK 54/55 do not use pnpm at all.
- Keep compilation on public-repository GitHub-hosted runners so users do
  not need a paid build provider. SDK 58 upstream's Blacksmith runner is
  not a requirement for this repository.

## Release notes

Maintain one note per SDK in `releases/sdk-<N>.md`, with upstream SDK date,
feature context, minimum iOS, and signing/compatibility information.
`scripts/render_release_notes.py` adds the actual build provenance and
artifact digest for the workflow's `--notes-file` release publishing.
Keep the original SDK release date distinct from IPA build/publication
dates. Do not claim an old SDK 57 IPA includes later Hermes fixes without
checking its exact source commit. Published release titles and notes may
be edited in place when authorized; preserve asset IDs, digests, and tags.

## Verification and evidence

Run `python -m unittest discover -s tests -v` (dependencies in
`tests/requirements.txt`) and `actionlint` on the workflow before pushing.
There is no extra test workflow. Local tests exercise SDK dispatch,
automatic settings, invalid input handling, and the two-input interface.

SDK 56/57 have historical successful builds; SDK 55/58 also completed
and published IPAs on November 1. The owner previously reported device
use for SDK 57. SDK 54 failed with Xcode 16.4's missing DeclaredAgeRange
framework; its Xcode 26.2 retry needs completion evidence. A new workflow
change or branch tip is not proven by an old green run.

## LiveContainer source

`apps.json` on `main` is the permanent hosted catalog. The README links it
near the top. `scripts/livecontainer_source.py` downloads the newest
published IPA per SDK, checks size/hash against GitHub, and reads actual
plist versions, bundle ID, and minimum iOS. Keep SDK entries separate and
sorted descending. All retain `host.exp.Exponent`; do not invent a unique
bundle ID per SDK or claim strict AltStore-store compatibility.

The one existing workflow refreshes the source through the Contents API
after publishing. That creates a commit on `main` and retries conflicts
from a fresh release snapshot. Do not add another workflow or branch.
Check the actual hosted JSON, its URLs, and IPA receipts; physical
LiveContainer import/launch remains separate evidence.
