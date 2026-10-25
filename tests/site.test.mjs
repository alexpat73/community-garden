// Browser tests for every page, the notes form, both harvest mini-games and the garden groups.
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
  "garden.html?id=demo-wedding", "garden.html?id=w332251381", "garden.html?id=does-not-exist"]) {
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
  check(await page.locator("#faq details").count() === 10, "home: 10 FAQ questions");
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
  check(neukolln.length > 0 && neukolln.every((m) => m.startsWith("Community garden · Neukölln")), `district + type filters (${neukolln.length} community gardens in Neukölln)`);
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

// ---------- Your own group: start it, answer requests, delete it ----------
{
  const { page, ctx } = await open("garden.html?id=w332251381", { before: (page) => page.on("dialog", (d) => d.accept()) });
  await page.click("#start-form button[type=submit]");
  check((await page.textContent("#start-status")) === "2 fields are still empty.", "start a group: empty fields are blocked");
  await page.fill("#start-name", "Alex");
  await page.fill("#start-about", "Beds 40 to 44 on Tempelhofer Feld. We meet Sundays at 11.");
  await page.click("#start-form button[type=submit]");
  check((await page.textContent("#group-flash")).startsWith("Your group is ready"), "start a group: confirmation");
  check(await page.locator(".request-card").count() === 2, "owner: 2 example join requests arrive");
  await page.locator(".request-card", { hasText: "Yusuf" }).locator("[data-approve]").click();
  check((await page.textContent("#requests-status")).startsWith("Yusuf is now a member"), "owner: approving says so next to the requests");
  check(await page.locator(".member-card", { hasText: "Yusuf" }).count() === 1, "owner: Yusuf joins the members");
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

await browser.close();
server?.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exitCode = failures ? 1 : 0;
