# Expo Go iOS Builder

Build Expo Go iOS IPAs for SDK 56 and SDK 57 using GitHub Actions.

## What this project does

This repository compiles the real, open-source **Expo Go** iOS app from
Expo's own source code, on a free GitHub-hosted Mac, and hands you back an
**unsigned `.ipa` file**. You then sign and install it yourself with a free
tool called Sideloadly, using your own free Apple ID — no Mac of your own,
and no paid Apple Developer account, required.

## Supported SDK versions

| SDK | Status |
|-----|--------|
| 57 | ✅ Supported — built, released, and confirmed working on a real device (see [docs/SDK_57.md](docs/SDK_57.md)) |
| 56 | ✅ Supported — configuration independently verified against Expo's real `sdk-56` source (see [docs/SDK_56.md](docs/SDK_56.md)) |

## Quick Start

1. Open this repo's **Actions** tab.
2. Select **"Build Expo Go (unsigned IPA for Sideloadly)"**.
3. Click **Run workflow**.
4. Choose **SDK 56** or **SDK 57** from the dropdown.
5. Wait for the build (roughly 60–150 minutes).
6. Download the artifact from the finished run.
7. Unzip it once — you'll get a `.ipa` file. Don't unzip that part.
8. Use [Sideloadly](https://sideloadly.io/) to sign and install it on your
   iPhone/iPad.

Full walkthrough: [docs/GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md).

## Choose SDK 56 if…

- Your project hasn't been upgraded to SDK 57 yet.
- You want to test against an app still targeting SDK 56.
- You don't want to upgrade your project's Expo dependencies right now.

## Choose SDK 57 if…

- Your project already targets SDK 57.
- You want the version this repository's build has been most thoroughly
  proven against — see [docs/SDK_57.md](docs/SDK_57.md#known-working-state).

## Requirements

- A GitHub account (the repo can be free/public).
- GitHub Actions enabled on the repo (on by default for a new repo).
- A Windows, macOS, or Linux machine to download the artifact.
- [Sideloadly](https://sideloadly.io/) to sign and install the IPA.
- An iPhone or iPad.
- **A free Apple ID** — no paid Apple Developer Program membership needed
  for any step in this pipeline.

## Architecture

```
Windows developer machine
    ↓
GitHub repository
    ↓
GitHub Actions macOS runner
    ↓
Expo source (sdk-56 or sdk-57, your choice)
    ↓
Expo Go iOS workspace
    ↓
Xcode
    ↓
physical-device ARM64 build (unsigned)
    ↓
.ipa
    ↓
GitHub Actions artifact
    ↓
Sideloadly (sign with your free Apple ID)
    ↓
iPhone / iPad
```

Full diagram and explanation: [docs/BUILD_ARCHITECTURE.md](docs/BUILD_ARCHITECTURE.md).

## Releases

An **SDK 57 for iOS** IPA has already been built and uploaded to this
repository's [Releases](../../releases) page as a reference/prebuilt
example — confirmed working via SideStore and LiveContainer. Running the
workflow yourself will always build the *current* source, which may differ
from that snapshot. See [docs/SDK_57.md](docs/SDK_57.md#how-the-release-relates-to-the-github-actions-build)
for how the two relate.

The workflow itself only publishes a Release if you explicitly turn on the
`create_release` option when running it — normal runs just produce a
downloadable Actions artifact.

## Development

The entire build pipeline lives in one file:
`.github/workflows/build-expo-go.yml`. It's a single `workflow_dispatch`
workflow with an `expo_sdk` choice input — SDK-specific values (which
branch to build, how outputs are named) are resolved once, near the top,
in a step called **"Resolve SDK-specific configuration"**. Everything else
in the workflow is shared between both SDKs, because it was verified to be
identical between them (see [docs/DECISIONS.md](docs/DECISIONS.md)).

If you're an AI coding agent picking this up, **start with
[docs/AI_CONTEXT.md](docs/AI_CONTEXT.md)** — it explains what not to
change casually and why.

## Documentation

- [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) — start here if you're modifying this repo
- [docs/BUILD_ARCHITECTURE.md](docs/BUILD_ARCHITECTURE.md) — full pipeline diagram and explanation
- [docs/SDK_56.md](docs/SDK_56.md) — verified SDK 56 build configuration
- [docs/SDK_57.md](docs/SDK_57.md) — verified SDK 57 build configuration + known working state
- [docs/GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md) — how to run and interpret the workflow
- [docs/IPA_SIGNING.md](docs/IPA_SIGNING.md) — Sideloadly, free Apple ID limits, trust steps
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — common failure modes and fixes
- [docs/DECISIONS.md](docs/DECISIONS.md) — why the repo is built the way it is

## Important limitations

- **Free Apple ID signing expires after 7 days** and is capped at 3
  actively-signed apps / 10 App ID registrations per week. Re-sideloading
  (not rebuilding) refreshes an expired install. See
  [docs/IPA_SIGNING.md](docs/IPA_SIGNING.md).
- **Some entitlements are unavailable** with a free Apple ID: push
  notifications, Sign In with Apple, universal links, and iCloud-backed
  features. Core Expo Go functionality — scanning a QR code, loading your
  JS bundle via Metro, fast refresh — is not affected.
- **SDK/Expo Go version matching matters.** A project built for SDK 57
  needs an SDK-57 Expo Go build, and vice versa — see
  [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#sdk-mismatch).
- **Native modules not present in Expo Go's own module set** still won't
  work in Expo Go, regardless of how it was built — this is a general
  Expo Go constraint (you'd need a custom dev client for those), not
  something specific to this pipeline.
- **The output IPA is unsigned.** It cannot be installed as-is — it must
  be signed first (Sideloadly, or another tool that performs local
  signing). See [docs/IPA_SIGNING.md](docs/IPA_SIGNING.md).
- **SDK 56 has not yet been run through this exact GitHub Actions pipeline
  end-to-end** as of this writing — its configuration is independently
  verified from Expo's source, but not yet build-tested in CI the way SDK
  57 has been. See [docs/SDK_56.md](docs/SDK_56.md#verification-status).
