// Builds gardens-data.js: every named community garden and allotment colony in Berlin,
// from OpenStreetMap. Run by hand when the list should be refreshed:
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

const gardens = [...byNameAndDistrict.values()]
  .filter((g) => !isPlotSeries(g))
  .sort((a, b) => a[0].localeCompare(b[0], "de"));
const today = new Date().toISOString().slice(0, 10);
const js = `// Berlin community gardens and allotment colonies.
// Data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
// Generated ${today} by tools/fetch-gardens.mjs. Do not edit by hand.
// Each garden: [name, type ("c" community garden, "a" allotment colony), lat, lon,
//               district index, website, postcode, OpenStreetMap id]
const GARDEN_DISTRICTS = ${JSON.stringify(DISTRICTS)};
const GARDENS = [
${gardens.map((g) => JSON.stringify(g)).join(",\n")}
];
`;
await writeFile(OUT, js);
const count = (t) => gardens.filter((g) => g[1] === t).length;
console.log(`Wrote ${gardens.length} gardens (${count("c")} community gardens, ${count("a")} allotment colonies), ${(js.length / 1024).toFixed(0)} KB.`);
