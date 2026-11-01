## Expo SDK 52

**Upstream SDK release:** 2024-11-12 · [Official Expo release notes](https://expo.dev/changelog/2024-11-12-sdk-52)

Expo Go for projects targeting **Expo SDK 52**, using the React Native
0.76 and React 18.3 release families. This SDK introduced the New
Architecture by default for new projects and the stable `expo-video`
library. Expo Go itself supports the New Architecture only.

### Downloads

- **iOS:** `ExpoGo-SDK52-unsigned.ipa`, for physical iPhone/iPad on iOS
  15.1 or later. This community IPA requires local signing or a configured
  LiveContainer installation.
- **Android:** `ExpoGo-SDK52.apk`, the original Expo-signed APK mirrored
  without rebuilding or re-signing. Open it on Android to install; its
  verified receipt records the actual minimum Android API and signature.
- **Compatibility:** select SDK 52 for SDK 52 projects. Custom native
  modules outside Expo Go require a development build.

The iOS builder uses `sdk-52`, Yarn Classic, and the older expotools plist
generator. Expo Go's app version for this SDK uses the historical `2.32.x`
scheme, rather than beginning with `52`. Platform app versions can differ.
Only assets actually present under **Assets** are published downloads.
Build provenance and APK verification receipts are attached when available;
their presence does not establish real-device launch testing.

[Signing instructions](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/IPA_SIGNING.md)
· [Build settings and verification](https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/blob/main/docs/SDK_SUPPORT.md)
