// Pinned Latin WOFF2 subsets from Google Fonts; retain each family's OFL notice.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = {
  'dm-mono-400-latin.woff2': 'https://fonts.gstatic.com/s/dmmono/v16/aFTU7PB1QTsUX8KYthqQBA.woff2',
  'dm-mono-500-latin.woff2': 'https://fonts.gstatic.com/s/dmmono/v16/aFTR7PB1QTsUX8KYvumzEYOtbQ.woff2',
  'dm-sans-latin.woff2': 'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  'space-grotesk-latin.woff2': 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2',
  'DM-Mono-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmmono/OFL.txt',
  'DM-Sans-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt',
  'Space-Grotesk-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt'
};
await mkdir('assets/fonts', { recursive: true });
await Promise.all(Object.entries(files).map(async ([name, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (name.endsWith('.woff2') && bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error(`Not a WOFF2 font: ${name}`);
  await writeFile(`assets/fonts/${name}`, bytes);
  console.log(JSON.stringify({ name, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex') }));
}));
