# SDK 56 — verified build configuration

Every value below was checked directly against the live `sdk-56` branch of
`expo/expo` on **2026-08-16**, using a blobless sparse-checkout of
`apps/expo-go/**` and `.github/workflows/**`, plus a full diff against
`sdk-57` (see [SDK_57.md](SDK_57.md) for the SDK 57 side of the same diff).
Nothing here is inferred from SDK 57 by pattern-matching — every row was
independently read from the SDK 56 branch.

## Build status update

The patched SDK 56 build **succeeded** on August 16, 2026:
[Actions run 31936279223](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/31936279223)
published [ExpoGo-SDK56-unsigned.ipa](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk56-20260816-090047).
This corrects the earlier pending-build status below. Device installation
has not been verified here. Current dispatch and automatic settings are in
[SDK_SUPPORT.md](SDK_SUPPORT.md); the following source analysis is the
original August comparison.

## Source reference

| Item | Value | How verified |
|---|---|---|
| Branch | `sdk-56` (real branch, not a tag) | `git ls-remote --heads` / `git clone --branch sdk-56` on expo/expo |
| Released | May 21, 2026 | expo.dev/sdk/56 changelog page |
| React Native | `0.85.3` | root `package.json` → `resolutions."react-native"`, and `apps/expo-go/package.json` |
| React | `19.2.x` (matches SDK 56 beta announcement; not independently re-diffed at stable) | Expo's SDK 56 beta changelog |
| Embedded SDK version string | `56.0.0` | `apps/expo-go/sdkVersions.json` → `{"sdkVersion":"56.0.0"}` |

## Toolchain (verified identical to SDK 57 — see comparison table below)

| Item | Verified value | Source |
|---|---|---|
| Node.js | `22.14.0` | root `package.json` → `"volta": {"node": "22.14.0"}` on `sdk-56` |
| pnpm | `10` | `sdk-56`'s own `.github/workflows/ios-unit-tests.yml` |
| pnpm lockfile version | `9.0` | `sdk-56`'s `pnpm-lock.yaml` header |
| Ruby | `3.2.2` | `sdk-56`'s `.github/workflows/ios-unit-tests.yml` |
| CocoaPods | `1.16.2` | `sdk-56`'s root `Gemfile.lock` |
| Fastlane | `2.232.2` (pinned, unused directly by this pipeline) | `sdk-56`'s root `Gemfile.lock` |
| Bundler | `2.4.22` | `sdk-56`'s root `Gemfile.lock` → `BUNDLED WITH` |
| Runner image | `macos-26` | `sdk-56`'s `.github/workflows/ios-unit-tests.yml` → `runs-on:` |
| Xcode | `26.4.1` | `sdk-56`'s `.github/workflows/ios-unit-tests.yml` → `xcode-select --switch /Applications/Xcode_26.4.1.app` |
| Min iOS (deployment target) | `16.4` | `sdk-56`'s `apps/expo-go/ios/Podfile` (`platform :ios, '16.4'` and `IPHONEOS_DEPLOYMENT_TARGET`) **and** `Exponent.xcodeproj/project.pbxproj` (`IPHONEOS_DEPLOYMENT_TARGET = 16.4`) — both agree |
| Brewfile (cmake/ninja) | byte-identical to `sdk-57` | `diff` of root `Brewfile` across branches |
| `.gitmodules` (react-native-lab) | byte-identical to `sdk-57` — SSH URL `git@github.com:expo/react-native.git`, branch `exp-latest` | `diff` of `.gitmodules` across branches |
| `apps/expo-go/README.md` build recipe | byte-identical to `sdk-57` | `diff` of the file across branches |

## What actually differs from SDK 57

This is the complete, verified diff — nothing else in the build-relevant
surface area changed:

1. **`sdkVersions.json`**: `{"sdkVersion":"56.0.0"}` vs `57.0.0`.
2. **Dependency versions** in `apps/expo-go/package.json` (resolved
   automatically by `pnpm install --frozen-lockfile` against each branch's
   own lockfile — the workflow does not need to hardcode any of these):
   - `react-native`: `0.85.3` (SDK 56) vs `0.86.2` (SDK 57)
   - `react-native-reanimated`: `4.3.1` vs `4.5.1`
   - `react-native-worklets`: `0.8.3` vs `0.10.1`
   - `react-native-gesture-handler`: `~2.31.1` vs `~2.32.0`
   - `react-native-keyboard-controller`: `^1.21.6` vs `^1.21.9`
   - `react-native-pager-view`: `8.0.1` vs `8.0.2`
   - `lottie-react-native`: `^7.3.4` vs `^7.3.8`
3. **`apps/expo-go/ios/Podfile`**: a minor test-target config difference
   (`includeTests: true` on SDK 56 vs `false` on SDK 57, and how
   `ExpoModulesTestCore` is linked). This affects the `Tests` scheme/target
   only, not the `Expo Go` app scheme this workflow builds — not expected
   to affect the Release/device build, and the completed SDK 57 build
   already confirms the shared parts of this Podfile compile and link
   correctly on this toolchain.

## Special workarounds needed for SDK 56?

**None found.** Given the byte-identical `Brewfile`, `.gitmodules`,
`apps/expo-go/README.md`, `Gemfile.lock`, and CI runner/Xcode pin, SDK 56
uses the exact same GitHub Actions macOS runner and toolchain that already
produced a working SDK 57 IPA (confirmed installable via SideStore and
LiveContainer — see [SDK_57.md](SDK_57.md) "Known Working State"). The SSH
submodule fix (`git config --global url."https://github.com/".insteadOf
"git@github.com:"`) applies identically, since `.gitmodules` is unchanged.

## Exact build commands (identical sequence to SDK 57, different `ref`)

```bash
# 1. Checkout
git clone --branch sdk-56 --depth 1 https://github.com/expo/expo.git expo-src
# (submodules: recursive, lfs: true handled by actions/checkout in the workflow)

# 2. Native build tools
cd expo-src && brew bundle

# 3. JS deps (monorepo root, unfiltered)
pnpm install --frozen-lockfile

# 4. React Native fork deps
pnpm run install:react-native-lab

# 5. Build the `expo` package
cd packages/expo && pnpm build && cd ../..

# 6. Ruby / CocoaPods (via Gemfile at repo root)
BUNDLE_GEMFILE=$(pwd)/Gemfile bundle install

# 7. Dynamic macros / plists
bash apps/expo-go/ios/Build-Phases/generate-dynamic-macros.sh --configuration Release

# 8. Pods
cd apps/expo-go/ios && BUNDLE_GEMFILE=$(pwd)/../../../Gemfile bundle exec pod install

# 9. Build (unsigned, physical device)
xcodebuild \
  -workspace Exponent.xcworkspace \
  -scheme "Expo Go" \
  -configuration Release \
  -sdk iphoneos \
  -destination "generic/platform=iOS" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS="" \
  PROVISIONING_PROFILE="" DEVELOPMENT_TEAM="" \
  ONLY_ACTIVE_ARCH=NO SKIP_INSTALL=NO \
  build
```

The GitHub Actions workflow (`build-expo-go.yml`) runs exactly this
sequence when you select `expo_sdk: "56"`.

## Validation steps (what the workflow checks automatically)

Same eleven checks as SDK 57 — see [SDK_57.md](SDK_57.md#validation-steps)
for the full list; they're SDK-agnostic and applied identically regardless
of which SDK you build.

## Known upstream issue: `SceneGeometry` (confirmed, patched)

**This was hit and confirmed on a real GitHub Actions run** (2026-08-16):
an unmodified `sdk-56` checkout fails to compile with:

```
expo-src/packages/expo-screen-capture/ios/ScreenCaptureModule.swift:14:
cannot find 'SceneGeometry' in scope
```

**Root cause, traced to the exact commit**: `sdk-56` backported commit
`735ce71` ("[ios][screen-capture] Resolve the key window from the
foregrounded scene (#48372)", 2026-08-13) into
`packages/expo-screen-capture` — this changed `ScreenCaptureModule.swift`
to call `SceneGeometry.keyWindow()`. That commit touches *only*
`expo-screen-capture`'s own files (verified via `git show 735ce71
--stat`) — it never brought over `SceneGeometry.swift` itself, which is
defined in `packages/expo-modules-core/ios/Utilities/SceneGeometry.swift`
on `main` but, as of `sdk-56` commit `21be29ff` (2026-08-14), does not
exist anywhere in the `sdk-56` tree (`git ls-tree -r sdk-56 | grep -i
scenegeometry` returns nothing). This is a genuine, isolated incomplete
backport on Expo's own release branch — not a problem with this
repository's workflow, checkout, or toolchain choices.

**Blast radius, verified isolated**: `git log c87637c..sdk-56 --oneline --
packages/expo-screen-capture/` shows exactly one commit (`735ce71`) touched
that package between the last-known-good commit and the current branch
tip, and `ScreenCaptureModule.swift` has exactly one reference to
`SceneGeometry` (line 14). The package's other source file,
`AnimatedBlurEffectView.swift`, has none.

**Fix applied**: `patches/sdk56/SceneGeometry.swift` in this repository is
a verbatim copy of the real `SceneGeometry.swift` from `expo/expo`'s
`main` branch (self-contained — imports only `UIKit`, no other
main-only-added dependencies). The workflow's **"Apply known SDK 56 source
patches"** step copies it into the checked-out tree, but *only* if
`expo-modules-core` doesn't already have that file — so the patch
automatically stops doing anything the moment Expo fixes the incomplete
backport upstream. It runs after checkout and before `pod install`, so
CocoaPods' `source_files` glob (`ios/**/*.{h,m,mm,swift,cpp}` — verified
via `ExpoModulesCore.podspec`) picks the new file up and compiles it as
part of the `ExpoModulesCore` target, same as any other file in that
directory.

**Compilation outcome**: the subsequent patched CI run linked and packaged
the app successfully and published its IPA (see the build status update
above). This verifies the workaround in that run's toolchain. It does not
prove every future upstream branch tip or a real-device installation.

**Worth doing**: this looks like a genuine bug worth reporting at
[github.com/expo/expo/issues](https://github.com/expo/expo/issues) —
anyone else building `sdk-56` Expo Go from source will hit the same
failure until Expo backports the missing file themselves.

## Known limitations

- Same free-Apple-ID entitlement limitations as SDK 57 apply (push,
  Sign In with Apple, Associated Domains, iCloud) — see
  [IPA_SIGNING.md](IPA_SIGNING.md).
- The historical upstream issue above was patched and compiled in this
  builder's CI; future branch changes still require fresh build evidence.

## Verification status

Be precise about what's actually been confirmed:

| Claim | Status |
|---|---|
| `sdk-56` branch exists and is the correct source ref | ✅ Verified from source (`git ls-remote`, `git clone`) |
| Node/pnpm/Ruby/CocoaPods/Xcode/runner versions | ✅ Verified from source (direct read of `sdk-56`'s own files, byte-diffed against `sdk-57`) |
| `.gitmodules`/Brewfile/README build recipe identical to SDK 57 | ✅ Verified from source (`diff`) |
| Min iOS deployment target (16.4) | ✅ Verified from source (`Podfile` + `project.pbxproj`) |
| Checkout, native tools, pnpm install, react-native-lab setup, `expo` package build, Ruby/CocoaPods install steps | ✅ **Verified in CI** — a real GitHub Actions run completed all of these steps successfully before failing at `xcodebuild` (see the `SceneGeometry` issue above) |
| `xcodebuild` and published IPA | ✅ **Verified in CI** — patched run `31936279223` succeeded and release `expo-go-sdk56-20260816-090047` contains the IPA |
| Resulting IPA installs on a real device | ⬜ **Unverified on a real device here; the full build and published IPA are confirmed** |
