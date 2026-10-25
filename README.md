# Community Garden

A planting guide for first-time allotment holders in Germany: what to sow, plant and harvest each month, with typical German weather, a live frost forecast, and a garden diary so the next plot holder isn't left without notes.

**Live app:** https://alexpat73.github.io/community-garden/

Made for the GUI Design & Web Optimization course. The brief:

> **Community garden allotments.** A first-time plot holder at a community garden needs to know what to plant and when, while the previous gardener left no usable notes behind.

## Pages

| Page | What it does |
|---|---|
| `index.html` | 12 flip cards, one per month, and a "Right now" box with a live 7-day forecast for 11 German cities and frost warnings |
| `month.html?m=1` … `?m=12` | Typical weather, jobs for the month, what to sow / plant out / harvest, and your notes from that month |
| `plants.html` | Year calendar table and profiles for 31 plants, with German names |
| `notes.html` | Garden diary saved in the browser; download it as a file to back it up or hand it over |
| `gardens.html` | Find a garden: about 980 real community gardens and allotment colonies in Berlin, searchable by name, district and distance, with a street map that loads on request |
| `garden.html?id=…` | One garden and its group: public and members-only notes, members and what they grow, photos, join requests (prototype) |

**Garden groups are a prototype:** the example groups and anything you add are saved only in your browser, and join requests are answered by a pretend admin after a few seconds. "Reset prototype data" on the Gardens page brings the examples back.

## Run it locally

No build step and no install: open `index.html` in a browser. The forecast needs an internet connection; everything else works offline.

## Tests

Browser tests for every page, the notes form and both mini-games (they use [Playwright](https://playwright.dev/)):

```
npm install
npx playwright install chromium-headless-shell
npm test
```

## Files

- `data.js`: all plant and month data. Edit this to add plants or change dates.
- `gardens-data.js`: the Berlin gardens, generated from OpenStreetMap. To refresh it, run `node tools/fetch-gardens.mjs`.
- `community-demo.js`: the made-up example groups, members and notes.
- `community.js`: the Gardens and garden-group pages, including the photo handling (iPhone HEIC photos are converted in the browser).
- `app.js`: the logic for every page.
- `style.css`: all styles.
- `font/`: the Urbanist web font and its licence.
- `vendor/`: Leaflet (the map) and heic-to (the HEIC converter), each with its licence. Both load only when needed.
- `tests/`: the browser tests.
- `PROCESS_LOG.md`: my process log (Class Notebook).

## Credits

- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- Garden data and map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. `gardens-data.js` is available under the ODbL 1.0.
- Map: [Leaflet](https://leafletjs.com) 1.9.4, BSD 2-Clause licence.
- HEIC photos: [heic-to](https://github.com/hoppergee/heic-to) 1.6.6, built on [libheif](https://github.com/strukturag/libheif), GNU LGPL 3.0. Included unmodified; see `vendor/heic-to/`.
- Font: [Urbanist](https://github.com/coreyhu/Urbanist) by Corey Hu, SIL Open Font License 1.1.
- Monthly climate values are approximate long-term averages for central Germany.
- Minecraft textures and sounds (pumpkin, carrot) © Mojang Studios. Plants vs. Zombies peashooter © PopCap / Electronic Arts. Used for a non-commercial university project; not affiliated with either.
