# GITHUB_ACTIONS.md

## How to start a build

1. On GitHub, open your repo → **Actions** tab.
2. First time only: GitHub may ask you to confirm workflows are enabled —
   click **"I understand my workflows, go ahead and enable them"**.
3. Click **"Build Expo Go (unsigned IPA for Sideloadly)"** in the left
   sidebar.
4. Click **"Run workflow"** (top right).
5. Fill in the inputs (see below), then click **"Run workflow"** again to
   start it.
6. Wait. Expect roughly 60–150 minutes depending on cache state — Hermes is
   built from source and the JS/native install steps dominate. You can
   close the tab; the run keeps going.
7. When the run finishes (green check), open it and scroll to **Artifacts**
   at the bottom of the run summary page.

## How to choose SDK 56/57

The **`expo_sdk`** input is a dropdown with two choices: `"57"` (default)
and `"56"`. Everything else — which branch is checked out, how the output
files and artifacts are named, what shows up in the job summary — follows
automatically from this one choice. You don't need to touch any other
input to switch SDKs.

## What each input means

| Input | Meaning | Default | When to change it |
|---|---|---|---|
| `expo_sdk` | Which Expo Go SDK version to build: `"57"` or `"56"` | `"57"` | Pick the SDK your project actually uses — see the README's "Choose SDK 56 if…" / "Choose SDK 57 if…" sections |
| `expo_ref` | Overrides the branch/tag/commit checked out in `expo/expo`, instead of the SDK's default branch (`sdk-57` or `sdk-56`) | *(blank — uses the SDK default)* | Set this to an exact commit SHA if you need a reproducible rebuild of a specific point in time, rather than "whatever's on the branch tip today" |
| `xcode_version` | Which Xcode app bundle to `xcode-select --switch` to on the runner | `26.4.1` | Only if the pinned version stops existing on the `macos-26` image — see [Diagnosing Xcode failures](#how-to-diagnose-xcode-failures) below |
| `create_release` | Also publish this build as a new, uniquely-tagged GitHub Release, in addition to the Actions artifact | `false` | Turn on if you specifically want this run's IPA to land in Releases (e.g. to share a link with someone) rather than just the Actions artifact |

## Where artifacts appear

Bottom of the run's summary page, under **Artifacts**:

- **SDK 57 builds** → artifact named `ExpoGo-SDK57-iOS`, containing
  `ExpoGo-SDK57-unsigned.ipa`.
- **SDK 56 builds** → artifact named `ExpoGo-SDK56-iOS`, containing
  `ExpoGo-SDK56-unsigned.ipa`.

Artifacts download as a `.zip` (GitHub's wrapper) — unzip once to get the
actual `.ipa`. Don't unzip the `.ipa` itself; Sideloadly wants it as-is.
Artifacts are retained for 30 days.

If you enabled `create_release`, the same IPA is also attached to a new
GitHub Release, tagged `expo-go-sdk<56|57>-<timestamp>`.

## How to interpret logs

The **"Resolve SDK-specific configuration"** step (first step in the job)
prints a block like:

```
==================================================
Expo Go Build
SDK:             56
Source:          sdk-56
Node:            22.14.0
pnpm:            10
Ruby:            3.2.2
CocoaPods:       1.16.2
Xcode:           26.4.1
iOS SDK:         iphoneos
Min iOS:         16.4
Target:          iphoneos
Configuration:   Release
Signing:         Disabled
IPA filename:    ExpoGo-SDK56-unsigned.ipa
Artifact name:   ExpoGo-SDK56-iOS
Create release:  false
==================================================
```

This is the authoritative summary of exactly what this run will do — check
it first if a run produced something you didn't expect.

The **"Find and verify the .app bundle"** and **"Package IPA"** steps print
numbered validation output (arch, bundle ID, signing state, etc.) — this is
what actually gates whether the job can succeed, not just "did xcodebuild
exit 0."

## How to rerun failed builds

Click into the failed run → **"Re-run jobs"** (top right) → **"Re-run
failed jobs"**. This reuses the same inputs (`expo_sdk`, `expo_ref`, etc.)
as the original run. If you want to change an input, use **"Run workflow"**
from the workflow's main page instead, which starts a fresh run.

## How caching works

Two caches, both keyed per-SDK (so SDK 56 and SDK 57 runs never share or
collide on cache entries):

- **pnpm store** (`~/.pnpm-store`) — keyed on OS + SDK + ref +
  `pnpm-lock.yaml` hash. Speeds up `pnpm install`.
- **CocoaPods `Pods/`** — keyed on OS + SDK + ref + `Podfile.lock` hash.
  Speeds up `pod install`'s resolve step (the actual `Pods/` directory and
  generated Xcode project still get written either way).

A cache miss just means a slower run, not a failure — both steps work fine
cold.

## How to diagnose Xcode failures

Open the **"Select Xcode"** step's log. If you see:

```
::warning::...was not found on this runner image.
```

GitHub has rotated the available Xcode versions on the `macos-26` image
(this happens every few weeks — GitHub retires old builds shortly after a
new one ships). The warning prints the actually-available versions — copy
one of those and re-run with `xcode_version` set to it. Stick to an Xcode
26.x with an iOS 26 SDK if possible; that's what this pipeline was verified
against for both SDK 56 and SDK 57 (see [SDK_56.md](SDK_56.md) /
[SDK_57.md](SDK_57.md)).

## How to diagnose CocoaPods failures

Check the **`failure-logs-sdk<56|57>`** artifact (uploaded automatically
on any job failure) for `pod-install.log`. Common causes:

- A transient CocoaPods trunk/CDN hiccup — just re-run.
- The **"Build the `expo` package (tsc)"** step didn't run before **"pod
  install"** — `Podfile` invokes `expo/bin/autolinking`, which needs that
  build output. This ordering is correct in the shipped workflow; only a
  concern if you've reordered steps.

## How to diagnose architecture failures

The **"Find and verify the .app bundle"** step's `lipo -info` output is the
first place to look. It should report `arm64` and nothing else. If it
reports a simulator-flavored architecture or fails to find `arm64` at all,
check the **"Build Expo Go"** step's `xcodebuild` invocation for `-sdk` and
`-destination` — they must be `iphoneos` and `generic/platform=iOS`
respectively. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#architecture-mismatch-simulator-build-instead-of-device).
