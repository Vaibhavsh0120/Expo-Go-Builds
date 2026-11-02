## Expo SDK 55

**Upstream SDK release:** 2026-02-25 · [Official Expo release notes](https://expo.dev/changelog/sdk-55)

Expo Go for projects targeting **Expo SDK 55**, based on the React Native
0.83 and React 19.2 release families. SDK 55 moved to the New Architecture,
refreshed Expo Go, and expanded native navigation and Expo UI APIs. Some
upstream features require a development build and are not available simply
by installing Expo Go.

### This iOS package

- **Minimum iOS:** 15.1. **Architecture:** arm64, physical iPhone/iPad.
- **Download:** `ExpoGo-SDK55-unsigned.ipa` in this release's **Assets**.
- **Signing:** unsigned; sign locally with Sideloadly, SideStore, or another
  compatible signing tool before installing.
- **Compatibility:** use with SDK 55 projects. Additional native modules
  outside Expo Go's module set require a development build.

The builder uses the `sdk-55` branch, Yarn Classic, and the shell plist
generator. The build details below identify the exact artifact.
A successful build does not establish real-device testing.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-Builds/blob/main/docs/IPA_SIGNING.md)
· [Build settings and verification](https://github.com/Vaibhavsh0120/Expo-Go-Builds/blob/main/docs/SDK_SUPPORT.md)
