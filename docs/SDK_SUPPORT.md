# Supported Expo Go SDKs

The single [IPA workflow](../.github/workflows/build-expo-go.yml) offers SDKs
**54, 55, 56, 57, and 58**. Select the SDK your Expo project uses and, if
wanted, tick **Also publish this build as a GitHub Release**. All remaining
settings are automatic. SDK 57 remains the default because it has a
previously successful build and owner-reported device testing.

## Automatic build settings

| SDK | Expo branch | GitHub runner | Preferred Xcode | Node | Monorepo package manager | Minimum iOS |
|---|---|---|---|---|---|---|
| 54 | `sdk-54` | `macos-15` | `16.4` | `22.14.0` | Yarn Classic `1.22.22` | `15.1` |
| 55 | `sdk-55` | `macos-15` | `26.2` | `22.14.0` | Yarn Classic `1.22.22` | `15.1` |
| 56 | `sdk-56` | `macos-26` | `26.4.1` | `22.14.0` | pnpm `10` | `16.4` |
| 57 | `sdk-57` | `macos-26` | `26.4.1` | `22.14.0` | pnpm `10` | `16.4` |
| 58 | `sdk-58` | `macos-26` | `26.4.1` | Node `24` release line | pnpm `12.2.1` | `16.4` |

All branches use Ruby `3.2.2` and CocoaPods `1.16.2` through their own
committed `Gemfile.lock`. Their transitive Ruby dependencies differ, so
the workflow installs the selected branch's lockfile. Yarn Classic is
also installed for the React Native submodule on pnpm SDKs. The Yarn
Classic patch version is a builder pin; the older Expo branches specify
Yarn usage rather than that exact patch version.

The SDK configuration is resolved in one Linux job before the macOS build
job starts. This keeps the runner choice and all other SDK settings in
one case statement. These are two jobs in **one workflow**, not separate
workflows. Only manual dispatch starts a build; pushing does not start
an expensive native compilation.

If GitHub has retired the preferred Xcode app, selection automatically
falls back to the runner's default and prints a warning. The build summary
reports the actual selected Xcode version. Compatibility with a future
replacement Xcode is not guaranteed; failed builds retain diagnostic logs.

## Differences that affect the build

- **SDK 54 and 55 use Yarn**, with `yarn.lock`; they do not have the pnpm
  workspace configuration used by SDK 56–58.
- **SDK 54 uses the older expotools plist generator.** The workflow passes
  its Xcode environment (`SRCROOT`, `CONFIGURATION=Release`, and
  `APP_OWNER=Expo`) and invokes its wrapper without modern command-line
  flags. Its SDK metadata lives at
  `apps/expo-go/ios/Exponent/Supporting/sdkVersions.json` and uses a
  `sdkVersions` array. CI skips fetching a local Metro manifest, so a
  local Metro server is not required for this Release build.
- **SDK 55–58 use the shell plist generator** and
  `apps/expo-go/sdkVersions.json` with a `sdkVersion` string.
- **SDK 56 retains its conditional SceneGeometry patch.** It is applied
  only when the upstream utility is absent. See [SDK_56.md](SDK_56.md).
- **SDK 58 requires pnpm 12.2.1** in its root `devEngines`/`engines`
  configuration. Its CI uses Node 24. The existing React Native setup
  command also builds React Native codegen, and its Podfile explicitly
  builds customized Hermes from source. The workflow runs those upstream
  commands and uses that Podfile without replacing them.

Each checkout is checked against the requested embedded SDK before
dependency installation. Every build records the exact upstream commit;
the job summary and optional release notes include that commit.

## Source verification

Source was inspected on **2026-10-31** using a blobless sparse clone of
`expo/expo`, comparing the root `package.json`, lockfiles, `Gemfile`,
`Brewfile`, `.gitmodules`, iOS CI, Expo Go README, Podfile, scheme, plist,
and macro generation scripts. Exact inspected refs:

| SDK | Inspected upstream commit | React Native in Expo Go |
|---|---|---|
| 54 | [`12d6ea8d413e5bc80e8808cca52f47b146d44a90`](https://github.com/expo/expo/tree/12d6ea8d413e5bc80e8808cca52f47b146d44a90) | `0.81.5` |
| 55 | [`c5bdb92b89becf7f26001fde6e934b52ac9cfe99`](https://github.com/expo/expo/tree/c5bdb92b89becf7f26001fde6e934b52ac9cfe99) | `0.83.10` |
| 57 | [`b06b4fd800146485e06ffac3dc6a44964d03c776`](https://github.com/expo/expo/tree/b06b4fd800146485e06ffac3dc6a44964d03c776) | `0.86.3` |
| 58 | [`004bfc41cfd82784da23450101015717c5da74e6`](https://github.com/expo/expo/tree/004bfc41cfd82784da23450101015717c5da74e6) | `0.88.1` |

SDK 56's original source comparison is preserved in [SDK_56.md](SDK_56.md).
The preferred Xcodes were also checked against GitHub's
[macOS 15](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md)
and [macOS 26](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
image inventories. SDK 58 upstream CI now uses a Blacksmith runner;
this builder keeps GitHub-hosted `macos-26` with the same preferred Xcode.
That runner substitution needs its own native build verification.

## Build and device evidence

| SDK | Evidence |
|---|---|
| 54 | Source configuration and local dispatch checks verified; this builder's native compilation and device installation are not yet verified. |
| 55 | Source configuration and local dispatch checks verified; this builder's native compilation and device installation are not yet verified. |
| 56 | [Successful build](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/31936279223) and [published IPA](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk56-20260816-090047) from August 16. Device installation remains unverified here. |
| 57 | [Successful build](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/31938038257) and [published IPA](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk57-20260816-094039). Earlier device testing via SideStore/LiveContainer was reported by the owner; see [SDK_57.md](SDK_57.md). |
| 58 | Source configuration and local dispatch checks verified; this builder's native compilation and device installation are not yet verified. |

The original August build logs were recovered on November 1, 2026:
SDK 56 built Expo commit `21be29ff1a27822a243b1b7b8bd1bdc963b6dae9`, and
SDK 57 built `0d3eccbbe5d0344dbe112f0eeecd061b3959add7`. Their published
release notes now include these commits and the GitHub asset digests.
The SDK 57 IPA predates Expo's August 27 React Native 0.86.3/Hermes fix;
do not equate that historical artifact with the newer inspected branch.

Historical successful builds do not prove every later upstream branch tip
will compile. The workflow deliberately tracks each selected release branch.
Local checks validate configuration and scripts, not an iOS binary.

## Local validation

Requires Python, PyYAML, and Bash (Git Bash at its standard installation
path on Windows). From the repository root:

```powershell
python -m pip install -r tests/requirements.txt
python -m unittest discover -s tests -v
```

Run `actionlint` against `.github/workflows/build-expo-go.yml` for workflow
syntax and expression checks. The repository contains no separate test
workflow: the IPA builder is the only workflow file.
