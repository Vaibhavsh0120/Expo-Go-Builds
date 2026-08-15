# Expo Go SDK 57 — build from source with GitHub Actions, sideload with Sideloadly

Builds the real `apps/expo-go` iOS target from expo/expo's `sdk-57` branch on a
GitHub-hosted macOS runner, unsigned, for a physical arm64 device. You download
the `.ipa` and sign/install it yourself with Sideloadly on Windows, using a
free Apple ID. No Mac, no Apple Developer Program membership, no Expo-internal
secrets required.

## Is this actually possible? Yes — with caveats

**Building it: yes, fully possible for free.** Expo Go is open source
(`expo/expo`, MIT-ish license), the whole `apps/expo-go/ios` build works
without any Expo-internal credentials (confirmed straight from Expo's own
`secrets/README.md`: *"Expo's software works without these secrets"*), and
Xcode will happily compile+link an **unsigned** `.app` for `-sdk iphoneos`
when you pass `CODE_SIGNING_ALLOWED=NO`. Zipping that `.app` into
`Payload/Expo Go.app` gives you a structurally valid `.ipa`. GitHub-hosted
macOS runners are free and unmetered **on public repositories** — the catch
that actually matters is below.

**Installing it: yes, with real feature loss.** Sideloadly re-signs the IPA
with a free/personal-team Apple ID. Expo Go's real entitlements file
(`Exponent.entitlements`) requests Push Notifications, Sign In with Apple,
Associated Domains (universal links to `expo.dev`/`exp.host`), and iCloud —
**none of which a free Apple ID can grant** (that's an Apple Developer
Program restriction, not a bug in this pipeline). We build with
`CODE_SIGN_ENTITLEMENTS=""` specifically so nothing tries to bake those
requests into the binary; Sideloadly then signs with whatever minimal
entitlement set its own free provisioning profile supports. The **core
function of Expo Go — scanning a QR code / entering a dev-server URL and
running your JS bundle through Metro — does not depend on any of those
entitlements** and works normally. What breaks is listed under
[Limitations](#limitations-after-a-free-apple-id-resign).

**No step in this pipeline requires a paid Apple Developer account.** If you
hit a wall that genuinely does require one, it'll be called out explicitly
in [Troubleshooting](#troubleshooting) — there isn't one currently.

**The one honest trade you're making for "free":** GitHub's standard macOS
runners are free and unlimited only on **public** repositories. On a
private repo, macOS minutes burn your monthly quota at 10× (Free plan =
2,000 min/month ≈ 200 real macOS minutes), and this build — Hermes built
from source, a large monorepo install, a full Xcode build — realistically
takes somewhere in the 60–150 minute range depending on cache state. **Make
the repo public**, or expect to pay per-minute (~$0.06/min for macOS as of
GitHub's Jan 2026 pricing) on a private one. Nothing in this repo needs to
be secret, so a public repo costs you nothing.

**A much simpler alternative exists and is worth naming honestly:** Expo Go
is distributed for free on the App Store and normally supports the current
SDK within days of release. If your goal is just "run Expo SDK 57 projects
on my iPhone" rather than "build Expo Go from source," `expo.dev/go` or the
App Store listing is far less effort. This repo is for when you specifically
need a from-source build (e.g. the App Store build hasn't caught up to SDK
57 yet, region/App-Store access issues, or you just want to do it this way).

## What we verified, and how (2026-08-15)

Every value in the workflow was checked against the live `sdk-57` branch of
`expo/expo` (commit `0d3eccbb…` as of this writing) and GitHub's runner-image
docs — nothing here is guessed:

| Item | Verified value | Source |
|---|---|---|
| SDK 57 branch | `sdk-57` (real branch, not a tag) | `git ls-remote --heads` on expo/expo |
| Runner / Xcode | `macos-26` / Xcode `26.4.1` | expo/expo's own `.github/workflows/ios-unit-tests.yml`, which builds/tests this exact `apps/expo-go/ios` code |
| Node.js | `22.14.0` | root `package.json` → `"volta": {"node": "22.14.0"}` |
| pnpm | `10` | `ios-unit-tests.yml`; compatible with `pnpm-lock.yaml`'s `lockfileVersion: '9.0'` |
| Ruby | `3.2.2` | `ios-unit-tests.yml` |
| CocoaPods | `1.16.2` | root `Gemfile` / `Gemfile.lock` |
| Fastlane | `2.232.2` (pinned, unused by this pipeline directly) | root `Gemfile.lock` |
| Xcode scheme | `Expo Go` | `apps/expo-go/ios/Exponent.xcodeproj/xcshareddata/xcschemes/Expo Go.xcscheme` |
| Bundle ID | `host.exp.Exponent` | `apps/expo-go/ios/Exponent/Supporting/Info.plist` |
| Min iOS version | `16.4` | `apps/expo-go/ios/Podfile` (`platform :ios, '16.4'`) and `project.pbxproj` (`IPHONEOS_DEPLOYMENT_TARGET`), agree |
| Build steps | plain `pnpm install` (unfiltered) at repo root, `pnpm run install:react-native-lab`, `pnpm build` in `packages/expo`, `pod install` in `apps/expo-go/ios` | `apps/expo-go/README.md` ("Building Expo Go") |
| No secrets required | confirmed | `secrets/README.md` in expo/expo |
| Entitlements that need a paid team | `aps-environment` (push), `com.apple.developer.applesignin`, `com.apple.developer.associated-domains`, iCloud keys | `apps/expo-go/ios/Exponent/Supporting/Exponent.entitlements` |
| EXShell.plist not needed | confirmed — no code in the current tree references it (`EXShellManager` class doesn't exist in this revision; only a stale mention in `apps/expo-go/ios/CONTRIBUTING.md`) | `grep -r "EXShell" apps/expo-go/ios` |
| Submodule auth | `react-native-lab/react-native` is declared via an SSH URL in `.gitmodules`; `actions/checkout` rewrites `git@github.com:` → HTTPS automatically when no `ssh-key` input is given, so no key/secret is needed | actions/checkout's own documented behavior |

## Repository structure

```
.
├── .github/
│   └── workflows/
│       └── build-expo-go-sdk57.yml   # the whole pipeline
└── README.md                          # this file
```

That's it — the workflow checks out `expo/expo` itself into a subdirectory
(`expo-src`) at build time. This repo doesn't vendor any Expo source.

## Set up the repo on Windows

Open PowerShell or Git Bash and run:

```powershell
mkdir expo-go-sdk57-builder
cd expo-go-sdk57-builder
git init
git branch -M main
```

Copy `README.md` and the `.github/workflows/build-expo-go-sdk57.yml` file
from this deliverable into that folder (keeping the same relative paths),
then:

```powershell
git add .
git commit -m "Add Expo Go SDK 57 build workflow"
```

Create a **public** GitHub repository (via github.com's "New repository"
button — leave it public so the macOS runner is free), then:

```powershell
git remote add origin https://github.com/<your-username>/expo-go-sdk57-builder.git
git push -u origin main
```

No GitHub CLI or SSH key setup is required for this — HTTPS + your browser
login (or a Personal Access Token if `git push` prompts for one) is enough.

## Run the build

1. On GitHub, open your repo → **Actions** tab.
2. GitHub may ask you to confirm you want Actions enabled on this repo (first
   time only) — click **"I understand my workflows, go ahead and enable
   them"**.
3. Click **"Build Expo Go SDK 57 (unsigned IPA for Sideloadly)"** in the left
   sidebar.
4. Click **"Run workflow"** (top right) → leave the defaults (`sdk-57`,
   `26.4.1`) unless you have a specific reason to change them → **"Run
   workflow"**.
5. Wait. Expect 60–150 minutes; the "Restore/Install" and "Build" steps
   dominate. You can close the tab — it keeps running.
6. When the run finishes (green check), open it and scroll to **Artifacts**
   at the bottom.
7. Download **`ExpoGo-SDK57-unsigned-ipa`**. It downloads as a `.zip` from
   GitHub (that's just GitHub's artifact wrapper) — unzip it once to get
   `ExpoGo-SDK57-unsigned.ipa`. Don't unzip the `.ipa` itself; Sideloadly
   wants the `.ipa` file as-is.

If the run fails, open the failed step's log first, then check the
**`failure-logs`** artifact (uploaded automatically) for the full
`xcodebuild`/`pod install` output — see [Troubleshooting](#troubleshooting).

## Install with Sideloadly (Windows)

1. Install [Sideloadly](https://sideloadly.io/) if you haven't already, and
   plug your iPhone 13 into your PC with a USB cable. Unlock it and tap
   **Trust This Computer** if prompted.
2. Open Sideloadly. Confirm it detects your iPhone in the device dropdown.
3. Drag `ExpoGo-SDK57-unsigned.ipa` into the Sideloadly window (or click the
   IPA field and browse to it).
4. In the **Apple ID** field, enter your regular, free Apple ID email — not
   an App-Specific Password field unless Sideloadly's current version asks
   for one for 2FA (it will prompt you directly; Sideloadly does not need
   you to type anything into this repo/GitHub).
5. Click **Start**. Sideloadly will ask you to sign in via a browser/webview
   the first time (this is between you and Apple directly — nothing here
   stores or sees your Apple ID password).
6. Wait for "Installation successful."
7. On the iPhone: **Settings → General → VPN & Device Management** (may show
   as "Profiles & Device Management" depending on iOS version) → tap your
   Apple ID under **Developer App** → **Trust "<your Apple ID>"** → confirm.
8. Launch **Expo Go** from the Home Screen.

### Free Apple ID signing expiration

Apps signed with a free/personal-team Apple ID stop launching after **7
days** (Apple's restriction, not Sideloadly's). To refresh: open Sideloadly,
re-drag the same `.ipa`, click Start again — no need to re-run the GitHub
Actions build unless you actually want a newer SDK-57 patch build.
Sideloadly also has a "auto-refresh over Wi-Fi" feature in some versions;
check its own docs if you want that automated.

A free Apple ID is also limited by Apple to **3 actively-signed apps at a
time** and **10 App ID registrations per 7-day rolling window**. If
Sideloadly errors with something like "maximum number of apps" or "maximum
number of App IDs created," that's this Apple-side limit, not a build
problem — remove/free up a slot on
[appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → or
just wait out the 7-day window.

## Limitations after a free-Apple-ID resign

Because a personal/free Apple Developer team can't be granted these
capabilities, they're stripped/unusable no matter how the IPA was built:

- **Push notifications** — Expo Go's "send yourself a test push" and remote
  push testing won't work (needs `aps-environment`, paid-team only).
- **Sign In with Apple** — unavailable in Expo Go's own account screen.
- **Universal links** (`https://expo.dev/...` / `https://exp.host/...`
  opening directly in the app) — unavailable (needs Associated Domains,
  paid-team only). The `exp://` custom URL scheme (what QR-code scanning and
  "Open in Expo Go" links actually use day-to-day) is **not affected** — it's
  a plain custom scheme, not an entitlement.
- **iCloud-backed features**, if any are used internally by the client, are
  unavailable.

**What does work:** scanning a QR code or typing a `exp://` dev-server URL,
loading and running your SDK 57 JS bundle via Metro, the in-app dev menu,
fast refresh, and all standard Expo SDK 57 module functionality inside a
running project — i.e., the actual point of Expo Go for day-to-day
development.

## Troubleshooting

**Xcode version mismatch**
GitHub rotates the default/available Xcode versions on the `macos-26` image
every few weeks (the workflow pins `26.4.1` because that's what expo/expo's
own CI used as of 2026-08-15). If the "Select Xcode" step logs a
`::warning::…was not found`, open the run log for that step, note the
`Available versions:` list it prints, and re-run the workflow with the
`xcode_version` input set to one of those. As long as it's an Xcode 26.x
with an iOS 26 SDK, the build should behave the same.

**CocoaPods failure (`pod install` errors)**
Check the `failure-logs` artifact's `pod-install.log`. Common causes:
a transient CDN/trunk fetch failure (just re-run the job — CocoaPods trunk
occasionally has hiccups), or `expo/bin/autolinking` failing because the
"Build the `expo` package" step didn't run first (it must run before `pod
install`, and it does in this workflow — if you've edited the workflow,
keep that order).

**Node/pnpm mismatch**
If `pnpm install` fails with an "unsupported engine" or lockfile-version
error, expo/expo has likely bumped its pinned Node/pnpm versions since
2026-08-15. Open `package.json`'s `volta.node` field and
`.github/workflows/ios-unit-tests.yml`'s `pnpm/action-setup` version on the
current `sdk-57` branch and update the two `Set up Node.js` / `Set up pnpm`
steps here to match.

**Expo Go dependency failure (during `pnpm install` or `pnpm build`)**
Re-run once — native-module postinstall/build steps (`sharp`,
`better-sqlite3`, `@shopify/react-native-skia`) occasionally fail on first
try if a registry request times out. If it persists, open the full log and
check whether the failing package is one of pnpm-workspace.yaml's
`onlyBuiltDependencies` — if expo/expo added a new one, pnpm should still
build it automatically; this list only affects which packages are *allowed*
to run build scripts, not whether they run.

**Missing environment variables**
This pipeline needs none set as GitHub Secrets. If a step complains about a
missing env var, check whether expo/expo's `apps/expo-go/ios/Podfile` or
`Build-Phases/generate-dynamic-macros.sh` changed on `sdk-57` since
2026-08-15 and now expects something new — re-check those two files.

**Signing errors during the `xcodebuild` step**
Should not happen — the build step explicitly sets
`CODE_SIGNING_ALLOWED=NO`. If you see a signing error anyway, something
upstream in expo/expo's project settings started requiring signing even
when disabled (rare, but Xcode/Apple do occasionally tighten this). Check
whether a *new* Xcode-level "Automatically manage signing" toggle or a
`.xcconfig` change on `sdk-57` is forcing it, and add the corresponding
override flag to the `xcodebuild` invocation.

**Architecture mismatch (simulator build instead of device)**
The "Find and verify the .app bundle" step runs `lipo -info` and prints the
Mach-O load commands specifically so this is caught immediately in the logs
— if it doesn't say `arm64` (device), and instead built for a simulator, the
most likely cause is `-sdk` or `-destination` having been changed away from
`iphoneos` / `generic/platform=iOS`.

**"iOS 26 launch crash" after install**
First, isolate whether it's actually iOS-26-specific or a Sideloadly resign
issue: check the device's crash log (**Settings → Privacy & Security →
Analytics & Improvements → Analytics Data**, look for `Expo Go`). If the
crash is in Firebase/Crashlytics initialization, check that
`GoogleService-Info.plist` was generated in the build logs (the "Generate
EXBuildConstants.plist / GoogleService-Info.plist" step prints its
presence) — a missing or malformed one is the most likely cause of an
early launch crash, not iOS 26 itself (SDK 57 is built with the iOS 26 SDK,
so basic compatibility is expected).

**Expo Go cannot connect to Metro**
This is a networking/dev-workflow issue, not a build issue: make sure your
computer running `npx expo start` and the iPhone are on the same Wi-Fi
network (or use `--tunnel`), and that any firewall on the dev machine allows
inbound connections on Metro's port. A free-Apple-ID resign does not affect
local networking permissions.

**Free Apple signing expiration**
See [above](#free-apple-id-signing-expiration) — re-sideload, don't
re-build, unless you want a newer commit.

## Assumptions that could affect whether the IPA works

- **`sdk-57` stays a moving branch.** By default the workflow builds
  whatever is currently at the tip of `sdk-57`, matching your stated goal
  of "the latest Expo Go for SDK 57." Set the `expo_ref` input to a specific
  commit SHA (e.g. `0d3eccbbe5d0344dbe112f0eeecd061b3959add7`, the commit
  verified while writing this) if you need an exact, reproducible build
  instead.
- **`macos-26` / Xcode `26.4.1` availability drifts over time** — see
  Troubleshooting above.
- **`ruby/setup-ruby`'s `working-directory: expo-src` + the job-level
  `BUNDLE_GEMFILE` env var together** are what let `bundle exec pod
  install` work correctly from `apps/expo-go/ios` even though the Gemfile
  lives at the monorepo root — if you restructure the workflow's working
  directories, keep both in sync.
- **We did not need, and did not add, any GitHub Secrets.** If a future
  `sdk-57` change makes the build fail with a message implying it needs an
  Expo access token, re-read `secrets/README.md` in expo/expo before adding
  one — as of this writing, none is required for a source build, and the
  message text plus `template-files/keys.json`'s existence in the repo are
  strong signals it's still optional.
- **Free-Apple-ID entitlement limitations are an Apple policy, not a build
  defect** — they'll be present in *any* Expo Go build you sideload this
  way, including ones from other sources, unless you pay for the Apple
  Developer Program.
