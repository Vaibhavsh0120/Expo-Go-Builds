import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sdkPages } from '../src/lib/seo.mjs';
const data = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));
const pages = sdkPages(data('catalog'), data('android'));
const origin = process.env.SITE_URL || 'https://expo-go-builds.vercel.app';
const read = path => readFileSync(new URL('../dist/' + path, import.meta.url), 'utf8');
const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const expected = ['/', ...pages.map(page => page.path)].map(path => new URL(path, origin).href);
assert.deepEqual(sitemap, expected);
assert.match(read('robots.txt'), new RegExp(`Sitemap: ${new URL('/sitemap.xml', origin).href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
const titles = new Set();
for (const path of ['/', ...pages.map(page => page.path)]) {
  const html = read(path === '/' ? 'index.html' : path.slice(1) + 'index.html');
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${path}: one page title`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title && !titles.has(title), `${path}: unique title`);
  titles.add(title);
  assert.ok(html.includes(`rel="canonical" href="${new URL(path, origin).href}"`), `${path}: canonical`);
  assert.match(html, /name="description" content="[^"]{50,}/);
  assert.match(html, /name="robots" content="index,follow/);
  assert.match(html, /name="google-site-verification"/);
  // Every entry page must retain the approved artwork in both themes.
  for (const theme of ['light', 'dark']) {
    assert.ok(html.includes(`src="/images/hero-${theme}.webp"`), `${path}: ${theme} Expo artwork`);
  }
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json['@graph'][0]['@type'], 'WebSite');
  for (const page of pages) assert.ok(html.includes(`href="${page.path}"`), `${path}: SDK ${page.sdk} navigation`);
  const page = pages.find(page => page.path === path);
  if (page) for (const build of [page.ios, page.android].filter(Boolean)) {
    assert.ok(html.includes(`href="${build.downloadURL}"`), `${path}: real direct download`);
    assert.ok(html.includes(build.sha256), `${path}: published checksum`);
    assert.ok(html.includes(build.version), `${path}: real app version`);
  }
}
console.log(`SEO checks passed: ${expected.length} crawlable pages, unique metadata, sitemap, structured data and all published downloads.`);
