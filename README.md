# Community Garden

A planting guide for first-time allotment holders in Germany: what to sow, plant and harvest each month, with typical German weather, a live frost forecast, and a garden diary so the next plot holder isn't left without notes.

**Live app:** https://alexpat73.github.io/community-garden/
**Mobile app:** https://alexpat73.github.io/community-garden/app.html

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
| `app.html` | The mobile app: Home, Explore and Settings tabs (see below) |
| `prototype.html` | Lo-fi prototype: clickable greyscale wireframes of the desktop site and the mobile app, with numbered notes on every screen |

**Garden groups are a prototype:** the example groups and anything you add are saved only in your browser, and join requests are answered by a pretend admin after a few seconds. "Reset prototype data" on the Gardens page brings the examples back.

## Mobile app

`app.html` is a phone-style app with three tabs. On a computer it shows inside a phone frame; on a phone it fills the screen. The desktop home page has a QR code that opens it.

- **Home:** a welcome, this week's weather with frost warnings, Update garden (a note with an optional camera photo, plus what you're growing), this month's jobs checklist, what's in season and the 12 months, updates from your garden groups, your notes, the month's mini-game and a suggestion box.
- **Explore:** search gardens by district, neighbourhood or postcode, or "Near me". The street map loads after one tap (or automatically, if allowed in Settings). A garden opens in a sheet with its public notes and a form to ask to join; once accepted, the members-only notes appear.
- **Settings:** profile, permissions (location, map, sounds, the default for new group notes), FAQ, installing the app, downloading notes, log out and delete profile.

It is **installable and works offline** (a web app manifest and a service worker, `sw.js`, which only looks after the app). On iPhone: Share → Add to Home Screen; on Android: menu → Install app. Like the rest of the prototype, nothing is sent anywhere: everything stays on the phone.

## Run it locally

No build step and no install: open `index.html` in a browser. The forecast needs an internet connection; everything else works offline.

## Tests

Browser tests for every page, the notes form, both mini-games, the garden groups and the mobile app, including working offline (they use [Playwright](https://playwright.dev/)):

```
npm install
npx playwright install chromium-headless-shell
npm test
```

## Files

- `data.js`: all plant and month data. Edit this to add plants or change dates.
- `gardens-data.js`: the Berlin gardens, generated from OpenStreetMap. To refresh it, run `node tools/fetch-gardens.mjs`.
- `community-demo.js`: the made-up example groups, members and notes.
- `community.js`: the Gardens and garden-group pages, the shared garden search (`findGardens`) and the photo handling (iPhone HEIC photos are converted in the browser).
- `app.html`, `mobile.js`, `mobile.css`: the mobile app. `manifest.webmanifest` and `sw.js` make it installable and work offline.
- `prototype.html`, `prototype.js`, `prototype.css`: the lo-fi prototype page.
- `app.js`: the logic for every page.
- `style.css`: all styles.
- `font/`: the Urbanist web font and its licence.
- `vendor/`: Leaflet (the map) and heic-to (the HEIC converter), each loaded only when needed, and the Font Awesome icons used in the app. Each has its licence.
- `tools/`: scripts that make generated files: `fetch-gardens.mjs` (the garden data), `make-app-icons.mjs` (the app icons) and `make-qr.mjs` (the QR code).
- `tests/`: the browser tests.
- `PROCESS_LOG.md`: my process log (Class Notebook).

## Credits

- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- Garden data and map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. `gardens-data.js` is available under the ODbL 1.0.
- Map: [Leaflet](https://leafletjs.com) 1.9.4, BSD 2-Clause licence.
- HEIC photos: [heic-to](https://github.com/hoppergee/heic-to) 1.6.6, built on [libheif](https://github.com/strukturag/libheif), GNU LGPL 3.0. Included unmodified; see `vendor/heic-to/`.
- Font: [Urbanist](https://github.com/coreyhu/Urbanist) by Corey Hu, SIL Open Font License 1.1.
- Icons in the app: [Font Awesome Free](https://fontawesome.com) 7.3.1, CC BY 4.0 (see `vendor/fontawesome/`).
- QR code made with [qrcode](https://github.com/soldair/node-qrcode) (MIT), a development tool only.
- Monthly climate values are approximate long-term averages for central Germany.
- Minecraft textures and sounds (pumpkin, carrot) © Mojang Studios. Plants vs. Zombies peashooter © PopCap / Electronic Arts. Used for a non-commercial university project; not affiliated with either.
