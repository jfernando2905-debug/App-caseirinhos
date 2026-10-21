import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating PWA Icons from SVG...');

  // 1. Standard 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 2. Standard 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 3. Apple Touch Icon 180x180 PNG (for iOS Safari)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 4. Maskable 512x512 PNG:
  // Android masks into circles/squircles, so essential content must be within safe zone (80%).
  // We place the resized 384x384 icon centered onto a 512x512 full-bleed background (#b45309).
  const innerIcon = await sharp(svgBuffer)
    .resize(384, 384)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 180, g: 83, b: 9, alpha: 1 }, // #b45309 brand amber background
    },
  })
    .composite([
      {
        input: innerIcon,
        top: 64,
        left: 64,
      },
    ])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png (with safe-zone padding)');

  console.log('All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
