# Install the iOS IPA

Download the IPA for your project's SDK from [GitHub Releases](https://github.com/Vaibhavsh0120/Expo-Go-Builds/releases) or the [website](https://expo-go-builds.vercel.app). These are compiled, unsigned device builds: tapping the IPA alone does not install it.

## Choose an installation tool

| Tool | Best fit | Official website and setup |
|---|---|---|
| **SideStore** | Install and refresh IPAs on your iPhone or iPad after initial computer setup. | [Get SideStore](https://sidestore.io/) · [Setup guide](https://docs.sidestore.io/docs/installation/prerequisites) |
| **AltStore Classic** | Use AltServer on a Mac or Windows PC, then import the IPA into AltStore Classic. | [Get AltStore Classic / AltServer](https://altstore.io/) · [Official guide](https://faq.altstore.io/altstore-classic/your-altstore) |
| **LiveContainer** | Keep separate SDK entries in one source and run imported apps inside LiveContainer. | [Install LiveContainer](https://livecontainer.github.io/docs/installation) · [Add this project's source](LIVECONTAINER.md) |
| **Sideloadly** | Sign and install the Expo Go IPA from Windows or macOS. | [Get Sideloadly](https://sideloadly.io/) |
| **iloader** | Import an IPA from Windows, macOS or Linux; also helps set up SideStore and LiveContainer + SideStore. | [Get iloader](https://iloader.app/) · [Official instructions](https://github.com/nab138/iloader#how-to-use) |
| **TrollStore** | Permanent IPA installation on specific older iOS versions only. | [Official project and compatibility](https://github.com/opa334/TrollStore) |

Choose **AltStore Classic** for importing this IPA; the AltStore homepage also offers PAL. Follow each tool's current official setup instructions rather than downloading unofficial copies.

## SideStore or AltStore Classic

1. Install the tool using its official guide above.
2. Download `ExpoGo-SDKN-unsigned.ipa` for the SDK your project uses.
3. Open the tool's **My Apps** screen, tap **+**, and select the IPA. Complete signing in that tool.
4. Keep its refresh method configured so the signed app remains usable.

SideStore needs its documented on-device VPN and Wi-Fi for installation and refreshing. AltStore Classic uses AltServer; follow the official guide for your computer and device.

## LiveContainer

1. [Set up LiveContainer using its official installation guide](https://livecontainer.github.io/docs/installation).
2. Open **LiveContainer → Sources → +** and add:

```text
https://raw.githubusercontent.com/Vaibhavsh0120/Expo-Go-Builds/main/apps.json
```

3. Choose the separate Expo Go SDK entry matching your project and install it inside LiveContainer.

LiveContainer's own setup and certificate requirements still apply. Its official guide excludes Sideloadly as a method for installing the LiveContainer host; use a method that guide supports. Sideloadly remains an option for installing the **Expo Go IPA directly**.

All SDKs share Expo Go's bundle identifier. Use LiveContainer's duplicate controls when keeping several SDKs; a conventional installation can replace an existing Expo Go app.

## Sideloadly

1. [Install Sideloadly](https://sideloadly.io/) on Windows or macOS and complete its prerequisites.
2. Connect your iPhone or iPad, then load the downloaded Expo Go IPA.
3. Supply your Apple Account through Sideloadly and start signing/installing.
4. Configure its refresh feature or re-sign the same IPA when needed. A refresh does not require rebuilding Expo Go.

## iloader

1. [Download iloader](https://iloader.app/) for Windows, macOS or Linux and complete its prerequisites.
2. Connect your device, trust the computer when prompted, and sign in through iloader.
3. Choose the IPA import/install action and select the Expo Go IPA for your project's SDK. Alternatively, use iloader to set up SideStore or LiveContainer + SideStore, then follow the matching section above.

The tool is free. Apple Account signing and refresh limits still apply to conventionally installed apps.

## TrollStore: compatible older iOS only

[TrollStore](https://github.com/opa334/TrollStore) can install IPAs without recurring re-signing on its supported iOS versions: **14.0 beta 2–16.6.1, 16.7 RC (20H18), and 17.0**. Its current method does not support final iOS 16.7.x or iOS 17.0.1 and later.

Check your exact iOS version against the official project, follow the installation guide it links, then open your downloaded Expo Go IPA in TrollStore. Your chosen Expo SDK must also support that iOS version; these builds require at least iOS 15.1 or 16.4 depending on SDK.

## Certificate-based alternatives

[Feather](https://github.com/claration/feather) is a free on-device signing app that requires a developer signing certificate. Certificate availability and costs are separate from the app being free. Check its prerequisites before choosing it.

## Signing and device settings

This repository and its GitHub Actions never request your Apple Account password, verification codes, certificates or private keys. Signing happens through your chosen tool, which communicates with the services its official guide describes.

Free Apple Account signing normally expires after seven days and has app/App ID limits. Follow your tool's refresh instructions. Supported entitlements and account limits depend on Apple's provisioning and the tool; a free signature does not grant every upstream Expo entitlement.

If iOS asks, trust the developer under **Settings → General → VPN & Device Management**. Enable Developer Mode when your tool or iOS requests it. Use the selected SDK's displayed minimum iOS version.

## What to expect

The CI build produces an unsigned IPA without an Apple signing identity. A sideloading tool supplies a suitable signature, or LiveContainer runs the imported app within its configured host.

Push notifications, account features, universal links and other entitlement-dependent behavior may differ from the official App Store client. Build, hash and browser checks do not prove physical-device installation or every runtime feature. SDK-specific evidence is recorded in [SDK support](SDK_SUPPORT.md#build-and-device-evidence).

To update an SDK, download its newer release and import it with the same tool. To switch SDKs, choose the version matching the `expo` dependency in your project's `package.json`.
