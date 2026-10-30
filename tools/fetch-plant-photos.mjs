// Gets a photo of every plant at three stages (seedling, growing, ready) from Wikimedia Commons,
// saves a small copy in images/plants/ and writes plant-photos.js with the credits.
//   node tools/fetch-plant-photos.mjs                 (all plants)
//   node tools/fetch-plant-photos.mjs tomato kale     (only these)
// Needs the test browser (npx playwright install chromium-headless-shell), which crops and shrinks the photos.
// Only free licences are used (public domain, CC0, CC BY, CC BY-SA); every photo is credited.
// The photos were chosen by eye and are listed in PICK. A new plant gets the first search result
// for its SEARCH words: look at it, and add the right file to PICK.

import { chromium } from "playwright";
import { mkdir, writeFile, readFile, readdir, unlink } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "CommunityGarden student project (https://github.com/alexpat73/community-garden)";
const WIDTH = 240, HEIGHT = 180; // small 4:3 copies: shown at about 120 px wide, sharp on phones
const STAGES = ["Seedling", "Growing", "Ready"];

// What to search for, per plant: [seedling, growing, ready to harvest]
const SEARCH = {
  tomato: ["tomato seedling", "tomato plant flowers garden", "ripe tomatoes on the vine"],
  pepper: ["pepper seedlings", "bell pepper plant", "red bell peppers plant"],
  chilli: ["chili pepper seedling", "chili pepper plant", "ripe chili peppers plant"],
  cucumber: ["cucumber seedling", "cucumber plant flower", "cucumber fruit on plant"],
  zucchini: ["zucchini seedling", "zucchini plant flower", "zucchini fruit plant"],
  pumpkin: ["pumpkin seedling", "pumpkin plant flower leaves", "pumpkins field harvest"],
  "bush-bean": ["bean seedling Phaseolus vulgaris", "bush bean plant", "green beans harvest"],
  "broad-bean": ["broad bean seedling", "Vicia faba flowers", "broad bean pods"],
  pea: ["pea seedlings", "pea plant flowers", "pea pods"],
  radish: ["radish seedlings", "radish plants garden bed", "radishes harvested bunch"],
  lettuce: ["lettuce seedlings", "lettuce plants garden", "lettuce head"],
  "lambs-lettuce": ["Valerianella locusta seedling", "Valerianella locusta plant", "corn salad lamb's lettuce"],
  spinach: ["spinach seedlings", "spinach plants garden", "spinach leaves harvest"],
  chard: ["swiss chard seedlings", "swiss chard plants", "swiss chard harvest"],
  carrot: ["carrot seedlings", "carrot plants garden", "carrots freshly harvested"],
  beetroot: ["beetroot seedlings", "beetroot plants garden", "beetroot harvest"],
  parsnip: ["parsnip seedling", "parsnip plants", "parsnips harvested"],
  potato: ["chitting seed potatoes", "potato plants flowering field", "potato harvest"],
  kohlrabi: ["kohlrabi seedlings", "kohlrabi plant garden", "kohlrabi harvest"],
  kale: ["kale seedlings", "kale plants garden", "kale leaves harvest"],
  "brussels-sprouts": ["brussels sprouts seedlings", "brussels sprouts plant", "brussels sprouts on stalk"],
  leek: ["leek seedlings", "leeks growing garden", "leeks harvested"],
  onion: ["onion sets planting", "onion plants garden", "onions harvest"],
  garlic: ["garlic sprouts", "garlic plants garden", "garlic bulbs harvest"],
  strawberry: ["strawberry plant young", "strawberry flowers plant", "ripe strawberries plant"],
  rhubarb: ["rhubarb emerging spring", "rhubarb plant leaves", "rhubarb stalks"],
  basil: ["basil seedlings", "basil plant", "basil leaves harvest"],
  parsley: ["parsley seedlings", "parsley plant", "parsley bunch"],
  chives: ["chives sprouting", "chives plant", "chives flowers"],
  dill: ["dill seedlings", "dill plant", "dill flowering umbels"],
  "pot-marigold": ["calendula seedlings", "calendula plant", "Calendula officinalis flower"],
};

// The Commons file for each photo, checked by eye. Key: "<plant>-<stage number>".
const PICK = {
  "tomato-1": "File:Tomato seedling - geograph.org.uk - 6732033.jpg",
  "tomato-2": "File:Starr-090707-2404-Solanum lycopersicum-green fruit-Olinda-Maui (24851067712).jpg",
  "tomato-3": "File:Grape tomatoes on the vine at Ljubljana Central Market.JPG",
  "pepper-1": "File:Capsicum annuum 2020-05-21 8787.jpg",
  "pepper-2": "File:Bell Pepper Plant from Senegal 02.jpg",
  "pepper-3": "File:Bell pepper plant from lalbagh 2317.JPG",
  "chilli-1": "File:JfPlantsSRafaelGrafts668Bulacanfvf.JPG",
  "chilli-2": "File:Buds and flowers of chili plants.jpg",
  "chilli-3": "File:Ripe Banana Pepper Plant.jpg",
  "cucumber-1": "File:Cucumber seedling, S3.png",
  "cucumber-2": "File:Flower of the cucumber plant.jpg",
  "cucumber-3": "File:Ryerson Market cucumbers on sale.jpg",
  "zucchini-1": "File:Zucchini Junpflanzen-Josef Schlaghecken.jpg",
  "zucchini-2": "File:Cucurbita pepo Zucchini flower and plant.jpg",
  "zucchini-3": "File:Calabacín, Múnich, Alemania, 2013-03-30, DD 01.JPG",
  "pumpkin-1": "File:Giant Pumpkin Seedling 2.jpg",
  "pumpkin-2": "File:Pumpkin plant.jpg",
  "pumpkin-3": "File:Pie Pumpkins ready for harvest near Princeville, Illinois USA.jpg",
  "bush-bean-1": "File:Pinto Bean Plant.jpg",
  "bush-bean-2": "File:Starr-081031-0364-Phaseolus vulgaris-flowers-Makawao-Maui (24296025234).jpg",
  "bush-bean-3": "File:Phaseolus Vulgaris.jpg",
  "broad-bean-1": "File:-2020-10-27 Young Broad bean plant (Vicia faba), Trimingham (1).JPG",
  "broad-bean-2": "File:Dicke Bohne (Vicia faba) Blüte, Josef Schlaghecken.jpg",
  "broad-bean-3": "File:Broad bean pods (3).jpg",
  "pea-1": "File:Pisum sativum var. macrocarpum Ilowiecki 2017-04-15 7157.jpg",
  "pea-2": "File:Pisum sativum flowers J1.jpg",
  "pea-3": "File:Peas in pods - Studio.jpg",
  "radish-1": "File:Sprouting chonggakmu(chonggak radish).jpg",
  "radish-2": "File:Radish Raphanus sativus raised bed Harmony Gardens Broadwater Farm Estate Haringey London England 01.jpg",
  "radish-3": "File:Freshly harvested radishes from a home garden held by a hand during a sunny day in early summer.jpg",
  "lettuce-1": "File:Australe lettuce (5596426954).jpg",
  "lettuce-2": "File:Lactuca sativa 'Lollo Bionda'.jpg",
  "lettuce-3": "File:Lettuce Mini Heads (7331119710).jpg",
  "lambs-lettuce-1": "File:Valerianella locusta kz05.jpg",
  "lambs-lettuce-2": "File:(MHNT) Valerianella locusta - inflorescences and Leaf.jpg",
  "lambs-lettuce-3": "File:Corn salad, spring, close up.JPG",
  "spinach-1": "File:Man tending to seedlings of spinach.jpg",
  "spinach-2": "File:Spinazie vrouwelijke plant (Spinacia oleracea female plant).jpg",
  "spinach-3": "File:Fresh Spinach and Kale harvest at the farm.jpg",
  "chard-1": "File:Swiss-Chard-Seedlings 1641.JPG",
  "chard-2": "File:Blätter vom Roten Mangold (Chard).jpg",
  "chard-3": "File:Swiss chard bunches.jpg",
  "carrot-1": "File:Daucus carota kz01.jpg",
  "carrot-2": "File:Carrot-plant-leaves.JPG",
  "carrot-3": "File:The garden delivers carrots.jpg",
  "beetroot-1": "File:Young Beetroot.jpg",
  "beetroot-2": "File:-2019-09-15 Beetroot plants, Trimingham.JPG",
  "beetroot-3": "File:Beetroots in a basket.jpg",
  "parsnip-1": "File:Pastinaca sativa kz07.jpg",
  "parsnip-2": "File:Pastinaca sativa kz04.jpg",
  "parsnip-3": "File:Root vegetables, 2007.jpg",
  "potato-1": "File:Chitted seed potatoes.jpg",
  "potato-2": "File:Flowering potato plants - geograph.org.uk - 4564166.jpg",
  "potato-3": "File:Potato harvest - the trailer is almost full - geograph.org.uk - 1539463.jpg",
  "kohlrabi-1": "File:Kohlrabi Keimlinge in EPT--Josef Schlaghecken.jpg",
  "kohlrabi-2": "File:Kurpfalzhof Kohlrabi Oktober 2011.JPG",
  "kohlrabi-3": "File:Kohlrabi Harvest (35788395260).jpg",
  "kale-1": "File:Young Kale plants.jpg",
  "kale-2": "File:Curly kale by the A17 - geograph.org.uk - 637097.jpg",
  "kale-3": "File:Kale greens in bunches.jpg",
  "brussels-sprouts-1": "File:Brussels Sprouts Seedlings.JPG",
  "brussels-sprouts-2": "File:Brussels Sprouts plants growing in New Jersey in April.jpg",
  "brussels-sprouts-3": "File:Brussels sprouts on the stalk closeup.jpg",
  "leek-1": "File:Prei kiemplanten (Allium porrum seedlings).jpg",
  "leek-2": "File:Innerstädtischer Erwerbsgartenbau in Bamberg - Pflanzen im Garten des Gärtner- und Häckermuseums 01.jpg",
  "leek-3": "File:Harvesting leeks - geograph.org.uk - 1528589.jpg",
  "onion-1": "File:-2020-10-27 An onion seedling (Allium cepa), Trimingham.JPG",
  "onion-2": "File:Spring onion plants grown on a piece of land.jpg",
  "onion-3": "File:Harvested vegetables(Onions).jpg",
  "garlic-1": "File:2499Garlic sprouts 01.jpg",
  "garlic-2": "File:Garlic plant sown.jpg",
  "garlic-3": "File:Garlic Bulbs (Unsplash).jpg",
  "strawberry-1": "File:Young plants of strawberries D150124.jpg",
  "strawberry-2": "File:Bloem van een tuinaardbei (Fragaria ×ananassa), 026-04-2026. (d.j.b.) 02.jpg",
  "strawberry-3": "File:Elderly person collects ripe strawberries in greenhouse.jpg",
  "rhubarb-1": "File:Rhabarber-Austrieb.jpg",
  "rhubarb-2": "File:-2021-07-24 Rhubarb plant (Rheum rhabarbarum), Trimingham.JPG",
  "rhubarb-3": "File:Rheum rhabarbarum.2006-04-27.uellue.jpg",
  "basil-1": "File:Ocimum basilicum - seedlings 2.jpg",
  "basil-2": "File:Young lemon basil plant (Ocimum × africanum).jpg",
  "basil-3": "File:Verdant Whispers By Raju C Reddy.jpg",
  "parsley-1": "File:Parsley seedling.jpg",
  "parsley-2": "File:Petroselinum crispum 003.JPG",
  "parsley-3": "File:Parsley bunches - Wellington, New Zealand.jpg",
  "chives-1": "File:Chive seedlings sprouting.jpg",
  "chives-2": "File:Allium schoenoprasum (Bieslook). actm.jpg",
  "chives-3": "File:Allium schoenoprasum (Bieslook) d.j.b.jpg",
  "dill-1": "File:Dill 070416 (462076689).jpg",
  "dill-2": "File:Anethum graveolens20090812 475.jpg",
  "dill-3": "File:Liat Portal for Foodie Disorder - Fresh Dill.jpg",
  "pot-marigold-1": "File:Calendula officinalis 0zz.jpg",
  "pot-marigold-2": "File:Calendula officinalis in Catalonia (6).jpg",
  "pot-marigold-3": "File:Calendula officinalis 31122014 (2).jpg",
};

const FREE_LICENCE = /^(cc0|public domain|cc by(-sa)? \d(\.\d)?( [a-z-]+)?)$/i;
const NOT_A_PHOTO = /illustration|drawing|köhler|botanical|plate|diagram|map|logo|stamp|painting|herbar|packet|poster|icon|svg|\.gif|\.tif/i;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// The author as Commons gives it, without links, e-mail requests or a repeated user name.
// Without an author, the person who uploaded the photo.
function authorName(info) {
  const name = strip(info.extmetadata?.Artist?.value)
    .replace(/\s*\b(I'd|I would|please|e-?mail)\b.*$/i, "")
    .replace(/^(.+?) \(\1\)$/, "$1");
  return (name || info.user?.replace(/~\w+$/, "") || "Unknown").slice(0, 80);
}

async function commons(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res.json();
    await pause(2000 * attempt);
  }
  throw new Error(`Commons kept failing for ${url}`);
}

const IMAGE_INFO = { prop: "imageinfo", iiprop: "url|size|mime|user|extmetadata", iiurlwidth: String(WIDTH * 2), iiextmetadatafilter: "LicenseShortName|Artist|LicenseUrl" };

function usable(page, used) {
  const info = page.imageinfo?.[0];
  if (!info || used.has(page.title)) return false;
  const licence = info.extmetadata?.LicenseShortName?.value ?? "";
  const ratio = info.width / info.height;
  return FREE_LICENCE.test(licence) && /jpeg|png/.test(info.mime) && !NOT_A_PHOTO.test(page.title)
    && info.width >= 500 && ratio > 0.6 && ratio < 2.2;
}

async function find(query, used) {
  const data = await commons({ action: "query", generator: "search", gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: "6", gsrlimit: "20", ...IMAGE_INFO });
  const pages = (data.query?.pages ?? []).sort((a, b) => a.index - b.index);
  return pages.find((page) => usable(page, used));
}

async function byTitle(title) {
  const data = await commons({ action: "query", titles: title, ...IMAGE_INFO });
  return data.query?.pages?.[0];
}

// Crops the middle of the photo to 4:3 and saves it as a small JPEG, in the browser's canvas.
const browser = await chromium.launch();
const page = await browser.newPage();
async function shrink(buffer, mime) {
  const dataUrl = await page.evaluate(async ({ src, w, h }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.max(w / img.width, h / img.height);
    const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
    canvas.getContext("2d").drawImage(img, (img.width - w / scale) / 2, (img.height - h / scale) / 2, w / scale, h / scale, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, { src: `data:${mime};base64,${buffer.toString("base64")}`, w: WIDTH, h: HEIGHT });
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

const only = process.argv.slice(2);
const outFile = new URL("plant-photos.js", root);
let photos = {};
try { // keep earlier results for the plants not asked for
  photos = JSON.parse((await readFile(outFile, "utf8")).match(/= (\{[\s\S]*\});/)[1]);
} catch { /* first run */ }

await mkdir(new URL("images/plants/", root), { recursive: true });
const used = new Set(Object.values(photos).flat().map((p) => p.title));

for (const [id, queries] of Object.entries(SEARCH)) {
  if (only.length && !only.includes(id)) continue;
  for (const p of photos[id] ?? []) used.delete(p.title);
  photos[id] = [];
  for (let i = 0; i < 3; i++) {
    const page = PICK[`${id}-${i + 1}`] ? await byTitle(PICK[`${id}-${i + 1}`]) : await find(queries[i], used);
    if (!page?.imageinfo) { console.log(`  ${id} ${STAGES[i]}: nothing found for "${queries[i]}"`); continue; }
    const info = page.imageinfo[0];
    used.add(page.title);
    const file = `images/plants/${id}-${i + 1}.jpg`;
    const res = await fetch(info.thumburl, { headers: { "User-Agent": USER_AGENT } });
    await writeFile(new URL(file, root), await shrink(Buffer.from(await res.arrayBuffer()), res.headers.get("content-type")));
    photos[id].push({
      src: file, stage: STAGES[i], title: page.title,
      author: authorName(info),
      license: info.extmetadata.LicenseShortName.value,
      licenseUrl: info.extmetadata?.LicenseUrl?.value ?? "",
      page: info.descriptionurl,
    });
    console.log(`  ${id} ${STAGES[i]}: ${page.title} (${info.extmetadata.LicenseShortName.value})`);
    await pause(300);
  }
}

await browser.close();

// Remove old copies that are no longer used
const kept = new Set(Object.values(photos).flat().map((p) => p.src));
for (const name of await readdir(new URL("images/plants/", root))) {
  if (!kept.has(`images/plants/${name}`)) await unlink(new URL(`images/plants/${name}`, root));
}

await writeFile(outFile, `// Photos of each plant at three stages, from Wikimedia Commons. Every photo has its own free licence
// and is credited on the All Plants page. Small copies are saved in images/plants/.
// Generated by tools/fetch-plant-photos.mjs. Do not edit by hand.
const PLANT_PHOTOS = {
${Object.entries(photos).map(([id, list]) => ` ${JSON.stringify(id)}: [\n${list.map((p) => `  ${JSON.stringify(p)}`).join(",\n")}\n ]`).join(",\n")}
};
`);
console.log(`Wrote plant-photos.js (${Object.values(photos).flat().length} photos)`);
