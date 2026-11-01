# Install Expo Go from the LiveContainer source

## Add the source

1. Open **LiveContainer → Sources**.
2. Tap **+**, paste the URL below, and confirm.
3. Expand **Expo Go SDKs**.
4. Find **Expo Go SDK 54**, **55**, **56**, **57**, or **58**, matching the
   SDK your project targets, and tap **Install**.

```text
https://raw.githubusercontent.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/main/apps.json
```

Only SDKs with a published IPA are shown. A failed or unfinished build
does not create an install entry. Refresh the source after a new release.
The [GitHub Releases page](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases)
remains the direct-download option.

LiveContainer's official guide documents this flow and the optional
`livecontainer://source?url=<encoded_source_url>` deep link:
[LiveContainer Sources](https://livecontainer.github.io/docs/guides/sources).

## Choosing SDKs

LiveContainer's source view installs the first version of each app entry.
This catalog therefore lists each SDK as a separate, clearly named entry,
with the newest published IPA for that SDK. The order is newest SDK first.

All Expo Go SDKs retain their actual `host.exp.Exponent` bundle identifier.
The catalog does not invent bundle IDs or modify the IPAs. Choosing a
different SDK can prompt LiveContainer to update an existing app; use its
install/duplicate controls when retaining multiple copies. Do not assume
that all SDKs will coexist without configuring LiveContainer.

This source targets LiveContainer's source browser. Other sideloading
stores can reject duplicate bundle identifiers across app entries.

## What the source verifies

`scripts/livecontainer_source.py` selects the latest published, non-draft,
non-prerelease IPA for each supported SDK. It downloads the actual IPA,
checks its byte size and SHA-256 against GitHub's asset metadata, and
reads the package's `Info.plist` for:

- Bundle identifier.
- App and build versions.
- Minimum iOS version.

The catalog contains the verified download URL, size, hash, and release
date for each IPA. It is not tied to whichever SDK GitHub labels Latest.

The single IPA workflow refreshes `main/apps.json` after successful release
publishing, using a commit through the Contents API. It retries a
concurrent edit using a fresh release snapshot. Artifact-only builds do
not refresh the source. No additional workflow or branch is required.

## Verification limits and icon provenance

A hosted JSON response, verified IPA hashes, and a source-format check do
not establish a successful physical iPhone import or launch. Test those
inside your own LiveContainer installation. Signing depends on that
installation's configuration; these IPAs remain unsigned.

The source format and separate-entry behavior were checked against
[LiveContainer's source parser](https://github.com/LiveContainer/LiveContainer/blob/main/LiveContainerSwiftUI/Views/LCAltStoreSourcesView.swift).
The catalog icon is the unmodified Expo Go icon from
[`expo/expo` commit `004bfc41`](https://github.com/expo/expo/blob/004bfc41cfd82784da23450101015717c5da74e6/apps/expo-go/ios/Exponent/Images.xcassets/AppIcon.appiconset/icon-dark-new.png).
Expo's name and icon identify the upstream app; this builder is independent
of Expo, Apple, and LiveContainer.
