const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate SVG icon template
function generateSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#4f46e5" rx="${size * 0.15}"/>
  
  <!-- Wallet Icon -->
  <g transform="translate(${size * 0.2}, ${size * 0.25})">
    <!-- Wallet body -->
    <rect x="0" y="${size * 0.1}" width="${size * 0.6}" height="${size * 0.4}" fill="#ffffff" rx="${size * 0.05}"/>
    
    <!-- Wallet flap -->
    <path d="M 0 ${size * 0.1} Q ${size * 0.3} ${size * 0.05} ${size * 0.6} ${size * 0.1}" fill="#e0e7ff" stroke="#ffffff" stroke-width="${size * 0.01}"/>
    
    <!-- Card slot -->
    <rect x="${size * 0.05}" y="${size * 0.2}" width="${size * 0.5}" height="${size * 0.08}" fill="#4f46e5" opacity="0.3" rx="${size * 0.02}"/>
    
    <!-- Coin -->
    <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.08}" fill="#fbbf24" stroke="#ffffff" stroke-width="${size * 0.01}"/>
    <text x="${size * 0.5}" y="${size * 0.43}" font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold" fill="#ffffff" text-anchor="middle">₹</text>
  </g>
</svg>`;
}

// Generate icons
sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}x${size}.png`;
  const svgFilename = `icon-${size}x${size}.svg`;
  
  // Save SVG file
  fs.writeFileSync(path.join(iconsDir, svgFilename), svg);
  console.log(`Generated ${svgFilename}`);
});

console.log('\n✅ SVG icons generated successfully!');
console.log('\n📝 To convert SVG to PNG, you can:');
console.log('1. Use an online converter like https://cloudconvert.com/svg-to-png');
console.log('2. Use ImageMagick: convert icon.svg -resize 192x192 icon-192x192.png');
console.log('3. Use the browser: Open SVG in browser, take screenshot, resize');
console.log('\nFor now, we\'ll create simple PNG placeholders using Canvas (Node.js)...\n');

// Try to use canvas if available (optional)
try {
  const { createCanvas } = require('canvas');
  
  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#4f46e5';
    ctx.roundRect(0, 0, size, size, size * 0.15);
    ctx.fill();
    
    // Wallet body
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(size * 0.2, size * 0.35, size * 0.6, size * 0.4, size * 0.05);
    ctx.fill();
    
    // Wallet flap
    ctx.fillStyle = '#e0e7ff';
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.35);
    ctx.quadraticCurveTo(size * 0.5, size * 0.3, size * 0.8, size * 0.35);
    ctx.lineTo(size * 0.8, size * 0.4);
    ctx.lineTo(size * 0.2, size * 0.4);
    ctx.closePath();
    ctx.fill();
    
    // Card slot
    ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
    ctx.roundRect(size * 0.25, size * 0.45, size * 0.5, size * 0.08, size * 0.02);
    ctx.fill();
    
    // Coin
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.65, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.01;
    ctx.stroke();
    
    // Rupee symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.08}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₹', size * 0.5, size * 0.65);
    
    // Save PNG
    const buffer = canvas.toBuffer('image/png');
    const filename = `icon-${size}x${size}.png`;
    fs.writeFileSync(path.join(iconsDir, filename), buffer);
    console.log(`Generated ${filename}`);
  });
  
  console.log('\n✅ PNG icons generated successfully using Canvas!');
} catch (err) {
  console.log('\n⚠️  Canvas module not available. SVG icons generated.');
  console.log('To generate PNG icons, install canvas: npm install canvas');
  console.log('Or manually convert the SVG files to PNG.\n');
}

