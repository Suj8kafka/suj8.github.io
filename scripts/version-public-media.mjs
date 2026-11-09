import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Run after replacing public images/fonts, then regenerate critical styles.
// Content versions let the browser safely keep an asset across site releases.
const files = ['index.html', 'assets/css/site.css', 'assets/css/secondary-fonts.css'];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const updated = source.replace(/(?:assets\/(?:images|fonts)\/|\.\.\/fonts\/)[\w./% -]+?\.(?:webp|png|jpe?g|svg|woff2)(?:\?v=[\w.-]+)?/g, url => {
    const path = url.split('?')[0];
    const localPath = decodeURIComponent(path.replace(/^\.\.\/fonts\//, 'assets/fonts/'));
    const version = createHash('sha256').update(readFileSync(localPath)).digest('hex').slice(0, 12);
    return `${path}?v=${version}`;
  });
  if (process.argv.includes('--check')) {
    if (updated !== source) throw new Error(`Media versions are stale in ${file}. Run node scripts/version-public-media.mjs.`);
  } else if (updated !== source) writeFileSync(file, updated);
}
console.log(`Public image/font versions ${process.argv.includes('--check') ? 'verified' : 'updated'}.`);
