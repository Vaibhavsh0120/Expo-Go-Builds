## Expo SDK 57

**Upstream SDK release:** 2026-06-30 · [Official Expo release notes](https://expo.dev/changelog/sdk-57)

Expo Go for projects targeting **Expo SDK 57**, based on the React Native
0.86 and React 19.2 release families. SDK 57 is a focused upgrade from SDK
56. Its later React Native 0.86.3 update resolves the Hermes V1 memory and
development-startup regressions described in Expo's release notes. Check
the exact source commit below; older SDK 57 artifacts can predate that fix.

### This iOS package

- **Minimum iOS:** 16.4. **Architecture:** arm64, physical iPhone/iPad.
- **Download:** `ExpoGo-SDK57-unsigned.ipa` in this release's **Assets**.
- **Signing:** unsigned; sign locally with Sideloadly, SideStore, or another
  compatible signing tool before installing.
- **Compatibility:** use with SDK 57 projects. Additional native modules
  outside Expo Go's module set require a development build.

SDK 57 is the builder's default selection. The owner reported successful
device use of an earlier SDK 57 build through SideStore/LiveContainer;
that report does not verify every later artifact.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/IPA_SIGNING.md)
· [Build and device evidence](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/SDK_57.md)
