import { readFile, writeFile } from 'node:fs/promises';
import { readCatalog, SDK_CHOICES } from '../src/lib/catalog.mjs';
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

// Reuse maintained SDK notes instead of creating a second set of release claims.
const notesTarget = new URL('../src/data/sdk-notes.json', import.meta.url);
try {
  const notes = {};
  for (const sdk of SDK_CHOICES) {
    const markdown = await readFile(new URL(`../../releases/sdk-${sdk}.md`, import.meta.url), 'utf8');
    const release = markdown.match(/\*\*Upstream SDK release:\*\* (\d{4}-\d{2}-\d{2}) · \[Official Expo release notes\]\((https:\/\/expo\.dev\/[^)]+)\)/);
    const summary = markdown.split(/\r?\n\r?\n/)[2]?.replace(/\r?\n/g, ' ').replace(/\*\*|`/g, '');
    if (!release || !summary) throw new Error(`SDK ${sdk} has incomplete release notes`);
    notes[sdk] = { date: release[1], url: release[2], summary };
  }
  await writeFile(notesTarget, JSON.stringify(notes, null, 2) + '\n');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await readFile(notesTarget, 'utf8'); // A root-less Vercel build uses the committed snapshot.
}
