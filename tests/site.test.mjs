// Browser tests for every page, the notes form, both harvest mini-games, the garden groups and the mobile app.
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
  ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".json": "application/json",
  ".webmanifest": "application/manifest+json" };
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

// context: browser options (e.g. a fake location); before: setup that must happen before the page loads (e.g. a fake clock).
async function open(path, { context = {}, before } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  // record every sound the page plays
  await page.addInitScript(() => {
    window.__plays = [];
    HTMLMediaElement.prototype.play = function () { window.__plays.push([this.src.split("/").pop(), this.volume]); return Promise.resolve(); };
  });
  if (before) await before(page, ctx);
  await page.goto(BASE + path);
  return { page, ctx, errors, plays: () => page.evaluate(() => window.__plays.splice(0)) };
}
const cropOf = (page) => page.evaluate(() => getComputedStyle(document.querySelector(".mc-farmland")).getPropertyValue("--crop").trim());

// ---------- every page loads cleanly ----------
for (const p of ["index.html", "month.html", "month.html?m=9", "plants.html", "notes.html", "gardens.html",
  "garden.html?id=demo-wedding", "garden.html?id=w332251381", "garden.html?id=does-not-exist", "app.html", "prototype.html"]) {
  const { page, errors } = await open(p);
  await page.waitForTimeout(400);
  check(errors.length === 0, `${p}: no errors ${errors.join(" | ")}`);
  if (p !== "app.html") { // the app has a tab bar instead
    check(await page.locator('.navbar a[href="index.html#faq"]').count() === 1, `${p}: FAQ link in nav`);
    check(await page.locator('.navbar a[href="index.html#faq"] + a, .navbar li:has(a[href="index.html#faq"]) + li a[href="prototype.html"]').count() === 1, `${p}: Lo-fi Prototype tab right after FAQ`);
  }
  await page.close();
}

// ---------- home page in October shows the carrot, not the pumpkin ----------
{
  const { page } = await open("index.html");
  const month = new Date().getMonth() + 1;
  check(await page.locator("#harvest-spot .mc-carrot").count() === (month === 10 ? 1 : 0), "home: carrot shown only in October");
  check(await page.locator("#harvest-spot .mc-stage:not(.mc-carrot)").count() === (month === 9 ? 1 : 0), "home: pumpkin shown only in September");
  check(await page.locator("#faq details").count() === 10, "home: 10 FAQ questions");
  const districts = await page.locator("#city option").allTextContents();
  check(districts.length === 12 && districts.includes("Neukölln") && !districts.includes("Hamburg"), "weather: Berlin's 12 districts, no other cities");
  check(await page.$eval("#city", (s) => s.selectedOptions[0].textContent) === "Mitte", "weather: Mitte is the default");
  check(await page.locator('.app-promo img[src="images/qr-app.svg"]').count() === 1 && await page.locator('.app-promo a[href="app.html"]').count() === 1, "home: QR code and link to the mobile app");
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
  check(await page.locator("#notes-status.is-success").count() === 1 && (await page.textContent("#toast.show")) === "✓ Note saved", "notes: saving shows a green check line and a pop-up");
  check(await page.locator("#notes-list li.is-new").count() === 1, "notes: the new note is highlighted");
  await page.close();
}

// ---------- All plants: a searchable list with photos ----------
{
  const { page, errors } = await open("plants.html");
  const monthName = new Date().toLocaleDateString("en-GB", { month: "long" });
  const cards = page.locator("#plant-list .plant");
  const shown = () => page.locator("#plant-list .plant:not([hidden]) h3").allTextContents();
  check(await cards.count() === 31 && (await page.textContent("#plant-count")) === "All 31 plants", "plants: 31 plant cards");
  const photos = await page.$$eval("#plant-list .stage-photos img", (imgs) => imgs.map((i) => ({ src: i.getAttribute("src"), lazy: i.loading === "lazy", sized: i.width > 0 && i.getAttribute("height") === "180", alt: i.alt })));
  check(photos.length === 93 && photos.every((p) => p.lazy && p.sized && p.alt), "plants: 3 photos per plant (seedling, growing, ready), lazy, sized, with alt text");
  const files = await Promise.all(photos.map((p) => page.request.get(BASE + p.src)));
  check(files.every((r) => r.ok()) && files.every((r) => r.headers()["content-type"] === "image/jpeg"), "plants: every photo file exists");
  check((await page.locator("#plant-when option").allTextContents()).includes(`Something to do in ${monthName}`), "plants: the 'When' filter names this month");
  await page.fill("#plant-search", "kurbis");
  check((await shown()).join() === "Pumpkin (Kürbis)" && (await page.textContent("#plant-count")) === "1 of 31 plants", "plants search: kurbis finds Pumpkin (Kürbis)");
  await page.fill("#plant-search", "kohl");
  check((await shown()).join() === "Kohlrabi (Kohlrabi),Kale (Grünkohl),Brussels sprouts (Rosenkohl)", "plants search: German names too (kohl)");
  await page.fill("#plant-search", "");
  await page.selectOption("#plant-type", "Herbs");
  check((await shown()).length === 4, "plants filter: 4 herbs");
  await page.selectOption("#plant-type", "");
  await page.selectOption("#plant-when", "harvest");
  await page.check("#plant-easy");
  const easyHarvest = await page.locator("#plant-list .plant:not([hidden])").evaluateAll((list) => list.map((el) => [el.querySelector(".plant-now")?.textContent, el.querySelector(".plant-tags").textContent]));
  check(easyHarvest.length > 0 && easyHarvest.every(([now, tags]) => now.startsWith(`In ${monthName}:`) && now.includes("harvest") && tags.includes("Easy")), `plants filter: easy plants to harvest this month (${easyHarvest.length})`);
  await page.fill("#plant-search", "zzz");
  check(await page.isVisible("#plant-empty") && (await shown()).length === 0, "plants: no match says so, with a way back");
  await page.click("#plant-reset");
  check((await shown()).length === 31 && (await page.inputValue("#plant-search")) === "" && !(await page.isChecked("#plant-easy")), "plants: Show all plants clears the filters");
  check(await page.locator("details.year-table:not([open]) #calendar tbody tr:not(.group)").count() === 31, "plants: the year table is still there, folded away");
  check(await page.locator(".plant-more:not([open]) .facts").count() === 31, "plants: details fold out per plant");
  check(await page.locator("#photo-credits li").count() === 31 && await page.locator('#photo-credits a[href^="https://commons.wikimedia.org/wiki/File:"]').count() === 93, "plants: every photo is credited, with a link");
  check(errors.length === 0, `plants: no errors ${errors.join(" | ")}`);
  await page.close();
  const linked = (await open("plants.html#kale")).page; // e.g. from a month page
  await linked.waitForTimeout(300);
  check(await linked.$eval("#kale", (el) => Math.abs(el.getBoundingClientRect().top) < 5), "plants: a link to #kale jumps to Kale");
  await linked.close();
}

// ---------- Jobs: your own jobs next to the month's, shared with the app ----------
{
  const month = new Date().getMonth() + 1;
  const { page, ctx } = await open(`month.html?m=${month}`);
  const box = page.locator("#jobs-box");
  const builtIn = await box.locator(".checklist li").count();
  await box.locator(".add-job button").click();
  check((await box.locator(".field-error").textContent()) === "Write the job first.", "jobs: an empty job is blocked");
  await box.locator(".add-job input").fill("Fix the shed door");
  await box.locator(".add-job button").click();
  check(await box.locator(".custom-job.is-new", { hasText: "Fix the shed door" }).count() === 1 && (await box.locator(".form-status.is-success").textContent()) === "Job added.", "jobs: your own job is added, with a green confirmation");
  await box.locator(".custom-job input").check();
  check((await box.locator(".jobs-progress").textContent()) === `1 of ${builtIn + 1} done`, "jobs: your own job counts");
  await page.goto(BASE + "app.html");
  await page.fill("#welcome-name", "Alex");
  await page.click("#welcome-form button[type=submit]");
  check(await page.locator("#jobs-box .custom-job input:checked").count() === 1 && (await page.textContent("#jobs-box")).includes("Fix the shed door"), "jobs: the same list in the app");
  await page.click("#jobs-box [data-remove]");
  check(await page.locator("#jobs-box .custom-job").count() === 0 && (await page.textContent("#jobs-box .form-status")) === "Job removed.", "jobs: your own job can be removed");
  await ctx.close();
}

// ---------- Gardens: search, filters, near me, map only on request ----------
const TINY_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
{
  const loaded = [];
  const { page, ctx } = await open("gardens.html", {
    context: { geolocation: { latitude: 52.4986, longitude: 13.403 }, permissions: ["geolocation"] }, // Kreuzberg
    before: async (page, ctx) => {
      page.on("request", (r) => loaded.push(r.url()));
      // never hit the real map server from the tests
      await ctx.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG }));
    },
  });
  const total = Number((await page.textContent("#garden-count")).match(/of (\d+)/)?.[1]);
  check(total > 900 && await page.locator(".garden-card").count() === 30, `gardens: ${total} gardens, 30 shown at first`);
  await page.click("#show-more");
  check(await page.locator(".garden-card").count() === 60, "gardens: Show more adds 30");

  await page.fill("#garden-search", "allmende");
  await page.waitForTimeout(300);
  check(await page.locator(".garden-card a", { hasText: "Allmende-Kontor" }).count() === 1, "search finds Allmende-Kontor");
  await page.fill("#garden-search", "kopenick"); // typed without the umlaut
  await page.waitForTimeout(300);
  const metas = await page.locator(".garden-meta").allTextContents();
  check(metas.length > 0 && metas.every((m) => m.includes("Treptow-Köpenick")), "search ignores accents (kopenick finds Köpenick)");
  await page.fill("#garden-search", "");
  await page.selectOption("#garden-district", "Neukölln");
  await page.selectOption("#garden-type", "c");
  await page.waitForTimeout(300);
  const neukolln = await page.locator(".garden-meta").allTextContents();
  check(neukolln.length > 0 && neukolln.every((m) => m.startsWith("Community garden · ") && m.includes("Neukölln")), `district + type filters (${neukolln.length} community gardens in Neukölln)`);
  await page.selectOption("#garden-district", "");
  await page.selectOption("#garden-type", "example");
  check(await page.locator(".garden-card").count() === 3, "type filter: 3 example groups");
  await page.selectOption("#garden-type", "all");

  await page.click("#near-me");
  await page.waitForFunction(() => /Nearest/.test(document.querySelector("#near-status").textContent));
  const km = (await page.locator(".garden-meta").allTextContents()).slice(0, 8).map((m) => {
    const [, n, unit] = m.match(/([\d.]+) (m|km)$/);
    return unit === "m" ? n / 1000 : Number(n);
  });
  check(km.every((d, i) => i === 0 || d >= km[i - 1]) && km[0] < 2, `near me: nearest first (${km.slice(0, 3).join(", ")} km)`);
  check((await page.textContent("#near-status")).includes("never leaves this device"), "near me: says the location stays on the device");

  await page.fill("#garden-search", "Wedding");
  await page.waitForTimeout(300);
  const wedding = await page.locator(".garden-meta").allTextContents();
  check(wedding.length > 3 && wedding.every((m) => m.includes("Wedding")) && (await page.textContent("#garden-count")).endsWith(" in Wedding"), `neighbourhood search: ${wedding.length} gardens in Wedding`);
  await page.fill("#garden-search", "12043");
  await page.waitForTimeout(300);
  const byPostcode = (await page.locator(".garden-meta").allTextContents()).slice(0, 6).map((m) => {
    const [, n, unit] = m.match(/([\d.]+) (m|km)$/);
    return unit === "m" ? n / 1000 : Number(n);
  });
  check((await page.textContent("#garden-count")).endsWith("closest to 12043 first") && byPostcode.every((d, i) => i === 0 || d >= byPostcode[i - 1]), "postcode search: nearest to 12043 first");
  await page.fill("#garden-search", "");
  await page.waitForTimeout(300);

  check(!loaded.some((u) => /leaflet|tile\.openstreetmap/.test(u)), "nothing from the map is downloaded before Show map");
  await page.click("#show-map");
  await page.waitForSelector("#map.leaflet-container");
  await page.waitForTimeout(500);
  check(loaded.some((u) => u.endsWith("vendor/leaflet/leaflet.js")) && loaded.some((u) => /tile\.openstreetmap/.test(u)), "Show map loads Leaflet and the map tiles");
  check(await page.locator("#map canvas").count() > 0 && await page.locator("#map-placeholder").isHidden(), "map shows the garden markers");
  check(await page.locator("[data-fly]").count() > 0, "results get a Show on map button");
  check(!loaded.some((u) => u.includes("heic-to")), "the HEIC converter isn't downloaded on the gardens page");
  await ctx.close();
}

// ---------- A group: visitor, join request, member, notes and photos ----------
const FIXTURES = join(ROOT, "tests/fixtures");
// Reads a photo back from the page: its size, whether it's upright (red top, blue bottom) and whether EXIF is left.
const photoInfo = (page, selector) => page.$eval(selector, (img) => new Promise((resolve) => {
  const measure = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const top = g.getImageData(c.width / 2, 5, 1, 1).data;
    const bottom = g.getImageData(c.width / 2, c.height - 5, 1, 1).data;
    resolve({ w: c.width, h: c.height, jpeg: img.src.startsWith("data:image/jpeg"), exif: atob(img.src.split(",")[1]).includes("Exif"),
      upright: top[0] > 150 && top[2] < 100 && bottom[2] > 150 && bottom[0] < 100 });
  };
  if (img.complete) measure(); else img.onload = measure;
}));
{
  const loaded = [];
  const { page, ctx } = await open("garden.html?id=demo-wedding", {
    before: async (page) => {
      await page.clock.install(); // lets the test skip the pretend admin's 4-second wait
      page.on("request", (r) => loaded.push(r.url()));
      page.on("dialog", (d) => d.accept());
      await page.addInitScript(() => { // one entry in the personal diary, to share with the group
        if (!localStorage.getItem("garden-notes")) {
          localStorage.setItem("garden-notes", JSON.stringify([{ id: "n1", date: "2026-10-20", kind: "Harvested", plant: "Kale", text: "First kale after the frost" }]));
        }
      });
    },
  });
  check(await page.locator(".note-card").count() === 3, "visitor sees the 3 public notes");
  check(await page.locator(".note-card .tag", { hasText: "Members only" }).count() === 0, "visitor sees no members-only note");
  check((await page.textContent(".hidden-notes")).startsWith("2 members-only notes are hidden"), "visitor is told 2 members-only notes are hidden");
  await page.click("#join-form button[type=submit]");
  check((await page.textContent("#join-status")) === "3 fields are still empty." && await page.locator('#join-form [aria-invalid="true"]').count() === 3, "join form: empty fields are blocked with messages");
  await page.fill("#join-name", "Alex");
  await page.fill("#join-message", "Hi! I just got a plot nearby and would love to learn.");
  await page.fill("#join-growing", "Tomatoes and basil");
  await page.click("#join-form button[type=submit]");
  check((await page.textContent(".request-status")).includes("waiting for approval"), "join: request is pending");
  await page.clock.runFor(5000);
  await page.waitForSelector("#note-post");
  check((await page.textContent("#group-flash")).includes("Anna accepted your request"), "join: the pretend admin accepts after a few seconds");
  check(await page.locator(".note-card .tag", { hasText: "Members only" }).count() === 2, "member: the 2 members-only notes appear");
  check(/Alex[\s\S]*Tomato, Basil/.test(await page.locator(".member-card", { hasText: "(you)" }).textContent()), "member: you're listed, growing what you asked for");

  await page.selectOption("#post-share", "n1");
  check((await page.inputValue("#post-text")).startsWith("20 Oct 2026 · Harvested · Kale: First kale"), "Share one of My Notes fills in the note");
  await page.setInputFiles("#post-photo", join(FIXTURES, "portrait-exif-gps.jpg"));
  await page.waitForFunction(() => document.querySelector("#post-photo-status").textContent === "Photo ready.");
  const jpg = await photoInfo(page, "#post-preview img");
  check(jpg.jpeg && jpg.w === 300 && jpg.h === 400 && jpg.upright, `JPG photo: turned upright using its EXIF rotation (${jpg.w}×${jpg.h})`);
  check(!jpg.exif, "JPG photo: EXIF data, including the GPS location, is removed");
  check(!loaded.some((u) => u.includes("heic-to")), "JPG photo: the HEIC converter is not downloaded");
  await page.check('input[name="visibility"][value="public"]');
  await page.click("#post-submit");
  check((await page.textContent("#post-status")) === "Note posted. Everyone can read it.", "post: confirmation appears next to the form");
  check(await page.locator(".note-card .note-photo").count() === 1, "post: the note shows its photo");

  await page.evaluate(() => { // remember every status the photo field shows, even short ones
    window.__photoStatus = [];
    new MutationObserver(() => window.__photoStatus.push(document.querySelector("#post-photo-status")?.textContent))
      .observe(document.querySelector("#garden-main"), { subtree: true, childList: true, characterData: true });
  });
  await page.setInputFiles("#post-photo", join(FIXTURES, "iphone.heic"));
  await page.waitForFunction(() => document.querySelector("#post-photo-status").textContent === "Photo ready.", null, { timeout: 20000 });
  check((await page.evaluate(() => window.__photoStatus)).includes("Converting iPhone photo…"), "HEIC photo: says it's converting");
  const heic = await photoInfo(page, "#post-preview img");
  check(heic.jpeg && heic.w === 300 && heic.h === 400 && heic.upright, `HEIC photo: converted to an upright JPEG (${heic.w}×${heic.h})`);
  check(loaded.filter((u) => u.includes("heic-to.js")).length === 1, "HEIC photo: the converter is downloaded once, only now");
  await page.fill("#post-text", "The gate code changed, ask Anna.");
  await page.click("#post-submit"); // visibility is back to the default: members only
  check((await page.textContent("#post-status")) === "Note posted. Only members can read it.", "members-only is the default");

  await page.setInputFiles("#post-photo", join(FIXTURES, "broken.jpg"));
  await page.waitForFunction(() => document.querySelector("#post-photo-status").classList.contains("is-error"));
  check((await page.textContent("#post-photo-status")) === "This photo couldn't be read. Try a JPG or PNG." && await page.locator("#post-preview img").count() === 0, "broken photo: plain-language error, nothing attached");

  await page.reload();
  check(await page.locator("#note-post").count() === 1 && await page.locator(".note-card").count() === 7, "reload: still a member, all 7 notes kept");
  await page.click("#leave-group");
  check((await page.textContent("#group-flash")).startsWith("You left Sonnenbeet Wedding"), "leave: confirmation shown");
  const visible = await page.locator(".note-card .note-body").allTextContents();
  check(visible.some((t) => t.startsWith("20 Oct 2026 · Harvested · Kale")) && !visible.some((t) => t.includes("gate code")), "after leaving: your public note shows, your members-only note doesn't");
  check((await page.textContent(".hidden-notes")).startsWith("3 members-only notes are hidden"), "after leaving: 3 members-only notes hidden");
  await Promise.all([page.waitForEvent("load"), page.click("#reset-prototype")]);
  await page.waitForSelector("#join-form");
  check(await page.locator(".note-card").count() === 3, "reset: back to the example data");
  await ctx.close();
}

// ---------- Places: a full group has a waiting list ----------
{
  const { page, ctx } = await open("garden.html?id=demo-spree", { before: (page) => page.on("dialog", (d) => d.accept()) });
  check((await page.textContent(".places")) .trim() === "Full: all 2 places are taken" && await page.locator(".places.full").count() === 1, "places: a full group says so");
  check((await page.textContent("#join-form button[type=submit]")) === "Join the waiting list", "places: a full group offers the waiting list");
  await page.fill("#join-name", "Alex");
  await page.fill("#join-message", "Happy to wait for a place.");
  await page.fill("#join-growing", "Beans");
  await page.click("#join-form button[type=submit]");
  check((await page.textContent(".request-status")).startsWith("You're on the waiting list") && await page.locator("#group-flash.is-success").count() === 1, "places: you're on the waiting list");
  await page.reload();
  check(await page.locator("#leave-waiting").count() === 1, "places: the waiting list is remembered");
  await page.click("#leave-waiting");
  check(await page.locator("#join-form").count() === 1 && (await page.textContent("#group-flash")) === "You left the waiting list.", "places: you can leave the waiting list");
  await page.goto(BASE + "garden.html?id=demo-wedding");
  check(/^\d+ of 12 places taken · \d+ places? free$/.test((await page.textContent(".places")).trim()), "places: other groups show the free places");
  await ctx.close();
}

// ---------- Your own group: start it, answer requests, delete it ----------
{
  const { page, ctx } = await open("garden.html?id=w332251381", { before: (page) => page.on("dialog", (d) => d.accept()) });
  await page.click("#start-form button[type=submit]");
  check((await page.textContent("#start-status")) === "2 fields are still empty.", "start a group: empty fields are blocked");
  await page.fill("#start-name", "Alex");
  await page.fill("#start-about", "Beds 40 to 44 on Tempelhofer Feld. We meet Sundays at 11.");
  await page.fill("#start-places", "2");
  await page.click("#start-form button[type=submit]");
  check((await page.textContent("#group-flash")).startsWith("Your group is ready"), "start a group: confirmation");
  check(await page.locator(".request-card").count() === 2, "owner: 2 example join requests arrive");
  await page.locator(".request-card", { hasText: "Yusuf" }).locator("[data-approve]").click();
  check((await page.textContent("#requests-status")).startsWith("Yusuf is now a member"), "owner: approving says so next to the requests");
  check(await page.locator(".member-card", { hasText: "Yusuf" }).count() === 1, "owner: Yusuf joins the members");
  check((await page.textContent(".places")).trim() === "Full: all 2 places are taken" && await page.locator(".request-card", { hasText: "Clara" }).locator("[data-approve]").isDisabled(), "owner: when the group is full, Approve is off");
  await page.click(".group-edit summary");
  await page.fill("#edit-places", "1");
  await page.click("#group-edit button[type=submit]");
  check((await page.textContent("#edit-status")).startsWith("Places must be at least 2"), "owner: places can't go below the members");
  await page.fill("#edit-places", "3");
  await page.fill("#edit-about", "Beds 40 to 44. New: we also meet Wednesdays at 18.");
  await page.click("#group-edit button[type=submit]");
  check((await page.textContent("#group-flash")) === "Group details saved." && await page.locator("#group-flash.is-success").count() === 1 && (await page.textContent("#toast.show")) === "✓ Group details saved", "owner: saving the group details is confirmed");
  check((await page.textContent("#garden-main")).includes("New: we also meet Wednesdays") && (await page.textContent(".places")).trim() === "2 of 3 places taken · 1 place free", "owner: new description and places are shown");
  check(await page.locator(".request-card", { hasText: "Clara" }).locator("[data-approve]").isEnabled(), "owner: with a free place, Approve is back");
  await page.locator(".request-card", { hasText: "Clara" }).locator("[data-decline]").click();
  check(await page.locator(".request-card").count() === 0 && await page.locator(".member-card").count() === 2, "owner: declining removes the request");
  await page.check('.plant-picker input[value="carrot"]');
  await page.setInputFiles("#profile-photo", join(FIXTURES, "portrait-exif-gps.jpg"));
  await page.waitForFunction(() => document.querySelector("#profile-photo-status").textContent === "Photo ready.");
  await page.click("#profile-submit");
  check((await page.textContent("#profile-status")) === "Profile saved." && await page.locator(".member-card img.avatar").count() === 1, "profile: photo saved");
  check((await page.locator(".member-card", { hasText: "(you)" }).textContent()).includes("Carrot"), "profile: plants saved (Grows: Carrot)");
  await page.goto(BASE + "gardens.html");
  const myGroups = await page.textContent("#my-groups");
  check(myGroups.includes("Allmende-Kontor") && myGroups.includes("Owner"), "gardens page: your group is listed, as Owner");
  await page.selectOption("#garden-type", "group");
  check(await page.locator(".garden-card").count() === 4, "type filter 'With a group': the 3 examples + yours");
  await page.goto(BASE + "garden.html?id=w332251381");
  await page.click("#delete-group");
  check((await page.textContent("#group-flash")) === "Group deleted." && await page.locator("#start-form").count() === 1, "owner can delete the group");
  await ctx.close();
}

// ---------- The mobile app ----------
const WEATHER = { daily: { // a fixed week, with one frosty night (1 °C on day 3)
  time: ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"],
  temperature_2m_max: [12, 11, 9, 10, 13, 12, 11], temperature_2m_min: [5, 4, 1, 3, 6, 5, 4], precipitation_sum: [0, 1.2, 0, 0.4, 3, 0, 0] } };
// serviceWorkers "block": with the offline worker running, the fake weather and map answers can't be used
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" };
const fakeNetwork = async (ctx) => {
  await ctx.route("https://api.open-meteo.com/**", (route) => route.fulfill({ json: WEATHER }));
  await ctx.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG }));
};
// The sheet slides up from below; measure it once it's in place.
const sheetInPlace = (page) => page.waitForFunction(() => document.querySelector("#sheet").getAnimations().length === 0);
// Tabs switch on the "hashchange" event, a moment after the tap.
const goTab = async (page, tab) => {
  await page.click(`.tabbar a[data-tab="${tab}"]`);
  await page.waitForSelector(`#tab-${tab}:not([hidden])`);
};
const distances = async (page, selector) => (await page.locator(selector).allTextContents()).slice(0, 6).map((m) => {
  const [, n, unit] = m.match(/([\d.]+) (m|km)$/);
  return unit === "m" ? n / 1000 : Number(n);
});
{
  const loaded = [];
  const { page, ctx, errors, plays } = await open("app.html", {
    context: PHONE,
    before: async (page, ctx) => {
      await fakeNetwork(ctx);
      await page.clock.install(); // to skip the pretend admin's wait
      page.on("request", (r) => loaded.push(r.url()));
      page.on("dialog", (d) => d.accept());
    },
  });
  // Welcome
  check(await page.isVisible("#welcome") && await page.isHidden("#tabbar"), "app: the first visit shows the welcome screen");
  await page.click("#welcome-form button[type=submit]");
  check((await page.textContent("#welcome-status")) === "One field is still empty.", "app: you need a name to get started");
  await page.fill("#welcome-name", "Alex");
  await page.selectOption("#welcome-district", "Neukölln");
  await page.click("#welcome-form button[type=submit]");
  check((await page.textContent("#greeting")) === "Welcome, Alex", "app: Welcome, Alex");
  check((await page.locator(".tabbar a").allTextContents()).join() === "Home,Explore,Settings", "app: three tabs, each with a label");
  check(await page.getAttribute('.tabbar a[data-tab="home"]', "aria-current") === "page", "app: Home is the current tab");
  check(await page.$eval("#city", (s) => s.selectedOptions[0].textContent) === "Neukölln" && await page.locator("#city option").count() === 12, "app weather: your district (Neukölln) of Berlin's 12");
  check(await page.isVisible("#fab-note"), "app: a New note button floats on Home");
  await page.click("#fab-note");
  check((await page.textContent("#sheet-title")) === "Update garden", "app: New note opens Update garden");
  await sheetInPlace(page);
  check(await page.evaluate(() => Math.abs(document.querySelector("#sheet").getBoundingClientRect().bottom - document.querySelector(".phone").getBoundingClientRect().bottom) < 2), "sheet: sits at the bottom of the screen");
  await page.click("#sheet-close");

  // Home
  check((await page.textContent("#tab-home .tagline")).startsWith("New to your allotment and the last gardener left no notes?"), "home: the tagline under the greeting");
  check((await page.textContent("#month-chip")).startsWith(`It's ${new Date().toLocaleDateString("en-GB", { month: "long" })}`), "home: says which month it is");
  await page.waitForFunction(() => document.querySelectorAll("#forecast tr").length === 8);
  check((await page.textContent("#forecast-summary")).startsWith("Frost risk") && await page.locator("#forecast-summary.has-frost").count() === 1, "home: the week's weather, with a frost warning");
  const jobs = page.locator("#jobs-box .checklist input");
  const jobCount = await jobs.count();
  await jobs.nth(0).check();
  await jobs.nth(1).check();
  check((await page.textContent("#jobs-box .jobs-progress")) === `2 of ${jobCount} done`, "home: the jobs checklist counts what's done");
  await page.locator("#season .chip").first().click();
  check(await page.isVisible("#sheet") && await page.locator("#sheet .facts").count() === 1, "home: an in-season plant opens its details");
  await page.keyboard.press("Escape");
  check(await page.isHidden("#sheet"), "sheet: Escape closes it");
  check(await page.locator(".mini-month").count() === 12, "home: the 12 months, small");
  await page.click('.mini-month[data-month="3"]');
  check((await page.textContent("#sheet-title")) === "March", "home: a month opens its own sheet");
  await page.goBack();
  check(await page.isHidden("#sheet"), "sheet: the phone's Back button closes it");
  const month = new Date().getMonth() + 1;
  check(await page.locator("#harvest-spot .mc-carrot").count() === (month === 10 ? 1 : 0) &&
    await page.locator("#harvest-spot .mc-stage:not(.mc-carrot)").count() === (month === 9 ? 1 : 0), "home: this month's mini-game");
  check((await page.textContent("#community-updates")).includes("Find a garden in Neukölln"), "home: not in a group yet, so it suggests Explore (in your district)");

  // Update garden
  await page.click("#update-garden");
  await page.click("#update-submit");
  check((await page.textContent("#update-status")) === "3 fields are still empty.", "update garden: empty fields are blocked");
  await page.selectOption("#update-kind", "Harvested");
  await page.fill("#update-plant", "Kale");
  await page.fill("#update-text", "First kale of the year");
  check(await page.getAttribute("#update-photo", "capture") === "environment", "update garden: the photo field opens the camera");
  await page.setInputFiles("#update-photo", join(FIXTURES, "iphone.heic"));
  await page.waitForFunction(() => document.querySelector("#update-photo-status").textContent === "Photo ready.", null, { timeout: 20000 });
  await page.click("#update-submit");
  check((await page.textContent("#update-status")) === "Saved to My notes." && await page.locator("#update-status.is-success").count() === 1 && (await page.textContent("#toast.show")) === "✓ Note saved", "update garden: the note is saved, with a green check and a pop-up");
  await page.check('#update-growing input[value="kale"]');
  await page.check('#update-growing input[value="garlic"]');
  await page.click("#update-growing button[type=submit]");
  check((await page.textContent("#growing-status")).startsWith("Saved"), "update garden: what I grow is saved");
  await page.click("#sheet-close");
  check((await page.textContent("#app-notes")).includes("First kale of the year") && await page.locator("#app-notes .note-photo").count() === 1, "home: the new note shows in My notes, with its photo");
  check(await page.locator("#app-notes li.is-new").count() === 1, "home: the new note is highlighted");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#photo-note")]);
  check(Boolean(chooser) && await page.isVisible("#update-photo"), "Photo note opens the camera straight away");
  await page.click("#sheet-close");

  // Suggestion box
  await page.click("#suggest-form button[type=submit]");
  check((await page.textContent("#suggest-status")) === "One field is still empty.", "suggestion box: empty is blocked");
  await page.fill("#suggest-text", "A reminder when it's time to sow tomatoes");
  await page.click("#suggest-form button[type=submit]");
  check((await page.textContent("#suggest-status")).startsWith("Thanks!") &&
    (await page.evaluate(() => JSON.parse(localStorage.getItem("garden-suggestions")).length)) === 1, "suggestion box: sent and saved");
  check(await page.locator("#suggest-status.is-success").count() === 1 && (await page.textContent("#toast.show")) === "✓ Suggestion sent", "suggestion box: a green check and a pop-up say it was sent");

  // All plants: search, then a plant with its photos
  await page.click("#all-plants");
  await page.fill("#app-plant-search", "kohl");
  check((await page.locator("#sheet [data-plant]:not([hidden])").allTextContents()).join() === "Kohlrabi,Kale,Brussels sprouts", "app plants: search by English or German name");
  await page.click('#sheet [data-plant="kale"]');
  check((await page.textContent("#sheet-title")) === "Kale" && await page.locator("#sheet .stage-photos img").count() === 3 && await page.locator("#sheet .plant-more[open]").count() === 1, "app plants: a plant shows its 3 photos and details");
  await page.click("#sheet-close");

  await page.reload();
  check((await page.textContent("#greeting")) === "Welcome back, Alex", "app: Welcome back, Alex after a reload");
  check((await page.textContent("#jobs-box .jobs-progress")).startsWith("2 of"), "home: ticked jobs are kept");

  // Explore
  await goTab(page, "explore");
  check(page.url().endsWith("#explore") && await page.getAttribute('.tabbar a[data-tab="explore"]', "aria-current") === "page", "tabs: Explore opens and the tab bar follows");
  check(!loaded.some((u) => /leaflet|tile\.openstreetmap/.test(u)) && await page.isVisible("#map-consent"), "explore: asks before loading the street map");
  await page.fill("#explore-search", "12043");
  await page.waitForTimeout(400);
  const nearPostcode = await distances(page, ".result-card .garden-meta");
  check((await page.textContent("#explore-count")).endsWith("closest to 12043 first") && nearPostcode.every((d, i) => i === 0 || d >= nearPostcode[i - 1]), "explore: postcode search, nearest first");
  await page.fill("#explore-search", "Wedding");
  await page.waitForTimeout(400);
  const wedding = await page.locator(".result-card .garden-meta").allTextContents();
  check(wedding.length > 3 && wedding.every((m) => m.includes("Wedding")), "explore: neighbourhood search (Wedding)");
  await page.check("#always-map");
  await page.click("#load-map");
  await page.waitForSelector("#app-map.leaflet-container");
  check(loaded.some((u) => u.endsWith("vendor/leaflet/leaflet.js")) && await page.isHidden("#map-consent"), "explore: Load map shows the map");
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("garden-app-v1")).prefs.autoMap)) === true, "explore: 'Always load the map' is remembered");

  await page.fill("#explore-search", "Sonnenbeet");
  await page.waitForTimeout(400);
  await page.click('#explore-results [data-garden="demo-wedding"]');
  check((await page.textContent("#sheet-title")) === "Sonnenbeet Wedding (example)", "explore: a garden opens in a sheet");
  await sheetInPlace(page);
  check(await page.evaluate(() => {
    const sheet = document.querySelector("#sheet");
    const box = sheet.getBoundingClientRect();
    return sheet.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
  }), "garden sheet: shows above the map");
  check(await page.locator("#sheet .note-card").count() === 3 && (await page.textContent("#sheet .hidden-notes")).startsWith("2 members-only notes"), "garden sheet: public notes, and how many are hidden");
  await page.fill("#app-join-message", "Hi! I just got a plot nearby.");
  await page.fill("#app-join-growing", "Tomatoes");
  await page.click("#app-join button[type=submit]");
  check((await page.textContent("#sheet .request-status")).includes("waiting for approval"), "join from the app: request pending");
  await page.clock.runFor(5000);
  await page.waitForSelector("#sheet .flash");
  check((await page.textContent("#sheet .flash")).includes("Anna accepted") &&
    await page.locator("#sheet .note-card .tag", { hasText: "Members only" }).count() === 2, "join from the app: accepted, members-only notes appear");
  await page.click("#sheet-close");
  check(await page.isHidden("#fab-note"), "app: the New note button is only on Home");

  // A full group: the waiting list
  await page.fill("#explore-search", "Spree");
  await page.waitForTimeout(400);
  await page.click('#explore-results [data-garden="demo-spree"]');
  check((await page.textContent("#sheet .places")).trim() === "Full: all 2 places are taken" && (await page.textContent("#app-join button[type=submit]")) === "Join the waiting list", "app: a full group offers the waiting list");
  await page.fill("#app-join-message", "Happy to wait.");
  await page.fill("#app-join-growing", "Beans");
  await page.click("#app-join button[type=submit]");
  check((await page.textContent("#sheet-flash")).startsWith("You're on the waiting list") && await page.locator("#app-leave-waiting").count() === 1, "app: you're on the waiting list");
  await page.click("#app-leave-waiting");
  check(await page.locator("#app-join").count() === 1, "app: you can leave the waiting list");
  await page.click("#sheet-close");

  // Start a group from the app; join requests go to the bottom, and fold away after 3
  await page.fill("#explore-search", "Allmende");
  await page.waitForTimeout(400);
  await page.click('#explore-results [data-garden="w332251381"]');
  await page.click("#app-start button[type=submit]");
  check((await page.textContent("#app-start-status")) === "One field is still empty.", "app: starting a group needs a description");
  await page.fill("#app-start-about", "Beds 40 to 44. We meet Sundays at 11.");
  await page.fill("#app-start-places", "2");
  await page.click("#app-start button[type=submit]");
  check((await page.textContent("#sheet-flash")).startsWith("Your group is ready") && await page.locator("#sheet-body > :last-child.sheet-requests .request-card").count() === 2, "app: your new group, with its join requests at the bottom");
  await page.evaluate(() => { // 3 more requests, as if the group were popular
    const state = JSON.parse(localStorage.getItem("garden-community-v1"));
    const group = state.groups.find((g) => g.gardenId === "w332251381");
    for (const name of ["Mia", "Jonas", "Lea"]) group.requests.push({ id: `extra-${name}`, name, growing: "Beans", message: "Hello!", date: "2026-10-20" });
    localStorage.setItem("garden-community-v1", JSON.stringify(state));
  });
  await page.click("#sheet-close");
  await page.click('#explore-results [data-garden="w332251381"]');
  check(await page.locator(".sheet-requests > .request-list .request-card").count() === 3 && (await page.textContent(".more-requests summary")) === "Show all 5 requests" && await page.locator(".more-requests:not([open])").count() === 1, "app: after 3 requests the rest fold away");
  await page.locator(".request-card", { hasText: "Yusuf" }).locator("[data-approve]").click();
  check((await page.textContent("#app-requests-status")).startsWith("Yusuf is now a member") && await page.locator("#app-requests-status.is-success").count() === 1, "app: approving says so next to the requests");
  check(await page.locator(".sheet-requests [data-approve]:disabled").count() === 4, "app: the group is full, so Approve is off");
  await page.click("#sheet .group-edit summary");
  await page.fill("#app-edit-places", "4");
  await page.fill("#app-edit-about", "Beds 40 to 44. New: Wednesdays too.");
  await page.click("#app-edit button[type=submit]");
  check((await page.textContent("#sheet-flash")) === "Group details saved." && (await page.textContent("#sheet .places")).trim() === "2 of 4 places taken · 2 places free" && await page.locator(".sheet-requests [data-approve]:disabled").count() === 0, "app: the owner can change the description and places");
  await page.click("#sheet-close");
  await goTab(page, "home");
  check((await page.textContent("#community-updates")).includes("Sonnenbeet Wedding") && await page.locator("#community-updates .note-card").count() > 0, "home: updates from your garden community");

  // Settings
  await goTab(page, "settings");
  check(await page.locator("#app-faq details").count() === 10, "settings: the same 10 FAQ questions");
  await page.fill("#app-profile-name", "Alexandra");
  await page.click("#app-profile-submit");
  check((await page.textContent("#app-profile-status")) === "Profile saved." && (await page.textContent("#greeting")) === "Welcome back, Alexandra", "settings: a new name shows in the greeting");
  await page.uncheck("#pref-near-me");
  await goTab(page, "explore");
  check(await page.isHidden("#explore-near"), "permissions: 'Near me' off hides the button");
  await goTab(page, "settings");
  await page.uncheck("#pref-sounds");
  await goTab(page, "home");
  await plays();
  if (await page.locator("#harvest-spot .mc-carrot").count()) await page.click("#harvest-spot .mc-carrot");
  check((await plays()).length === 0, "permissions: sounds off means no sound");
  await goTab(page, "settings");
  await page.check('input[name="pref-visibility"][value="public"]');
  const desktop = await ctx.newPage();
  await desktop.goto(BASE + "garden.html?id=demo-wedding");
  check(await desktop.isChecked('input[name="visibility"][value="public"]'), "permissions: new group notes default to Public (desktop page too)");
  await desktop.close();
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#download-notes")]);
  check(download.suggestedFilename().startsWith("garden-notes-"), "settings: Download my notes gives a file");
  await page.click("#logout");
  check(await page.isVisible("#welcome") && (await page.textContent("#welcome-title")) === "Welcome back, Alexandra", "log out: back to the welcome screen");
  await page.click("#welcome-form button[type=submit]"); // the name is filled in
  check((await page.textContent("#app-notes")).includes("First kale of the year"), "log back in: the notes are still there");
  await goTab(page, "settings");
  await page.click("#delete-profile");
  check(await page.isVisible("#welcome") && (await page.inputValue("#welcome-name")) === "", "delete profile: back to an empty welcome screen");
  check(await page.evaluate(() => ["garden-app-v1", "garden-notes", "garden-suggestions"].every((key) => localStorage.getItem(key) === null)), "delete profile: name, notes and suggestions erased");
  check(errors.length === 0, `app: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ---------- The app works offline and can be installed ----------
{
  const { page, ctx } = await open("app.html", { context: { viewport: { width: 390, height: 844 }, isMobile: true } });
  const manifest = await (await page.request.get(BASE + "manifest.webmanifest")).json();
  check(manifest.display === "standalone" && manifest.start_url === "app.html#home", "PWA: the manifest makes it a full-screen app");
  const icons = await Promise.all(manifest.icons.map((i) => page.request.get(BASE + i.src)));
  check(icons.length === 3 && icons.every((r) => r.ok()), "PWA: its home-screen icons exist");
  const scope = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => r.scope));
  check(scope.endsWith("/app"), "PWA: the offline worker looks after the app only");
  await page.reload(); // now the worker controls the page
  await page.evaluate(() => navigator.serviceWorker.controller || new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve)));
  await ctx.setOffline(true);
  await page.reload();
  check(await page.isVisible("#welcome") && (await page.textContent("#welcome-title")) === "Community Garden", "PWA: the app still opens with no internet");
  await ctx.setOffline(false);
  await ctx.close();
}

// ---------- The lo-fi prototype page ----------
{
  const { page } = await open("prototype.html");
  const legend = (frame) => page.locator(`[data-wf-legend-for="${frame}"] [data-wf-legend]:not([hidden]) h3`).textContent();
  const desktop = page.locator("#wf-desktop");
  const mobile = page.locator("#wf-mobile");
  check((await legend("wf-desktop")) === "Home" && await desktop.locator("[data-n]").count() > 20, "lo-fi: desktop wireframe starts on Home, with numbered notes");
  await desktop.locator('.wf-nav [data-wf-go="gardens"]').click();
  check((await legend("wf-desktop")) === "Find a garden" && (await desktop.locator("[data-wf-title]").textContent()) === "FIND A GARDEN" &&
    await desktop.locator('.wf-nav [data-wf-go="gardens"]').getAttribute("aria-current") === "true", "lo-fi: the nav switches screens, title and notes");
  await desktop.locator(".wf-result").first().click();
  check((await legend("wf-desktop")) === "A garden, as a visitor", "lo-fi: a result opens the garden");
  await desktop.locator('[data-wf-go="garden-member"]').click();
  check((await legend("wf-desktop")) === "A garden, as a member" && await desktop.locator('.wf-nav [data-wf-go="gardens"]').getAttribute("aria-current") === "true", "lo-fi: Ask to join leads to the member view");
  await desktop.locator('.wf-nav [data-wf-scroll="faq"]').click();
  check((await legend("wf-desktop")) === "Home" && await desktop.locator(".wf-viewport").evaluate((v) => v.scrollTop > 100), "lo-fi: FAQ jumps down to the questions");
  check((await legend("wf-mobile")) === "Welcome" && await mobile.locator(".wf-tabbar").isHidden(), "lo-fi: the phone starts on Welcome, without tabs");
  await mobile.locator('[data-wf-go="m-home"]').first().click();
  check((await legend("wf-mobile")) === "Home" && await mobile.locator(".wf-tabbar").isVisible(), "lo-fi: Get started opens Home and the tab bar");
  await mobile.locator('[data-wf-open="sheet-update"]').first().click();
  check((await legend("wf-mobile")) === "Update garden (sheet)" && await mobile.locator('[data-wf-sheet="sheet-update"]').isVisible(), "lo-fi: Update garden opens its sheet");
  await mobile.locator('[data-wf-sheet="sheet-update"] [data-wf-close]').click();
  check((await legend("wf-mobile")) === "Home", "lo-fi: closing the sheet goes back to Home's notes");
  await mobile.locator('.wf-tabbar [data-wf-go="m-explore"]').click();
  await mobile.locator('[data-wf-open="sheet-garden"]').first().click();
  check((await legend("wf-mobile")) === "A garden (sheet)", "lo-fi: Explore, then a result opens the garden sheet");
  await mobile.locator('[data-wf-sheet="sheet-garden"] [data-wf-close]').click(); // like the app, an open sheet covers the tabs
  await mobile.locator('.wf-tabbar [data-wf-go="m-settings"]').click();
  check((await legend("wf-mobile")) === "Settings", "lo-fi: Settings tab");
  await mobile.locator('[data-wf-go="welcome"]').click();
  check((await legend("wf-mobile")) === "Welcome" && await mobile.locator(".wf-tabbar").isHidden(), "lo-fi: Log out goes back to Welcome");
  await page.close();
}

await browser.close();
server?.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exitCode = failures ? 1 : 0;
