const fs = require('fs');
const path = require('path');

// Simple script to create placeholder icon files
// These will be replaced with proper icons later

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG that can be used as a fallback
const createSVG = (size) => `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4f46e5" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.3}" fill="white" text-anchor="middle" dominant-baseline="middle">₹</text>
</svg>`;

// For each size, create a simple data URI based PNG placeholder
sizes.forEach(size => {
  const svg = createSVG(size);
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Created ${path.basename(svgPath)}`);
});

console.log('\n✅ Placeholder icons created!');
console.log('\n📱 To create proper PNG icons:');
console.log('1. Open http://localhost:3000/generate-icons.html in your browser');
console.log('2. Download each icon by clicking the "Download" button');
console.log('3. Save them in the public/icons/ folder');
console.log('\nOr use the SVG files directly - modern browsers support them!\n');

