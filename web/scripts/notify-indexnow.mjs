import { readFile } from 'node:fs/promises';

// IndexNow's ownership key is intentionally hosted publicly, not an account credential.
const { host, key } = JSON.parse(await readFile(new URL('../src/data/indexnow.json', import.meta.url), 'utf8'));
const origin = `https://${host}`;
const keyLocation = `${origin}/${key}.txt`;
const ownership = await fetch(keyLocation);
if (!ownership.ok || (await ownership.text()).trim() !== key) throw new Error('Deploy the ownership file before notifying IndexNow.');
const sitemap = await fetch(`${origin}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`Sitemap unavailable: HTTP ${sitemap.status}`);
const urlList = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
if (!urlList.length || urlList.some(url => new URL(url).origin !== origin)) throw new Error('Only canonical URLs from this production site can be submitted.');
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});
if (![200, 202].includes(response.status)) throw new Error(`IndexNow rejected the notification: HTTP ${response.status} ${await response.text()}`);
console.log(`IndexNow received ${urlList.length} URLs (HTTP ${response.status}). This confirms receipt, not search indexing or ranking.`);
