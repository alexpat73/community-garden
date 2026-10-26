// Makes the app's home-screen icons from the Font Awesome seedling:
//   node tools/make-app-icons.mjs
// Needs the test browser (npx playwright install chromium-headless-shell).

import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const sprite = await readFile(new URL("vendor/fontawesome/icons.svg", root), "utf8");
const seedling = sprite.match(/<symbol id="seedling" viewBox="([^"]+)">(.*?)<\/symbol>/s);

// size: picture size; glyph: how much of it the seedling fills. Maskable icons keep the
// seedling inside the middle 80%, because Android may cut the corners into a circle.
const icons = [
  { file: "images/app-icon-180.png", size: 180, glyph: 0.6 }, // iPhone home screen
  { file: "images/app-icon-192.png", size: 192, glyph: 0.6 },
  { file: "images/app-icon-512.png", size: 512, glyph: 0.6 },
  { file: "images/app-icon-maskable-512.png", size: 512, glyph: 0.45 },
];

const browser = await chromium.launch();
for (const { file, size, glyph } of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:#1F271D">
    <svg viewBox="${seedling[1]}" width="${size * glyph}" height="${size * glyph}" style="color:#8FB37A">${seedling[2]}</svg></body>`);
  await page.screenshot({ path: new URL(file, root).pathname });
  await page.close();
  console.log(`Wrote ${file}`);
}
await browser.close();
