# Supported Expo Go SDKs

The single [download workflow](../.github/workflows/build-expo-go.yml) offers SDKs
**52, 53, 54, 55, 56, 57, and 58**. Select the SDK your Expo project uses and, if
wanted, tick **Also publish this build as a GitHub Release**. All remaining
settings are automatic. SDK 57 remains the default because it has a
previously successful build and owner-reported device testing.

## Automatic build settings

| SDK | Expo branch | GitHub runner | Preferred Xcode | Node | Monorepo package manager | Minimum iOS |
|---|---|---|---|---|---|---|
| 52 | `sdk-52` | `macos-15` | `16.4` | `20.12.2` | Yarn Classic `1.22.22` | `15.1` |
| 53 | `sdk-53` | `macos-15` | `16.4` | `22.14.0` | Yarn Classic `1.22.22` | `15.1` |
| 54 | `sdk-54` | `macos-15` | `26.2` | `22.14.0` | Yarn Classic `1.22.22` | `15.1` |
| 55 | `sdk-55` | `macos-15` | `26.2` | `22.14.0` | Yarn Classic `1.22.22` | `15.1` |
| 56 | `sdk-56` | `macos-26` | `26.4.1` | `22.14.0` | pnpm `10` | `16.4` |
| 57 | `sdk-57` | `macos-26` | `26.4.1` | `22.14.0` | pnpm `10` | `16.4` |
| 58 | `sdk-58` | `macos-26` | `26.4.1` | Node `24` release line | pnpm `12.2.1` | `16.4` |

The builder uses Ruby `3.2.2`. SDK 52 locks CocoaPods `1.15.2`; SDKs 53–58
lock `1.16.2` through their own committed `Gemfile.lock`. Their transitive Ruby dependencies differ, so
the workflow installs the selected branch's lockfile. Yarn Classic is
also installed for the React Native submodule on pnpm SDKs. The Yarn
Classic patch version is a builder pin; the older Expo branches specify
Yarn usage rather than that exact patch version.

The SDK configuration is resolved in one Linux job before the macOS build
job starts. This keeps the runner choice and all other SDK settings in
one case statement. Native iOS compilation and verified Android APK
preparation run as jobs in **one workflow**, followed by release publishing.
Pushing does not start native compilation. Manual dispatch and the
scheduled upstream release check use this same workflow.

The scheduled check compares Expo's stable client versions with the
provenance recorded in published releases, then requests missing or changed
SDK builds. SDKs outside the reviewed 52–58 configuration need explicit
toolchain support; detection does not make an unknown future SDK buildable.

If GitHub has retired the preferred Xcode app, selection automatically
falls back to the runner's default and prints a warning. The build summary
reports the actual selected Xcode version. Compatibility with a future
replacement Xcode is not guaranteed; failed builds retain diagnostic logs.

## Differences that affect the build

- **SDK 52–55 use Yarn**, with `yarn.lock`; they do not have the pnpm
  workspace configuration used by SDK 56–58.
- **SDK 52 and 53 retain the older toolchain.** Both use Xcode 16.4 and
  minimum iOS 15.1, but SDK 52's monorepo Node pin is 20.12.2 and its
  CocoaPods lock is 1.15.2. These builder settings still need a successful
  native run. Their absent Brewfiles require explicit CMake/Ninja setup.
  SDK 52 has no root `install:react-native-lab` script, so its React Native
  submodule dependencies are installed directly with Yarn.
- **SDK 54 now needs Xcode 26 despite its older upstream CI pin.** Run
  [41267553893](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/41267553893)
  reached compilation but failed with `no such module 'DeclaredAgeRange'`
  under Xcode 16.4. The branch's `expo-age-range` imports that iOS 26
  framework unconditionally, while runtime calls are guarded for iOS 26.
  The builder selects Xcode 26.2 on macOS 15, retaining minimum iOS 15.1.
- **SDK 52–54 use the older expotools plist generator.** The workflow passes
  its Xcode environment (`SRCROOT`, `CONFIGURATION=Release`, and
  `APP_OWNER=Expo`) and invokes its wrapper without modern command-line
  flags. Its SDK metadata lives at
  `apps/expo-go/ios/Exponent/Supporting/sdkVersions.json` and uses a
  `sdkVersions` array. CI skips fetching a local Metro manifest, so a
  local Metro server is not required for this Release build.
- **SDK 52/53 use historical app version numbers.** Their Expo Go versions
  use `2.32.x` and `2.33.x`, respectively. App version major numbers cannot
  identify these SDKs; the source SDK metadata and published provenance
  establish the SDK association.
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

SDKs 54–58 were inspected on **2026-10-31** using a blobless sparse clone of
`expo/expo`, comparing the root `package.json`, lockfiles, `Gemfile`,
`Brewfile`, `.gitmodules`, iOS CI, Expo Go README, Podfile, scheme, plist,
and macro generation scripts. SDK 52/53 source files were checked on
**2026-11-01** against their release branches. Exact inspected refs:

| SDK | Inspected upstream commit | React Native in Expo Go |
|---|---|---|
| 52 | [`d516432a626ef37de1ae750ffc3b47a142a63f17`](https://github.com/expo/expo/tree/d516432a626ef37de1ae750ffc3b47a142a63f17) | `0.76.9` |
| 53 | [`e3dcb2ba8ce24edf92f9be2385fd808e4e74ce50`](https://github.com/expo/expo/tree/e3dcb2ba8ce24edf92f9be2385fd808e4e74ce50) | `0.79.6` |
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
The November 1 SDK 58 native build verified that runner substitution for
the recorded upstream commit, not every future branch revision.

## Android APK provenance

Android downloads are the **original Expo-signed APKs**, selected from
[Expo's versions metadata](https://exp.host/--/api/v2/versions) and
[official Expo Go releases](https://github.com/expo/expo-go-releases).
They are mirrored byte-for-byte alongside the community iOS IPA. This
repository does not compile or re-sign the Android APK.

Preparation checks the official GitHub asset size and SHA-256, verifies the
APK cryptographic signature with Android's `apksigner`, and reads its
package, app version, and minimum Android API using `aapt`. The release
includes an `ExpoGo-SDK<version>-android.json` receipt. Website availability
comes from published assets and receipts; adding an SDK option alone does
not advertise an unpublished download.

The APK can be opened directly on Android after allowing installation from
the chosen browser or file manager. iOS IPAs remain unsigned and require
signing or a configured LiveContainer installation. Signature, hash, and
browser checks do not establish physical-device launch testing.

## Build and device evidence

| SDK | Evidence |
|---|---|
| 52 | Source and toolchain configuration inspected. Native IPA compilation, release publication, and device installation are not yet verified here. |
| 53 | Source and toolchain configuration inspected. Native IPA compilation, release publication, and device installation are not yet verified here. |
| 54 | Native compilation, arm64/plist/ZIP checks, and artifact upload succeeded in [run 41270904815](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/41270904815). Its release step failed with HTTP 403; the exact verified artifact was recovered into [this release](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk54-20261101-043016), version 54.0.7, 34,727,630 bytes, SHA-256 `6ac1073f472670faf47e7ee15d1135abbb6158d9abdb819fc97f5f8c7db2b958`. Device installation remains unverified here. |
| 55 | [Successful November 1 build](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/41267544358) and [published IPA](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk55-20261101-034221). Artifact size and SHA-256 checked during source generation. Device installation remains unverified here. |
| 56 | [Successful build](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/31936279223) and [published IPA](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk56-20260816-090047) from August 16. Device installation remains unverified here. |
| 57 | [Successful build](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/31938038257) and [published IPA](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk57-20260816-094039). Earlier device testing via SideStore/LiveContainer was reported by the owner; see [SDK_57.md](SDK_57.md). |
| 58 | [Successful November 1 build](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/actions/runs/41267578626) and [published IPA](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/tag/expo-go-sdk58-20261101-034916). Artifact size and SHA-256 checked during source generation. Device installation remains unverified here. |

The original August build logs were recovered on November 1, 2026:
SDK 56 built Expo commit `21be29ff1a27822a243b1b7b8bd1bdc963b6dae9`, and
SDK 57 built `0d3eccbbe5d0344dbe112f0eeecd061b3959add7`. Their published
release notes now include these commits and the GitHub asset digests.
The SDK 57 IPA predates Expo's August 27 React Native 0.86.3/Hermes fix;
do not equate that historical artifact with the newer inspected branch.

Historical successful builds do not prove every later upstream branch tip
will compile. The workflow deliberately tracks each selected release branch.
Local checks validate configuration and scripts, not an iOS binary.

### SDK 54 release-upload failure

The failed run already had `Contents: write`. Its builder commit was no
longer the head of `main` when release creation ran, and its workflow files
differed from the current default branch. GitHub's release endpoint can
require additional workflow authorization for that target, surfacing
`403 Resource not accessible by integration`. See the
[release API permission rules](https://docs.github.com/en/rest/releases/releases#create-a-release).

Release creation targets current `main`; the exact source and builder
commits used for compilation remain in the notes and provenance. This
avoids changing source history or asking users for a more powerful token.

## Local validation

Requires Python, PyYAML, and Bash (Git Bash at its standard installation
path on Windows). From the repository root:

```powershell
python -m pip install -r tests/requirements.txt
python -m unittest discover -s tests -v
```

Run `actionlint` against `.github/workflows/build-expo-go.yml` for workflow
syntax and expression checks. The repository contains no separate test
workflow: the combined IPA/APK workflow is the only workflow file.
