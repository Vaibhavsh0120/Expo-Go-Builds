## Expo SDK 58

**Upstream SDK release:** 2026-10-15 · [Official Expo release notes](https://expo.dev/changelog/sdk-58)

Expo Go for projects targeting **Expo SDK 58**, based on the React Native
0.88 and React 19.3 release families. SDK 58 adds a shared launch-URL
contract for Expo Go and development builds, document scanning APIs, and
further native UI improvements. Its upstream iOS 27 features can depend
on a newer toolchain or a development build; this IPA does not imply that
every feature in Expo's announcement is available.

### This iOS package

- **Minimum iOS:** 16.4. **Architecture:** arm64, physical iPhone/iPad.
- **Download:** `ExpoGo-SDK58-unsigned.ipa` in this release's **Assets**.
- **Signing:** unsigned; sign locally with Sideloadly, SideStore, or another
  compatible signing tool before installing.
- **Compatibility:** use with SDK 58 projects. Additional native modules
  outside Expo Go's module set require a development build.

The builder uses the `sdk-58` branch with Node 24, pnpm 12.2.1, and Expo's
React Native codegen/Hermes setup. The build details below identify the
actual Xcode and source commit. A successful build does not establish
real-device testing.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/IPA_SIGNING.md)
· [Build settings and verification](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/SDK_SUPPORT.md)
