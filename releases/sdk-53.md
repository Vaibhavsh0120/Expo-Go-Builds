## Expo SDK 53

**Upstream SDK release:** 2025-04-30 · [Official Expo release notes](https://expo.dev/changelog/sdk-53)

Expo Go for projects targeting **Expo SDK 53**, using the React Native
0.79 and React 19.0 release families. SDK 53 enabled the New Architecture
by default across projects, made `expo-audio` stable, and enabled
edge-to-edge display in Expo Go on Android.

### Downloads

- **iOS:** `ExpoGo-SDK53-unsigned.ipa`, for physical iPhone/iPad on iOS
  15.1 or later. This community IPA requires local signing or a configured
  LiveContainer installation.
- **Android:** `ExpoGo-SDK53.apk`, the original Expo-signed APK mirrored
  without rebuilding or re-signing. Open it on Android to install; its
  verified receipt records the actual minimum Android API and signature.
- **Compatibility:** select SDK 53 for SDK 53 projects. Custom native
  modules outside Expo Go require a development build.

The iOS builder uses `sdk-53`, Yarn Classic, and the older expotools plist
generator. Expo Go's app version for this SDK uses the historical `2.33.x`
scheme, rather than beginning with `53`. Platform app versions can differ.
Only assets actually present under **Assets** are published downloads.
Build provenance and APK verification receipts are attached when available;
their presence does not establish real-device launch testing.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-Builds/blob/main/docs/IPA_SIGNING.md)
· [Build settings and verification](https://github.com/Vaibhavsh0120/Expo-Go-Builds/blob/main/docs/SDK_SUPPORT.md)
