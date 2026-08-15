# TROUBLESHOOTING.md

## SDK mismatch

**Symptom**: A project built for one Expo SDK version won't load, or shows
a compatibility warning, in an Expo Go built for a different SDK.

**Cause**: Expo Go embeds a specific `sdkVersion` (see
`apps/expo-go/sdkVersions.json` — `56.0.0` or `57.0.0`) and checks it
against your project's manifest at load time. This is intentional — Expo
Go's native module set is version-locked to the SDK it was built for.

**Fix**: Make sure the `expo_sdk` input you chose when running the
workflow matches your project's actual Expo SDK version (check your
project's `package.json` → `"expo"` dependency version, or `app.json` /
`app.config.js` → `sdkVersion` if set explicitly).

## Metro incompatibility

**Symptom**: Expo Go connects to Metro but the bundle fails to load, or
Metro itself reports a version-mismatch error.

**Cause**: Metro's protocol/bundle format can shift between SDK-tied React
Native versions (SDK 56 → RN 0.85.3, SDK 57 → RN 0.86.2 — see
[SDK_56.md](SDK_56.md#what-actually-differs-from-sdk-57)).

**Fix**: Confirm your project's own `react-native` version aligns with the
SDK you built Expo Go for. Running `npx expo install --check` in your
project is the fastest way to verify this.

## Expo Go version mismatch

**Symptom**: Expo Go reports it can't open the project, or offers to open
it in a different Expo Go "version."

**Fix**: Same root cause and fix as "SDK mismatch" above — rebuild (or
re-download) the artifact matching your project's actual SDK.

## Node version mismatch

**Symptom**: `pnpm install` fails with an "unsupported engine" error, or a
lockfile-version error.

**Cause**: `expo/expo` may have bumped its pinned Node/pnpm version on the
branch tip since this was last verified (2026-08-16 for both `sdk-56` and
`sdk-57` — see [SDK_56.md](SDK_56.md) / [SDK_57.md](SDK_57.md)).

**Fix**: Open the relevant branch's root `package.json` →
`"volta": {"node": ...}` and its `.github/workflows/ios-unit-tests.yml` →
the `pnpm/action-setup` version, on the *live* `expo/expo` repo. Update the
`node_version` / `pnpm_version` values in the workflow's **"Resolve
SDK-specific configuration"** step to match (see
[AI_CONTEXT.md](AI_CONTEXT.md#what-not-to-change-casually)).

## pnpm failure

**Symptom**: `pnpm install --frozen-lockfile` fails outright (not an engine
error).

**Fix**: Re-run once — native-module postinstall/build steps (`sharp`,
`better-sqlite3`, `@shopify/react-native-skia`) occasionally fail on first
try if a registry request times out. If it persists, open the full log and
check whether the failing package is one of `pnpm-workspace.yaml`'s
`onlyBuiltDependencies` — if `expo/expo` added a new one, pnpm should still
build it automatically; that list only affects which packages are
*allowed* to run build scripts, not whether they run.

## CocoaPods failure

**Symptom**: The **"pod install"** step fails.

**Fix**: Check the `failure-logs-sdk<56|57>` artifact's `pod-install.log`.
Common causes: a transient CocoaPods trunk/CDN fetch failure (re-run the
job), or the **"Build the `expo` package (tsc)"** step not having run
first (it must run before `pod install`, since `Podfile` invokes
`expo/bin/autolinking`, which needs that build output — this ordering is
correct in the shipped workflow).

## Xcode version mismatch

**Symptom**: The **"Select Xcode"** step logs
`::warning::...was not found on this runner image.`

**Cause**: GitHub rotates the available Xcode versions on the `macos-26`
image every few weeks (oldest build retired shortly after a new one
ships). The workflow pins `26.4.1` because that's what `expo/expo`'s own
CI used for both SDK 56 and SDK 57 as of 2026-08-16.

**Fix**: Open the step's log for the `Available versions:` list it prints,
and re-run the workflow with `xcode_version` set to one of those. Any
Xcode 26.x with an iOS 26 SDK should behave the same.

## Missing plist

**Symptom**: `EXBuildConstants.plist` or `GoogleService-Info.plist` isn't
present when the **"Generate EXBuildConstants.plist / GoogleService-Info.plist"**
step checks for it, or a later step complains it's missing.

**Fix**: Check whether `apps/expo-go/ios/Build-Phases/generate-dynamic-macros.sh`
changed on the relevant branch since this was last verified. This script
falls back to the public, checked-in `template-files/keys.json` when
Expo-internal `secrets/keys.json` isn't present — which is the expected,
documented, "no secrets" path (`secrets/README.md` in `expo/expo`:
*"Expo's software works without these secrets"*). If the fallback path
itself changed upstream, the script invocation in this workflow may need
updating.

## Missing environment variable

**Symptom**: A step complains about an undefined/missing environment
variable.

**Fix**: This pipeline needs zero GitHub Secrets — everything is public,
checked-in fallback config. If something starts requiring a new env var,
check whether `apps/expo-go/ios/Podfile` or
`Build-Phases/generate-dynamic-macros.sh` changed on the branch you're
building — re-diff against the last-verified version in
[SDK_56.md](SDK_56.md) / [SDK_57.md](SDK_57.md).

## Architecture mismatch (simulator binary accidentally produced)

**Symptom**: The **"Find and verify the .app bundle"** step's `lipo -info`
doesn't report `arm64`, or reports a simulator-flavored slice.

**Cause**: Almost always `-sdk` or `-destination` in the `xcodebuild`
invocation getting changed away from `iphoneos` / `generic/platform=iOS`.

**Fix**: Check the **"Build Expo Go (iphoneos, arm64, unsigned)"** step's
`xcodebuild` command for those two flags. The validation step is
specifically designed to catch this immediately in the logs rather than
letting a simulator build silently reach packaging.

## IPA packaging failure

**Symptom**: The **"Package IPA"** step fails, or the resulting `.ipa`
doesn't validate (fails the `unzip -t` or `Payload/*.app` grep check).

**Fix**: This step only runs after `find_app` has already confirmed the
`.app` bundle exists and reports `arm64` — so a packaging-stage failure
usually means a `zip`/disk-space issue on the runner rather than a build
problem. Check the **"Runner diagnostics"** step's `df -h /` output from
the same run for disk pressure.

## Sideloadly installation failure

**Symptom**: Sideloadly reports an error signing or installing the `.ipa`.

**Fix**: See [IPA_SIGNING.md](IPA_SIGNING.md#free-apple-id-signing-limitations)
first — "maximum number of apps" / "maximum number of App IDs" errors are
Apple-side free-account limits, not a problem with the IPA itself. If
Sideloadly reports the `.ipa` itself is malformed/unreadable, re-download
the artifact (don't unzip the `.ipa` itself after unzipping the GitHub
artifact wrapper) and confirm the workflow's own IPA validation step
(`unzip -t`, `Payload/*.app` check) passed in the build log.

## iOS 26 issues

**Symptom**: The app crashes immediately on launch on an iOS 26 device.

**Fix**: First isolate whether it's iOS-26-specific or a Sideloadly resign
issue: check the device's crash log (**Settings → Privacy & Security →
Analytics & Improvements → Analytics Data**, look for `Expo Go`). If the
crash is in Firebase/Crashlytics initialization, check that
`GoogleService-Info.plist` was actually generated (the "Generate
EXBuildConstants.plist / GoogleService-Info.plist" step logs its
presence) — a missing/malformed one is a more likely cause than iOS 26
itself, since both SDK 56 and SDK 57 are built with the iOS 26 SDK, so
basic OS compatibility is expected.

## Metro LAN connection issues

**Symptom**: Expo Go can't find/connect to a locally running Metro dev
server.

**Cause**: Networking/dev-workflow issue, not a build issue.

**Fix**: Confirm your computer running `npx expo start` and your
iPhone/iPad are on the same Wi-Fi network, and that no firewall on the dev
machine is blocking inbound connections on Metro's port. A free-Apple-ID
resign does not affect local networking permissions.

## Tunnel connection issues

**Symptom**: `npx expo start --tunnel` connects but Expo Go still can't
load the project.

**Fix**: Also a dev-workflow/networking issue, unrelated to how this IPA
was built or signed. Verify the tunnel URL Metro prints is reachable from
the device's current network (tunnels route through a third-party relay
and can be affected by that service's own availability, unrelated to this
repo).

## SocketRocket module-cache error

**Symptom**: The **"Build Expo Go"** step's log shows:

```
fatal error: module 'SocketRocket' in precompiled file '.../SocketRocket-*.pcm'
(imported by precompiled file '.../Exponent-Bridging-Header-*.pch') is not
defined in any loaded module map file
```

...but the job still finishes with a green checkmark and produces a valid
IPA (all later steps — `find_app`, arch checks, packaging — pass).

**Cause**: A known Clang explicit-module-cache race: a `.pcm` file gets
invalidated by a concurrent compile job before its dependent `.pch`
consumer reads it. It's a build-system concurrency flake, not a missing
dependency — the `SocketRocket.modulemap` file it asks about does exist,
generated by `pod install` earlier in the same run. `xcodebuild`'s build
system automatically retries failed compile units a few times, and the
retry succeeds — which is why the job still goes green. This exact
sequence was observed and confirmed benign during SDK 57's original
successful build (see [SDK_57.md](SDK_57.md#known-working-state)).

**Fix**: None needed if the job succeeds overall — the retry already
handled it. If you want confirmation, expand the build step's log and
search for `SocketRocket`; you should see the fatal error once, followed
by a successful recompile with no repeated error after it. If this ever
causes an actual job *failure* (not just a logged warning), it's worth
reducing build parallelism (e.g. `-parallelizeTargets NO` or a lower
`-jobs` value on the `xcodebuild` invocation) to lower the odds of hitting
the race at all.
