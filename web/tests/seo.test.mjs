import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sdkPages, homeGraph, sdkGraph } from '../src/lib/seo.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));
const catalog = read('catalog');
const android = read('android');

test('only SDKs with validated published files get crawlable landing pages', () => {
  const pages = sdkPages(catalog, android);
  assert.deepEqual(pages.map(page => page.sdk), [58,57,56,55,54,53,52]);
  assert.deepEqual(sdkPages({apps:[]}, {builds:[]}), []);
  assert.ok(pages.every(page => page.path === `/sdk/${page.sdk}/` && page.ios && page.android));
  const bad = structuredClone(android);
  bad.builds.forEach(build => { build.signatureVerified = false; });
  assert.deepEqual(sdkPages({apps:[]}, bad), []);
});

test('search metadata preserves the real platform versions and independent site identity', () => {
  const page = sdkPages(catalog, android).find(page => page.sdk === 52);
  const canonical = new URL('https://expo-go-builds.vercel.app/sdk/52/');
  const graph = sdkGraph(canonical, 'SDK 52', 'SDK 52 downloads', page)['@graph'];
  assert.equal(graph[0].name, 'Expo Go Builds');
  assert.equal(graph[1].url, canonical.href);
  assert.equal(graph[1].mainEntity[0].softwareVersion, page.ios.version);
  assert.equal(graph[1].mainEntity[1].downloadUrl, page.android.downloadURL);
  assert.equal(graph[2].itemListElement[0].item, 'https://expo-go-builds.vercel.app/');
  assert.ok(!JSON.stringify(graph).includes('aggregateRating'));
});

test('homepage structured data lists only supplied downloads and points to the canonical site', () => {
  const canonical = new URL('https://expo-go-builds.vercel.app/');
  const page = sdkPages(catalog, android)[0];
  const graph = homeGraph(canonical, 'Downloads', 'Choose your SDK', [{...page.ios, os:'iOS'}])['@graph'];
  assert.equal(graph[0]['@id'], canonical.href + '#website');
  assert.equal(graph[1].mainEntity.itemListElement.length, 1);
  assert.equal(graph[1].mainEntity.itemListElement[0].item.downloadUrl, page.ios.downloadURL);
});
