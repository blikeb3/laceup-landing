const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  const inputPath = path.join(__dirname, 'assets', 'LaceUp Logo.png');
  const outputPath = path.join(__dirname, 'public', 'favicon.ico');
  
  // Create a 32x32 PNG first (standard favicon size)
  const faviconBuffer = await sharp(inputPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toBuffer();
  
  // Save as PNG (browsers support PNG favicons well)
  await sharp(faviconBuffer)
    .toFile(path.join(__dirname, 'public', 'favicon.png'));
  
  console.log('✓ Favicon generated successfully at public/favicon.png');
  
  // Also create larger sizes for various use cases
  await sharp(inputPath)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(path.join(__dirname, 'public', 'apple-touch-icon.png'));
  
  console.log('✓ Apple touch icon generated at public/apple-touch-icon.png');
  
  await sharp(inputPath)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(path.join(__dirname, 'public', 'android-chrome-192x192.png'));
  
  console.log('✓ Android icon (192x192) generated at public/android-chrome-192x192.png');
  
  await sharp(inputPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(path.join(__dirname, 'public', 'android-chrome-512x512.png'));
  
  console.log('✓ Android icon (512x512) generated at public/android-chrome-512x512.png');
}

generateFavicon().catch(console.error);
