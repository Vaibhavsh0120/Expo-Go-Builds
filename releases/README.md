# Expo Go SDK release notes

Download IPAs from [GitHub Releases](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases).
Choose the SDK matching your project, then download its `.ipa` under **Assets**.
All IPAs require local signing before installation.

## SDK release order

These dates are Expo's original SDK release dates. Community IPA build
and publication dates are recorded separately in each GitHub release.

| SDK | Expo release date | Notes | Minimum iOS |
|---|---|---|---|
| **58** | **2026-10-15** | [SDK 58](sdk-58.md) | 16.4 |
| **57** | **2026-06-30** | [SDK 57](sdk-57.md) | 16.4 |
| **56** | **2026-05-21** | [SDK 56](sdk-56.md) | 16.4 |
| **55** | **2026-02-25** | [SDK 55](sdk-55.md) | 15.1 |
| **54** | **2025-09-10** | [SDK 54](sdk-54.md) | 15.1 |

Each SDK note links to Expo's official announcement. The workflow attaches
the selected note after a successful build, with its exact source commit,
builder commit, Actions run, actual Xcode version, IPA size, and SHA-256.
It compares SDK numbers before marking a new build as Latest, so an older
SDK build does not automatically displace a newer published SDK.

The notes are ready for all five SDKs. Their presence does not mean all
five IPAs have already been published; the [verification table](../docs/SDK_SUPPORT.md#build-and-device-evidence)
records actual build evidence.
