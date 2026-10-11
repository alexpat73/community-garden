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

## Run it locally

No build step and no install: open `index.html` in a browser. The forecast needs an internet connection; everything else works offline.

## Files

- `data.js`: all plant and month data. Edit this to add plants or change dates.
- `app.js`: the logic for every page.
- `style.css`: all styles.
- `font/`: the Urbanist web font and its licence.
- `PROCESS_LOG.md`: my process log (Class Notebook).

## Credits

- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- Font: [Urbanist](https://github.com/coreyhu/Urbanist) by Corey Hu, SIL Open Font License 1.1.
- Monthly climate values are approximate long-term averages for central Germany.
- Minecraft pumpkin textures and sounds © Mojang Studios. Plants vs. Zombies peashooter © PopCap / Electronic Arts. Used for a non-commercial university project; not affiliated with either.
