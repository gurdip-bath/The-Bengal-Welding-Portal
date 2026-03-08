import sharp from 'sharp';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_URL = 'https://bengalwelding.co.uk/wp-content/uploads/2025/08/PNG-LOGO.png';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Tweak these values to crop different regions of the logo.
// (left, top) = top-left corner of the crop
// width, height = size of the crop area
// Tip: use a square crop to focus on the emblem (center of logo, exclude text at bottom)
const CROP = {
  left: 0,
  top: 0,
  width: 250,    // full width
  height: 120,    // smaller height to cut off text at the bottom
};

async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching Bengal Welding logo...');
  const logoBuffer = await fetchImage(LOGO_URL);
  const meta = await sharp(logoBuffer).metadata();
  console.log('Logo dimensions:', meta.width, 'x', meta.height);

  const outPath = path.join(PUBLIC_DIR, 'test-crop.png');
  await sharp(logoBuffer)
    .extract({
      left: Math.min(CROP.left, meta.width - 1),
      top: Math.min(CROP.top, meta.height - 1),
      width: Math.min(CROP.width, meta.width - CROP.left),
      height: Math.min(CROP.height, meta.height - CROP.top),
    })
    .toFile(outPath);

  console.log('Saved test-crop.png to public/');
  console.log('');
  console.log('Open public/test-crop.png in your browser or image viewer to preview.');
  console.log('');
  console.log('To tweak: edit CROP in scripts/inspect-logo.mjs (lines 14-19), then run:');
  console.log('  node scripts/inspect-logo.mjs');
}

main().catch(console.error);
