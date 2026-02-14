/**
 * Image Optimization Script
 * Converts images to WebP format for better performance
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGE_DIRS = [
  'public/images',
];

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png'];

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return;
  }

  const dir = path.dirname(filePath);
  const filename = path.basename(filePath, ext);
  const webpPath = path.join(dir, `${filename}.webp`);

  // Skip if WebP already exists
  if (fs.existsSync(webpPath)) {
    console.log(`⏭️  Skipping ${filePath} (WebP exists)`);
    return;
  }

  try {
    await sharp(filePath)
      .webp({ quality: 85 })
      .toFile(webpPath);
    
    const originalSize = fs.statSync(filePath).size;
    const webpSize = fs.statSync(webpPath).size;
    const savings = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${filePath} → ${webpPath} (${savings}% smaller)`);
  } catch (error) {
    console.error(`❌ Error optimizing ${filePath}:`, error.message);
  }
}

async function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await processDirectory(filePath);
    } else {
      await optimizeImage(filePath);
    }
  }
}

async function main() {
  console.log('🖼️  Starting image optimization...\n');

  for (const dir of IMAGE_DIRS) {
    console.log(`📁 Processing ${dir}...`);
    await processDirectory(dir);
    console.log('');
  }

  console.log('✨ Image optimization complete!');
}

main().catch(console.error);
