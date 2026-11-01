# SDK 57 — verified build configuration

This is the original, proven build target of this repository. Its
configuration is preserved unchanged in `build-expo-go.yml` (the unified
workflow) — see [DECISIONS.md](DECISIONS.md) for why it was not touched
beyond parameterizing the branch name and output labels.

Every value below was re-verified against the live `sdk-57` branch of
`expo/expo` on **2026-08-16**, alongside the SDK 56 verification pass (see
[SDK_56.md](SDK_56.md) for the full diff between the two).

Current automatic settings and SDK 54–58 support are documented in
[SDK_SUPPORT.md](SDK_SUPPORT.md). The details below preserve the original
August source/build evidence.

## Source reference

| Item | Value | How verified |
|---|---|---|
| Branch | `sdk-57` (real branch, not a tag) | `git ls-remote --heads` / `git clone --branch sdk-57` on expo/expo |
| React Native | `0.86.2` | root `package.json` → `resolutions."react-native"`, and `apps/expo-go/package.json` |
| Embedded SDK version string | `57.0.0` | `apps/expo-go/sdkVersions.json` → `{ "sdkVersion": "57.0.0" }` |
| Commit originally built | `0d3eccbb…` (as of 2026-08-15, per the original README) | `git log -1` at build time |

## Toolchain

| Item | Verified value | Source |
|---|---|---|
| Node.js | `22.14.0` | root `package.json` → `"volta": {"node": "22.14.0"}` |
| pnpm | `10` | `ios-unit-tests.yml`; compatible with `pnpm-lock.yaml`'s `lockfileVersion: '9.0'` |
| Ruby | `3.2.2` | `ios-unit-tests.yml` |
| CocoaPods | `1.16.2` | root `Gemfile` / `Gemfile.lock` |
| Fastlane | `2.232.2` (pinned, unused by this pipeline directly) | root `Gemfile.lock` |
| Bundler | `2.4.22` | `Gemfile.lock` → `BUNDLED WITH` |
| Runner image | `macos-26` | `ios-unit-tests.yml` |
| Xcode | `26.4.1` | `ios-unit-tests.yml` (`xcode-select --switch /Applications/Xcode_26.4.1.app`) |
| Xcode scheme | `Expo Go` | `apps/expo-go/ios/Exponent.xcodeproj/xcshareddata/xcschemes/Expo Go.xcscheme` |
| Bundle ID | `host.exp.Exponent` | `apps/expo-go/ios/Exponent/Supporting/Info.plist` |
| Min iOS version | `16.4` | `apps/expo-go/ios/Podfile` (`platform :ios, '16.4'`) and `project.pbxproj` (`IPHONEOS_DEPLOYMENT_TARGET`), agree |
| Build steps | plain `pnpm install` (unfiltered) at repo root, `pnpm run install:react-native-lab`, `pnpm build` in `packages/expo`, `pod install` in `apps/expo-go/ios` | `apps/expo-go/README.md` ("Building Expo Go") |
| No secrets required | confirmed | `secrets/README.md` in expo/expo |
| Entitlements that need a paid team | `aps-environment` (push), `com.apple.developer.applesignin`, `com.apple.developer.associated-domains`, iCloud keys | `apps/expo-go/ios/Exponent/Supporting/Exponent.entitlements` |
| EXShell.plist not needed | confirmed — no code in the current tree references it | `grep -r "EXShell" apps/expo-go/ios` |
| Submodule auth | `react-native-lab/react-native` declared via SSH URL in `.gitmodules`; requires the `git config --global url.insteadOf` rewrite (see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)) | direct read of `.gitmodules`, confirmed by an actual CI failure and fix (see [DECISIONS.md](DECISIONS.md)) |

## Known Working State

**This is the important part.** As of this writing, SDK 57's build has been
taken all the way through to a working result on a real device — not just
"the workflow went green":

1. A GitHub Actions run of the (pre-unification) SDK 57 workflow completed
   successfully — every gating step (`find_app`, arch checks, IPA
   packaging, upload) passed.
2. The project owner uploaded that IPA to this repository's **GitHub
   Releases** as **"SDK 57 for iOS"** — this is the reference/prebuilt
   release referred to throughout this documentation.
3. The project owner **installed and successfully ran the app** via
   SideStore and LiveContainer on a real iOS device.

This means: for SDK 57, every layer of this pipeline — checkout, native
build tools, Node/pnpm install, Ruby/CocoaPods, `xcodebuild`, IPA packaging,
and (via SideStore/LiveContainer, which perform their own signing) actual
on-device execution — is confirmed working, not theoretical.

One non-fatal artifact from that run worth knowing about: the `xcodebuild`
log showed a single `fatal error: module 'SocketRocket' ... is not defined
in any loaded module map file` partway through compilation. This is a
known Clang explicit-module-cache race (a `.pcm` invalidated mid-build
under parallel compilation) — xcodebuild's build system retried the failed
compile unit and the retry succeeded, which is why the job still finished
green with a valid, working `.app`. See
[TROUBLESHOOTING.md](TROUBLESHOOTING.md#socketrocket-module-cache-error)
if you see it recur.

## How the release relates to the GitHub Actions build

The **"SDK 57 for iOS"** GitHub Release is a **static, one-time snapshot**
— it was built once, from whatever `sdk-57` commit was current at that
time, and uploaded manually. It is **not** automatically regenerated or
kept in sync by this workflow. Running the unified `build-expo-go.yml`
workflow again (with `expo_sdk: "57"`) will build the *current* tip of
`sdk-57` and produce a **new** Actions
artifact — it will not touch, overwrite, or replace the existing Release.

The dispatch form always selects the SDK's release branch automatically.
There is no `expo_ref` input. Each build records its exact upstream SHA in
the summary and optional release notes. A maintainer investigating a
historical commit must change the configuration in source, rather than
adding extra fields to the user form.

## Exact build commands

Identical structure to [SDK_56.md](SDK_56.md#exact-build-commands-identical-sequence-to-sdk-57-different-ref),
with `--branch sdk-57` at the checkout step. The unified workflow runs this
exact sequence when you select `expo_sdk: "57"` (the default).

## Validation steps

The workflow validates, in order:

1. **IPA/`.app` exists** — `find_app` step fails the job explicitly if not.
2. **Valid ZIP** — `unzip -t` on the packaged `.ipa`.
3. **Contains `Payload/*.app`** — `unzip -l` grep check, fails the job if missing.
4. **Physical-device build (not simulator)** — `lipo -info` + `otool -l` / `LC_BUILD_VERSION` check.
5. **ARM64 present in the executable** — `lipo -archs`.
6. **Bundle identifier printed** — `PlistBuddy -c "Print :CFBundleIdentifier"`.
7. **Expo Go / app version printed** — `PlistBuddy -c "Print :CFBundleShortVersionString"`, plus the raw `sdkVersions.json`.
8. **Minimum iOS version printed** — `PlistBuddy` read of `MinimumOSVersion` where present, with a documented fallback pointer to this file's verified Podfile value.
9. **Build architecture printed** — `lipo -archs`.
10. **Code-signing state printed** — `codesign -dvvv`, expected to report "unsigned."
11. **IPA file size printed** — `du -sh`.

The workflow explicitly labels the output **"Unsigned physical-device
IPA — requires signing before installation"** in both the job summary and
an inline `::notice::` — it never claims the raw Actions artifact is
directly installable.
