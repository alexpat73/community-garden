// Builds gardens-data.js: every named community garden and allotment colony in Berlin,
// with its district and neighbourhood, plus the centres of Berlin's neighbourhoods and
// postcode areas (for "search by postcode"). From OpenStreetMap. Run by hand to refresh:
//
//   node tools/fetch-gardens.mjs
//
// The data is © OpenStreetMap contributors, available under the ODbL 1.0,
// so gardens-data.js is ODbL too and must keep its credit line.

import { writeFile } from "node:fs/promises";

const OUT = new URL("../gardens-data.js", import.meta.url);
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "CommunityGarden student project (https://github.com/alexpat73/community-garden)";

// The 12 Berlin districts (Bezirke), in a fixed order: gardens store an index into this list.
const DISTRICTS = [
  "Charlottenburg-Wilmersdorf", "Friedrichshain-Kreuzberg", "Lichtenberg", "Marzahn-Hellersdorf",
  "Mitte", "Neukölln", "Pankow", "Reinickendorf", "Spandau", "Steglitz-Zehlendorf",
  "Tempelhof-Schöneberg", "Treptow-Köpenick",
];

// One query: for each district, output the district, then the gardens inside it.
const QUERY = `
[out:json][timeout:180];
area["name"="Berlin"]["admin_level"="4"]->.berlin;
rel(area.berlin)["boundary"="administrative"]["admin_level"="9"];
map_to_area->.districts;
foreach.districts->.district(
  .district out tags;
  (
    nwr["leisure"="garden"]["garden:type"="community"]["name"](area.district);
    nwr["landuse"="allotments"]["name"](area.district);
  );
  out center tags;
);`;

// Second query: the neighbourhoods (Ortsteile) and postcode areas with their centres,
// then for each neighbourhood the ids of the gardens inside it.
const AREAS_QUERY = `
[out:json][timeout:180];
area["name"="Berlin"]["admin_level"="4"]->.berlin;
(
  rel(area.berlin)["boundary"="administrative"]["admin_level"="10"];
  rel(area.berlin)["boundary"="postal_code"];
);
out center tags;
rel(area.berlin)["boundary"="administrative"]["admin_level"="10"];
map_to_area->.hoods;
foreach.hoods->.hood(
  .hood out tags;
  (
    nwr["leisure"="garden"]["garden:type"="community"]["name"](area.hood);
    nwr["landuse"="allotments"]["name"](area.hood);
  );
  out ids;
);`;

async function overpass(query) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    });
    if (res.ok) return res.json();
    // Overpass is often busy (429 / 502 / 504): wait longer each time, then try again.
    const wait = 2 ** attempt * 5;
    console.log(`Overpass answered ${res.status}, retrying in ${wait} s (attempt ${attempt}/6)…`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  }
  throw new Error("Overpass kept failing, try again later.");
}

const round = (n) => Math.round(n * 1e5) / 1e5; // 5 decimals is about 1 m

const { elements } = await overpass(QUERY);
const seenIds = new Set();
const byNameAndDistrict = new Map();
let district = -1;

for (const el of elements) {
  if (el.type === "area") {
    district = DISTRICTS.indexOf(el.tags?.name); // -1 for anything outside Berlin's 12 districts
    continue;
  }
  const id = `${el.type[0]}${el.id}`; // e.g. "w123456", also used for the OpenStreetMap link
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (district < 0 || seenIds.has(id) || lat == null) continue;
  seenIds.add(id);

  const tags = el.tags;
  // Skip single plots that are only mapped by their number ("27", "3a").
  if (/^\s*(nr\.?\s*)?\d+\s*[a-z]?\s*$/i.test(tags.name) || tags.name.trim().length < 3) continue;
  const type = tags.leisure === "garden" ? "c" : "a"; // community garden / allotment colony
  const key = `${type}|${tags.name.trim().toLowerCase()}|${district}`;
  if (byNameAndDistrict.has(key)) continue; // one colony is often mapped as several areas
  byNameAndDistrict.set(key, [
    tags.name.trim(), type, round(lat), round(lon), district,
    tags.website || tags["contact:website"] || "", tags["addr:postcode"] || "", id,
  ]);
}

// Numbered series ("hdr 1" ... "hdr 24", "Clusterkern 1" ... "11") are plots or beds inside a bigger
// garden, not gardens anyone can join: drop a series once it has 3 or more entries in one district.
const seriesKey = (g) => `${g[1]}|${g[0].replace(/[\s.-]*\d+[a-z]?$/i, "").trim().toLowerCase()}|${g[4]}`;
const seriesSize = new Map();
for (const g of byNameAndDistrict.values()) {
  if (/\d+[a-z]?$/i.test(g[0])) seriesSize.set(seriesKey(g), (seriesSize.get(seriesKey(g)) || 0) + 1);
}
const isPlotSeries = (g) => /\d+[a-z]?$/i.test(g[0]) && seriesSize.get(seriesKey(g)) >= 3;

// Neighbourhoods and postcodes
const areasAnswer = await overpass(AREAS_QUERY);
const neighbourhoods = [];          // [name, lat, lon]
const postcodes = {};               // "12043": [lat, lon]
const neighbourhoodOf = new Map();  // garden id -> neighbourhood name
let currentHood = null;
for (const el of areasAnswer.elements) {
  if (el.type === "area") { currentHood = el.tags?.name ?? null; continue; }
  if (el.tags && el.center) { // the centres, listed before the per-neighbourhood ids
    const code = el.tags.postal_code;
    if (el.tags.boundary === "postal_code" && /^\d{5}$/.test(code) && code >= "10115" && code <= "14199") {
      postcodes[code] = [round(el.center.lat), round(el.center.lon)];
    } else if (el.tags.admin_level === "10" && el.tags.name) {
      neighbourhoods.push([el.tags.name, round(el.center.lat), round(el.center.lon)]);
    }
    continue;
  }
  if (currentHood) neighbourhoodOf.set(`${el.type[0]}${el.id}`, currentHood);
}
neighbourhoods.sort((a, b) => a[0].localeCompare(b[0], "de"));
const hoodIndex = new Map(neighbourhoods.map((n, i) => [n[0], i]));
for (const g of byNameAndDistrict.values()) {
  const hood = neighbourhoodOf.get(g[7]);
  g.push(hood != null && hoodIndex.has(hood) ? hoodIndex.get(hood) : -1);
}

const gardens = [...byNameAndDistrict.values()]
  .filter((g) => !isPlotSeries(g))
  .sort((a, b) => a[0].localeCompare(b[0], "de"));
const today = new Date().toISOString().slice(0, 10);
const js = `// Berlin community gardens and allotment colonies.
// Data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
// Generated ${today} by tools/fetch-gardens.mjs. Do not edit by hand.
// Each garden: [name, type ("c" community garden, "a" allotment colony), lat, lon,
//               district index, website, postcode, OpenStreetMap id, neighbourhood index or -1]
const GARDEN_DISTRICTS = ${JSON.stringify(DISTRICTS)};
// Neighbourhoods (Ortsteile): [name, lat, lon] of their centre
const GARDEN_AREAS = ${JSON.stringify(neighbourhoods)};
// Berlin postcode areas: "12043": [lat, lon] of their centre
const POSTCODES = ${JSON.stringify(postcodes)};
const GARDENS = [
${gardens.map((g) => JSON.stringify(g)).join(",\n")}
];
`;
await writeFile(OUT, js);
const count = (t) => gardens.filter((g) => g[1] === t).length;
console.log(`Wrote ${gardens.length} gardens (${count("c")} community gardens, ${count("a")} allotment colonies), ` +
  `${neighbourhoods.length} neighbourhoods, ${Object.keys(postcodes).length} postcodes, ${(js.length / 1024).toFixed(0)} KB.`);
console.log(`Gardens without a neighbourhood: ${gardens.filter((g) => g[8] < 0).length}`);
