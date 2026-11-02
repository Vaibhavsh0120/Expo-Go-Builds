import test from 'node:test';
import assert from 'node:assert/strict';
import { readCatalog, readAndroidCatalog, SOURCE_URL, liveContainerURL } from '../src/lib/catalog.mjs';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url)));

test('published SDKs map to their own real release asset and OS requirement', () => {
  const builds = readCatalog(catalog);
  assert.ok(builds.length > 0);
  for (const build of builds) {
    assert.match(build.downloadURL, new RegExp(`SDK${build.sdk}.*\\.ipa$`));
    assert.match(build.minOSVersion, /^\d+\.\d+/);
  }
  assert.equal(builds[0].sdk, Math.max(...builds.map((build) => build.sdk)));
});
test('malformed, unpublished and untrusted downloads are never advertised', () => {
  assert.deepEqual(readCatalog(null), []);
  assert.deepEqual(readCatalog({ apps: [] }), []);
  assert.deepEqual(readCatalog({ apps: [null, 42, { name: 58 }, { name: 'SDK 54' }] }), []);
  const app = structuredClone(catalog.apps[0]);
  app.versions[0].downloadURL = 'https://evil.example/download.ipa';
  assert.deepEqual(readCatalog({ apps: [app] }), []);
  app.versions[0].downloadURL = 'javascript:alert(1)';
  assert.deepEqual(readCatalog({ apps: [app] }), []);
  delete app.versions[0].minOSVersion;
  assert.deepEqual(readCatalog({ apps: [app] }), []);
});
test('one source URL opens the separate SDK catalog in LiveContainer', () => {
  const url = new URL(liveContainerURL());
  assert.equal(url.protocol, 'livecontainer:');
  assert.equal(url.hostname, 'source');
  assert.equal(url.searchParams.get('url'), SOURCE_URL);
});

test('Android download requires verified signature and the matching SDK APK', () => {
  const build = {sdk: 52, version:'2.32.19', signatureVerified:true, packageName:'host.exp.exponent', minSdkVersion:24, sha256:'a'.repeat(64), downloadURL:'https://github.com/Vaibhavsh0120/Expo-Go-Builds/releases/download/expo-go-sdk52-test/ExpoGo-SDK52.apk'};
  assert.equal(readAndroidCatalog({builds:[build]})[0].minOSVersion,'7.0');
  assert.deepEqual(readAndroidCatalog({builds:[{...build,signatureVerified:false}]}),[]);
  assert.deepEqual(readAndroidCatalog({builds:[{...build,sdk:53}]}),[]);
});

test('repository rename accepts both owned download paths and rejects lookalikes', () => {
  for (const repo of ['Expo-Go-Builds', 'Expo-Go-IOS-IPA-Builder']) {
    const app = structuredClone(catalog.apps[0]);
    app.versions[0].downloadURL = app.versions[0].downloadURL.replace('Expo-Go-Builds', repo);
    assert.equal(readCatalog({ apps: [app] }).length, 1);
    const apk = {sdk:52, version:'2.32.19', signatureVerified:true, packageName:'host.exp.exponent', minSdkVersion:24, sha256:'a'.repeat(64), downloadURL:`https://github.com/Vaibhavsh0120/${repo}/releases/download/expo-go-sdk52-test/ExpoGo-SDK52.apk`};
    assert.equal(readAndroidCatalog({builds:[apk]}).length, 1);
    assert.deepEqual(readAndroidCatalog({builds:[{...apk,downloadURL:apk.downloadURL.replace(repo,repo+'-other')}]}), []);
  }
});
