import { readFile, writeFile } from 'node:fs/promises';
import { readCatalog } from '../src/lib/catalog.mjs';
const source = new URL('../../apps.json', import.meta.url);
const target = new URL('../src/data/catalog.json', import.meta.url);
try {
  const text = await readFile(source, 'utf8');
  if (!readCatalog(JSON.parse(text)).length) throw new Error('Root apps.json has no valid published SDKs');
  await writeFile(target, text);
  console.log('Bundled catalog refreshed from repository apps.json.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const bundled = JSON.parse(await readFile(target, 'utf8'));
  if (!readCatalog(bundled).length) throw new Error('Bundled catalog has no valid published SDKs');
  console.log('Using checked-in catalog snapshot (repository root not available).');
}

try {
  const text = await readFile(new URL('../../android.json', import.meta.url), 'utf8');
  if (!Array.isArray(JSON.parse(text).builds)) throw new Error('Invalid Android catalog');
  await writeFile(new URL('../src/data/android.json', import.meta.url), text);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
