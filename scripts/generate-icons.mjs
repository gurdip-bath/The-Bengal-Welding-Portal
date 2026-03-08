import sharp from 'sharp';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_URL = 'https://bengalwelding.co.uk/wp-content/uploads/2025/08/PNG-LOGO.png';
const SIZES = [180, 192, 512];
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

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

  for (const size of SIZES) {
    const outputPath = path.join(PUBLIC_DIR, `icon-${size}.png`);
    await sharp(logoBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
      .then((resized) =>
        sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 1 },
          },
        })
          .composite([{ input: resized, gravity: 'center' }])
          .png()
          .toFile(outputPath)
      );
    console.log(`Created icon-${size}.png`);
  }
  console.log('Done!');
}

main().catch(console.error);
