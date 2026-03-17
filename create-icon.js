const sharp = require('sharp');
const path = require('path');

async function createIcon() {
    const inputPath = path.join(__dirname, 'logo.png');
    const outputPath = path.join(__dirname, 'icon-512.png');
    const output192 = path.join(__dirname, 'icon-192.png');

    // Create 512x512 icon with green background
    const greenBg = Buffer.from(
        `<svg width="512" height="512">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#15803D"/>
                    <stop offset="50%" style="stop-color:#16A34A"/>
                    <stop offset="100%" style="stop-color:#15803D"/>
                </linearGradient>
            </defs>
            <rect width="512" height="512" rx="80" fill="url(#bg)"/>
        </svg>`
    );

    // Resize logo to fit inside with padding
    const logo = await sharp(inputPath)
        .resize(380, 380, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    // Compose: green background + logo centered
    await sharp(greenBg)
        .composite([{ input: logo, gravity: 'centre' }])
        .png()
        .toFile(outputPath);

    // Also create 192x192 version
    await sharp(outputPath)
        .resize(192, 192)
        .png()
        .toFile(output192);

    console.log('✅ icon-512.png created (512x512)');
    console.log('✅ icon-192.png created (192x192)');
}

createIcon().catch(console.error);
