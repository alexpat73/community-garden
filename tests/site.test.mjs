// Browser tests for every page, the notes form and both harvest mini-games.
//
//   npm install                                  (once)
//   npx playwright install chromium-headless-shell (once)
//   npm test                                     (tests your local copy)
//   BASE=https://alexpat73.github.io/community-garden/ npm test   (tests the live site)

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// A tiny web server for the project folder, so the pages load like they do online.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".json": "application/json" };
let server = null;
let BASE = process.env.BASE;
if (!BASE) {
  server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^\/+/, "") || "index.html";
    try {
      const body = await readFile(join(ROOT, path));
      res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  BASE = `http://127.0.0.1:${server.address().port}/`;
}
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures++; };
const browser = await chromium.launch();

async function open(path) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  // record every sound the page plays
  await page.addInitScript(() => {
    window.__plays = [];
    HTMLMediaElement.prototype.play = function () { window.__plays.push([this.src.split("/").pop(), this.volume]); return Promise.resolve(); };
  });
  await page.goto(BASE + path);
  return { page, errors, plays: () => page.evaluate(() => window.__plays.splice(0)) };
}
const cropOf = (page) => page.evaluate(() => getComputedStyle(document.querySelector(".mc-farmland")).getPropertyValue("--crop").trim());

// ---------- every page loads cleanly ----------
for (const p of ["index.html", "month.html", "month.html?m=9", "plants.html", "notes.html"]) {
  const { page, errors } = await open(p);
  await page.waitForTimeout(400);
  check(errors.length === 0, `${p}: no errors ${errors.join(" | ")}`);
  check(await page.locator('.navbar a[href="index.html#faq"]').count() === 1, `${p}: FAQ link in nav`);
  await page.close();
}

// ---------- home page in October shows the carrot, not the pumpkin ----------
{
  const { page } = await open("index.html");
  const month = new Date().getMonth() + 1;
  check(await page.locator("#harvest-spot .mc-carrot").count() === (month === 10 ? 1 : 0), "home: carrot shown only in October");
  check(await page.locator("#harvest-spot .mc-stage:not(.mc-carrot)").count() === (month === 9 ? 1 : 0), "home: pumpkin shown only in September");
  check(await page.locator("#faq details").count() === 9, "home: 9 FAQ questions");
  await page.close();
}

// ---------- carrot: plant, grow, harvest, pick up ----------
{
  const { page, plays } = await open("month.html?m=10");
  const btn = page.locator("#harvest .mc-carrot");
  const hint = page.locator("#harvest .harvest-hint");
  check(await btn.count() === 1 && await page.locator(".mc-stage:not(.mc-carrot)").count() === 0, "October page: carrot, no pumpkin");
  check(await btn.getAttribute("aria-label") === "Farmland: click to plant a carrot", "starts as empty farmland");
  check((await cropOf(page)) === "" || (await cropOf(page)) === "none", "no crop before planting");
  await plays();

  await btn.click();
  check(await page.locator(".mc-farmland.wet").count() === 1, "plant: farmland turns wet");
  check(/carrots_stage_0/.test(await cropOf(page)), "plant: seedling (stage 0) appears");
  const p1 = await plays();
  check(p1.length === 1 && /^Crop_place[16]\.ogg\.mp3$/.test(p1[0][0]) && p1[0][1] === 1, `plant: crop-place sound (${JSON.stringify(p1)})`);
  check((await hint.textContent()).startsWith("Planted and watered!"), "plant: hint says planted and watered");

  const expectStage = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3 };
  let stagesOk = true;
  for (let age = 1; age <= 7; age++) {
    await btn.click();
    if (!new RegExp(`carrots_stage_${expectStage[age]}`).test(await cropOf(page))) stagesOk = false;
    if (age < 7 && (await hint.textContent()) !== `Growing… ${age} / 7`) stagesOk = false;
  }
  check(stagesOk, "grow: 7 clicks go through ages 1-7 with the right picture and progress text");
  check((await hint.textContent()) === "Ready! Click to harvest the carrots.", "grow: ready after 7 clicks");
  check(await btn.getAttribute("aria-label") === "Carrots are ready: click to harvest", "ready: button label says harvest");
  const growPlays = await plays();
  check(growPlays.length === 7 && growPlays.every(([f]) => f === "Bonemeal5.ogg.mp3"), "grow: bone meal sound on every click");

  await btn.click();
  const drops = await page.locator(".mc-drop").count();
  check(drops >= 2 && drops <= 5, `harvest: ${drops} carrots drop (2-5)`);
  check(!/stage/.test(await cropOf(page)) && await page.locator(".mc-farmland.wet").count() === 0, "harvest: crop gone, farmland dry again");
  const hp = await plays();
  check(hp.length === 1 && /^Bamboo_Sapling_dig[14]\.ogg\.mp3$/.test(hp[0][0]), "harvest: break sound");
  check((await page.locator(".mc-carrot-item").first().getAttribute("src")).endsWith("carrot.png"), "real carrot.png item is used");

  await btn.click(); // too fast: carrots are still flying out
  check(await page.locator(".mc-drop").count() === drops, "a click right after harvesting is ignored");
  await page.waitForTimeout(600);
  await btn.click();
  await page.waitForTimeout(400 + drops * 80);
  check(await page.locator(".mc-drop").count() === 0, "pick up: carrots collected");
  check((await page.locator("#harvest .harvest-count").textContent()) === `Carrots harvested: ${drops}`, `pick up: counter = ${drops}`);
  const pp = await plays();
  check(pp.length === drops && pp.every(([f]) => f === "minecraft_item_pickup.mp3"), "pick up: one pop per carrot");
  check((await hint.textContent()) === "Click the farmland to plant another carrot.", "back to empty farmland");

  // keyboard: Enter plants; a held (repeating) Enter doesn't skip ahead
  await btn.focus();
  await page.keyboard.down("Enter");
  check(/carrots_stage_0/.test(await cropOf(page)), "keyboard: Enter plants");
  await page.keyboard.down("Enter"); // auto-repeat
  await page.keyboard.down("Enter");
  check((await hint.textContent()).startsWith("Planted and watered!"), "keyboard: held Enter repeats are ignored");
  await page.keyboard.up("Enter");
  await page.keyboard.press("Space");
  check((await hint.textContent()) === "Growing… 1 / 7", "keyboard: Space grows");

  // auto pick-up after 6 s
  for (let i = 0; i < 7; i++) await btn.click();
  await page.waitForTimeout(6600);
  check(await page.locator(".mc-drop").count() === 0 && (await hint.textContent()).startsWith("Click the farmland"), "carrots are picked up by themselves after 6 s");
  await page.close();
}

// ---------- pumpkin still works ----------
{
  const { page, plays } = await open("month.html?m=9");
  const btn = page.locator("#harvest .mc-stage");
  await btn.scrollIntoViewIfNeeded(); // raw mouse presses don't scroll by themselves
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(500); await page.mouse.up();
  check(!(await btn.getAttribute("class")).includes("broken"), "pumpkin: letting go early doesn't break it");
  await page.mouse.down(); await page.waitForTimeout(1800); await page.mouse.up();
  check((await btn.getAttribute("class")).includes("broken"), "pumpkin: holding 1.5 s breaks it");
  await plays();
  await btn.click();
  await page.waitForTimeout(400);
  check((await page.locator("#harvest .harvest-count").textContent()) === "Pumpkins harvested: 1", "pumpkin: pick up counts 1");
  check((await plays()).some(([f]) => f === "minecraft_item_pickup.mp3"), "pumpkin: pick-up sound");
  await page.close();
}

// ---------- notes form ----------
{
  const { page } = await open("notes.html");
  await page.click("#note-form button[type=submit]");
  check((await page.locator("#notes-status").textContent()) === "3 fields are still empty.", "notes: empty form is blocked with a message");
  await page.selectOption("#note-kind", "Harvested");
  await page.fill("#note-plant", "Carrot");
  await page.fill("#note-text", "Five carrots from the October game");
  check((await page.locator("#note-text-count").textContent()) === "34 / 1000 characters", "notes: counter updates");
  await page.click("#note-form button[type=submit]");
  check((await page.locator("#notes-status").textContent()) === "Note saved." && await page.locator("#notes-list li .delete").count() === 1, "notes: complete form saves");
  await page.close();
}

await browser.close();
server?.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exitCode = failures ? 1 : 0;
