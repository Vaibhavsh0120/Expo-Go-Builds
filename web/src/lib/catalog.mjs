export const SOURCE_URL = 'https://raw.githubusercontent.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/main/apps.json';
export const ANDROID_URL = 'https://raw.githubusercontent.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/main/android.json';
export const REPOSITORY_URL = 'https://github.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder';
export const SDK_CHOICES = [52, 53, 54, 55, 56, 57, 58];

/** Accept only real published release assets from this repository. */
export function readCatalog(value) {
  if (!value || !Array.isArray(value.apps)) return [];
  const seen = new Set();
  return value.apps.flatMap((app) => {
    const name = typeof app?.name === 'string' ? app.name : '';
    const sdk = Number(name.match(/\bSDK\s*(\d+)\b/i)?.[1]);
    const version = app?.versions?.[0];
    const downloadURL = version?.downloadURL || app?.downloadURL;
    const minOSVersion = version?.minOSVersion;
    if (!SDK_CHOICES.includes(sdk) || seen.has(sdk) || !/^\d+(\.\d+){1,2}$/.test(minOSVersion || '')) return [];
    try {
      const url = new URL(downloadURL);
      if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/download/') || !url.pathname.endsWith('.ipa') || url.username || url.password) return [];
    } catch { return []; }
    seen.add(sdk);
    return [{ sdk, version: String(version?.version || app.version || ''), minOSVersion, downloadURL, size: Number(version?.size || app.size) || 0, sha256: /^[a-f0-9]{64}$/i.test(version?.sha256 || '') ? version.sha256 : '', date: version?.date || app.versionDate || '' }];
  }).sort((a, b) => b.sdk - a.sdk);
}

export function liveContainerURL() {
  return `livecontainer://source?url=${encodeURIComponent(SOURCE_URL)}`;
}

export function readAndroidCatalog(value) {
  if (!value || !Array.isArray(value.builds)) return [];
  const seen = new Set();
  return value.builds.flatMap((build) => {
    if (!build || !SDK_CHOICES.includes(build.sdk) || seen.has(build.sdk) || build.signatureVerified !== true || build.packageName !== 'host.exp.exponent' || !Number.isInteger(build.minSdkVersion) || !/^[a-f0-9]{64}$/i.test(build.sha256 || '')) return [];
    try {
      const url = new URL(build.downloadURL);
      if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/releases/download/') || !url.pathname.endsWith(`/ExpoGo-SDK${build.sdk}.apk`) || url.username || url.password) return [];
    } catch { return []; }
    seen.add(build.sdk);
    const androidVersions = {24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1', 28: '9', 29: '10', 30: '11', 31: '12', 33: '13', 34: '14', 35: '15', 36: '16'};
    return [{ sdk: build.sdk, version: String(build.version), minOSVersion: androidVersions[build.minSdkVersion] || `API ${build.minSdkVersion}`, downloadURL: build.downloadURL, size: build.size, sha256: build.sha256, date: build.date, releaseURL: build.releaseURL }];
  }).sort((a,b) => b.sdk-a.sdk);
}

export function formatSize(bytes) {
  return bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '';
}
