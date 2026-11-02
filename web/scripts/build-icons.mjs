import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../public/images/hero-dark.webp', import.meta.url));
const output = name => fileURLToPath(new URL('../public/' + name, import.meta.url));
const background = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="56" fill="#111214"/></svg>');
const artwork = await sharp(source).trim().resize(228, 228, { fit: 'inside' }).png().toBuffer();
const icon = await sharp(background).composite([{ input: artwork, gravity: 'centre' }]).png().toBuffer();

for (const [size, name] of [[32, 'favicon-32.png'], [64, 'favicon-64.png'], [180, 'apple-touch-icon.png']]) {
  await sharp(icon).resize(size, size).png().toFile(output(name));
}

// PNG-backed ICO entries provide the browser's conventional /favicon.ico fallback.
const frames = await Promise.all([16, 32, 64].map(size => sharp(icon).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = header[entry + 1] = [16, 32, 64][index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(output('favicon.ico'), Buffer.concat([header, ...frames]));
