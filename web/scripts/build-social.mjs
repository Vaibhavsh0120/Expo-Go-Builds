import sharp from 'sharp';

import { fileURLToPath } from 'node:url';

const artwork = await sharp(fileURLToPath(new URL('../public/images/hero-dark.webp', import.meta.url))).resize(560, 560).toBuffer();

const title = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:Arial,Helvetica,sans-serif}</style><rect width="1200" height="630" fill="#111214"/><text x="72" y="83" fill="#e9eaec" font-size="26">Expo Go Builds</text><text x="68" y="270" fill="#f6f6f7" font-size="76" font-weight="700" letter-spacing="-4">Your SDK.</text><text x="68" y="355" fill="#f6f6f7" font-size="76" font-weight="700" letter-spacing="-4">Your phone.</text><text x="72" y="420" fill="#adafb4" font-size="23">Expo Go for the SDK your project uses.</text><text x="72" y="551" fill="#adafb4" font-size="18">iOS IPA · Android APK · SDK 52–58</text></svg>`);

await sharp(title).composite([{ input: artwork, left: 630, top: 50 }]).png().toFile(fileURLToPath(new URL('../public/social.png', import.meta.url)));

