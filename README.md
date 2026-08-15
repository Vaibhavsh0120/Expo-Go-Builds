# Expo Go SDK 57 — GitHub Actions Build Wrapper

This repository contains a GitHub Actions workflow that builds **Expo Go SDK 57**
from official Expo source code on a macOS runner, producing an **unsigned ARM64 IPA**
that you can then install on your iPhone using **Sideloadly** with a free Apple ID.

## ⚡ Quick Start

```
1.  Fork or push this repo to your GitHub account
2.  Go to Actions → "Build Expo Go SDK 57 (unsigned IPA for Sideloadly)"
3.  Click "Run workflow" → "Run workflow"
4.  Wait ~60-120 minutes for the build to complete
5.  Download the IPA from the Artifacts section of the completed run
6.  Install with Sideloadly on Windows
```

## 📋 Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── build-expo-go-sdk57.yml   ← Main build workflow
└── README.md
```

## 🔑 What the Workflow Does

| Step | Action |
|------|--------|
| Clone | Clones `expo/expo` branch `sdk-57` with submodules |
| Node | Sets up Node 20 |
| pnpm | Installs JS deps via pnpm |
| CocoaPods | Runs `pod install` |
| Build | Runs `xcodebuild` for `iphoneos` (physical ARM64), no signing |
| Package | Packages `.app` → `Payload/` → `.ipa` (ZIP) |
| Upload | Uploads IPA as workflow artifact |

## ⚠️ Limitations

See the full guide in GUIDE.md for details on what works and what doesn't
after sideloading with a free Apple ID.

Key restrictions after free-Apple-ID signing via Sideloadly:

- **Push notifications will NOT work** (requires Apple Developer entitlement)
- **Universal Links / Associated Domains will NOT work** (restricted entitlement)
- **Sign In with Apple will NOT work** (restricted entitlement)
- **The app WILL work** for developing/previewing Expo SDK 57 projects locally via Metro
- **App expires in 7 days** (free Apple ID signing limit) — reinstall to refresh

## 🔧 Troubleshooting

See GUIDE.md — Troubleshooting section.
