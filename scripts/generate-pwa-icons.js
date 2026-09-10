import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

async function generateIcons() {
  const iconSvgPath = path.join(publicDir, 'icon.svg');
  const maskableSvgPath = path.join(publicDir, 'icon-maskable.svg');

  const iconSvgBuffer = fs.readFileSync(iconSvgPath);
  const maskableSvgBuffer = fs.readFileSync(maskableSvgPath);

  console.log('Generating PWA icons...');

  // 192x192 standard icon
  await sharp(iconSvgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 standard icon
  await sharp(iconSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 180x180 Apple touch icon
  await sharp(iconSvgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 64x64 favicon.png
  await sharp(iconSvgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // 512x512 maskable icon
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Successfully generated all PWA icons in /public:');
  console.log(' - pwa-192x192.png');
  console.log(' - pwa-512x512.png');
  console.log(' - apple-touch-icon.png');
  console.log(' - favicon.png');
  console.log(' - pwa-maskable-512x512.png');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
