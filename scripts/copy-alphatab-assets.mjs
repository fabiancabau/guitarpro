import fs from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve(process.cwd(), 'node_modules/@coderline/alphatab/dist');
const targetRoot = path.resolve(process.cwd(), 'public/alphatab');

const filesToCopy = [
  ['alphaTab.mjs', 'alphaTab.mjs'],
  ['alphaTab.core.mjs', 'alphaTab.core.mjs'],
  ['alphaTab.worker.mjs', 'alphaTab.worker.mjs'],
  ['alphaTab.worklet.mjs', 'alphaTab.worklet.mjs'],
  ['font/Bravura.otf', 'font/Bravura.otf'],
  ['font/Bravura.woff2', 'font/Bravura.woff2'],
  ['soundfont/sonivox.sf2', 'soundfont/sonivox.sf2']
];

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function copyAssets() {
  await fs.mkdir(targetRoot, { recursive: true });

  let copied = 0;

  for (const [sourceRelative, targetRelative] of filesToCopy) {
    const sourceFile = path.join(sourceRoot, sourceRelative);
    const targetFile = path.join(targetRoot, targetRelative);

    try {
      await ensureDir(targetFile);
      await fs.copyFile(sourceFile, targetFile);
      copied += 1;
    } catch {
      // alphaTab may change its internal packaging per version; failing hard would break install.
    }
  }

  console.log(`[postinstall] alphaTab assets copied: ${copied}/${filesToCopy.length}`);
}

copyAssets().catch((error) => {
  console.error('[postinstall] Failed to copy alphaTab assets', error);
  process.exitCode = 1;
});
