## Expo SDK 56

**Upstream SDK release:** 2026-05-21 · [Official Expo release notes](https://expo.dev/changelog/sdk-56)

Expo Go for projects targeting **Expo SDK 56**, based on the React Native
0.85 and React 19.2 release families. SDK 56 stabilized Expo UI's native
APIs and raised the minimum iOS version to 16.4. Some SDK features, such
as app extensions, need a development build rather than Expo Go.

### This iOS package

- **Minimum iOS:** 16.4. **Architecture:** arm64, physical iPhone/iPad.
- **Download:** `ExpoGo-SDK56-unsigned.ipa` in this release's **Assets**.
- **Signing:** unsigned; sign locally with Sideloadly, SideStore, or another
  compatible signing tool before installing.
- **Compatibility:** use with SDK 56 projects. Additional native modules
  outside Expo Go's module set require a development build.

The builder conditionally supplies a missing `SceneGeometry.swift` utility
for an incomplete upstream backport. Expo also documents a Hermes V1
memory regression affecting worklets/Reanimated in SDK 56, resolved in
SDK 57; consult the official notes before choosing this version.
A successful build does not establish real-device testing.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/IPA_SIGNING.md)
· [Patch and build evidence](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/SDK_56.md)
