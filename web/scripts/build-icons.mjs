import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Expo brand mark from Simple Icons via Iconify; preserve its original geometry.
const source = await readFile(new URL('../src/assets/expo.svg', import.meta.url), 'utf8');
const path = source.match(/<path[^>]*\sd="([^"]+)"/)[1];
const output = name => fileURLToPath(new URL('../public/' + name, import.meta.url));
const svg = fill => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 28 28"><path fill="${fill}" d="${path}"/></svg>\n`;

for (const [theme, fill] of [['light', '#111214'], ['dark', '#f4f5f6']]) {
  const vector = svg(fill);
  await writeFile(output(`favicon-${theme}.svg`), vector);
  for (const size of [32, 64, 180]) {
    const name = size === 180 ? `apple-touch-icon-${theme}.png` : `favicon-${theme}-${size}.png`;
    await sharp(Buffer.from(vector)).resize(size, size).png().toFile(output(name));
  }

  // Transparent PNG-backed ICO frames provide native-size browser fallbacks.
  const sizes = [16, 32, 64];
  const frames = await Promise.all(sizes.map(size => sharp(Buffer.from(vector)).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  const ico = Buffer.concat([header, ...frames]);
  await writeFile(output(`favicon-${theme}.ico`), ico);
  if (theme === 'light') await writeFile(output('favicon.ico'), ico);
}

// SVG-capable browsers follow the system preference even without JavaScript.
const adaptive = svg('#111214').replace('<path', '<style>path{fill:#111214}@media(prefers-color-scheme:dark){path{fill:#f4f5f6}}</style><path');
await writeFile(output('favicon.svg'), adaptive);
