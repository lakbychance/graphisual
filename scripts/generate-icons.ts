import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const iconsDir = path.join(publicDir, "icons");

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

// Use the original logo PNG as source
const sourceImage = path.join(publicDir, "logo.png");

interface IconConfig {
  name: string;
  size: number;
  dir: string;
  maskable?: boolean;
  rounded?: boolean;
}

const icons: IconConfig[] = [
  { name: "icon-192.png", size: 192, dir: iconsDir },
  { name: "icon-512.png", size: 512, dir: iconsDir },
  { name: "icon-maskable-512.png", size: 512, dir: iconsDir, maskable: true },
  { name: "apple-touch-icon.png", size: 180, dir: publicDir },
  { name: "favicon.png", size: 32, dir: publicDir, rounded: true },
];

function createRoundedMask(size: number, radius: number): Buffer {
  const svg = `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`;
  return Buffer.from(svg);
}

async function generateIcons(): Promise<void> {
  for (const icon of icons) {
    const outputPath = path.join(icon.dir, icon.name);

    if (icon.rounded) {
      // Rounded favicon for browser tab
      const radius = Math.round(icon.size * 0.2); // 20% border radius
      const mask = createRoundedMask(icon.size, radius);

      const resized = await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

      await sharp(resized)
        .composite([
          {
            input: mask,
            blend: "dest-in",
          },
        ])
        .png()
        .toFile(outputPath);
    } else if (icon.maskable) {
      // Maskable icons need extra padding (safe zone is 80% of the icon)
      // Add 10% padding on each side by resizing to 80% and centering
      const innerSize = Math.round(icon.size * 0.8);
      const padding = Math.round((icon.size - innerSize) / 2);

      const resizedImage = await sharp(sourceImage)
        .resize(innerSize, innerSize, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

      // Use the beige/tan background color from the logo (#d4c4a8)
      await sharp({
        create: {
          width: icon.size,
          height: icon.size,
          channels: 4,
          background: { r: 212, g: 196, b: 168, alpha: 1 },
        },
      })
        .composite([{ input: resizedImage, left: padding, top: padding }])
        .png()
        .toFile(outputPath);
    } else {
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);
    }

    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log("\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
