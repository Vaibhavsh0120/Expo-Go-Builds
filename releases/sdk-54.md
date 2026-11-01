## Expo SDK 54

**Upstream SDK release:** 2025-09-10 · [Official Expo release notes](https://expo.dev/changelog/sdk-54)

Expo Go for projects targeting **Expo SDK 54**, based on the React Native
0.81 and React 19.1 release families. SDK 54 introduced the new File System
API, improved autolinking, and Liquid Glass integration for supported
toolchains. Those are upstream SDK features; this community build's
capabilities depend on its compiled native modules and build toolchain.

### This iOS package

- **Minimum iOS:** 15.1. **Architecture:** arm64, physical iPhone/iPad.
- **Download:** `ExpoGo-SDK54-unsigned.ipa` in this release's **Assets**.
- **Signing:** unsigned; sign locally with Sideloadly, SideStore, or another
  compatible signing tool before installing.
- **Compatibility:** use with SDK 54 projects. Additional native modules
  outside Expo Go's module set require a development build.

The builder uses the `sdk-54` branch, Yarn Classic, and the older expotools
plist generator. The build details below identify the exact artifact.
A successful build does not establish real-device testing.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/IPA_SIGNING.md)
· [Build settings and verification](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/SDK_SUPPORT.md)
