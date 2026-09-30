# Process Log (Class Notebook)

**Project:** Community Garden, a planting guide for first-time allotment holders in Germany
**Course:** GUI Design & Web Optimization
**Live app:** https://alexpat73.github.io/community-garden/
**Repo:** https://github.com/alexpat73/community-garden
**AI tool:** Claude Code (Claude Opus 5.5) in VS Code

---

## Entry 1 · 30 September 2026 · From brief to a deployed first version

### The brief

> **Community garden allotments.** A first-time plot holder at a community garden needs to know what to plant and when, while the previous gardener left no usable notes behind.

I read this as two problems:

1. **"What to plant and when"**: a month-by-month guide for a beginner.
2. **"No usable notes"**: a way to keep my own notes and hand them over to whoever gets the plot next.

### Session goal

Functionality first, design later: a working version online that I can design over in later sessions.

### How the session went

| # | What I asked the AI (summarised) | What the AI did | What I decided or changed |
|---|---|---|---|
| 1 | Which language is most appropriate? Keep the design bare-bones. | Recommended plain HTML, CSS and JavaScript: no framework, no build step, small and fast, easy to restyle later. Proposed five features. | Went with HTML/CSS/JS. |
| 2 | Reuse the design and grid of my earlier album-showcase project, with one card per month instead of per album, and base the weather on Germany. | Rebuilt the site on my layout (title, gold navbar, flip-card grid, detail pages with previous/next). Wrote a German planting calendar for 31 plants and typical monthly weather, and added a live forecast. | Kept my design. Dropped the plot-planner idea, because the month grid covers the grid part of the assignment. |
| 3 | Which class draws the frame when you click a vegetable? | Explained it is `.plant:target`: an outline on the section the link jumps to. | Replaced it with my own animated dashed border. |
| 4 | Why doesn't my animated dashed border show? | Found three causes (see *Problems and fixes*). | Applied the fix myself and slowed the animation to 8 s. |
| 5 | It's September, pumpkin harvest: could we have a Minecraft pumpkin breaking, or the Plants vs. Zombies pumpkin being placed? | Explained both options and asked for the artwork. | Chose Minecraft. Supplied the textures, the 10 crack stages and the wood-dig sound. Chose to show it on the home page and the September page. |
| 6 | Add my item pick-up sound for when the pumpkin is collected. | Wired it to the pick-up. | Found and supplied the sound. |
| 7 | Deploy to GitHub Pages or Netlify and start this process log. | Set up Git, the GitHub CLI and GitHub Pages, and drafted this entry. | Chose GitHub Pages so the app and the repo live in one place. |

### What the app does now

- **Home:** 12 flip cards, one per month. The front shows the month and season; the back shows typical temperatures, frost risk and how many plants to sow, plant and harvest. The current month is outlined. A "Right now" box shows a live 7-day forecast for 11 German cities with frost warnings.
- **Month pages:** typical German weather, jobs for the month, what to start indoors, sow outdoors, plant out and harvest, and my own notes from that month.
- **All Plants:** a year calendar table and profiles for 31 plants: spacing, sun, water, difficulty, good and bad neighbours, and German names for buying seeds.
- **My Notes:** a garden diary saved in the browser. It can be downloaded as a file and loaded again, so it can be passed on to the next plot holder.
- **Pumpkin easter egg (September):** hold down on a 3D Minecraft pumpkin to break it through 10 crack stages. It drops a spinning item to pick up, with sounds and a harvest counter.

### Design decisions and why

- **My own album-grid design as the base:** the site had a consistent look from the start, and a 12-card grid fits both the grid requirement and the 12 months.
- **Placeholder colours instead of images:** season colours (winter blue, spring green, summer gold, autumn brown) stand in until I add my own month photos.
- **Germany-specific content:** German rules of thumb like the Eisheiligen (frost-tender plants go out only after 15 May) and Johannistag (stop picking rhubarb on 24 June), plus German plant names.
- **Accessibility:** the pumpkin also works with the keyboard (hold Space or Enter), and its animations switch off when "reduce motion" is set on the device.

### Problems and fixes

- **The flip card showed the back image mirrored.** My album grid swapped the image on hover while rotating it. The AI used the front/back card from my `test.css` instead (with `backface-visibility: hidden`), so the back reads correctly.
- **My animated dashed border didn't show.** Three causes: the old solid `outline` was still there; the dashes were `#333` on a dark green background, so almost invisible; and they are drawn on the element's own edge with no padding, so they touched the text. Fix: remove the outline, make the dashes gold, add `padding`.
- **Pumpkin keyboard bug (found by the AI reviewing its own code):** holding Space to break the block moved focus to the dropped item, so releasing Space picked it up instantly. Fixed with a single button that switches between "block" and "item" and waits for the key to be released.
- **One feature could break another (found in testing):** if the pumpkin code failed, the forecast after it never loaded. The pumpkin now checks for the browser feature it needs first.
- **Deployment:** GitHub Pages is case-sensitive but macOS isn't, so every file path was checked for exact spelling before publishing. Open-Meteo's free licence (CC BY 4.0) requires credit, so an attribution line was added under the forecast.

### Testing

The AI ran automated headless browser tests (jsdom) on all four pages: the month cards, previous/next wrap-around (December → January), invalid URLs, the live forecast, saving, deleting and importing notes, HTML escaping in notes, and the full pumpkin cycle with mouse and keyboard. All passed. Still to do: check it by hand on a phone and in Safari.

### Web optimization notes

- No frameworks and no build step; the whole site is about 250 KB.
- The biggest file by far is the peashooter favicon SVG (about 170 KB, two-thirds of the site). All 14 Minecraft textures together are about 2.5 KB.
- The forecast loads after the page, so the rest of the page works without it, even offline.

### My own changes (not AI)

- Plants vs. Zombies peashooter favicon.
- Animated dashed border (`border-dance`) on the selected plant.
- All pumpkin textures and sounds.
- Small edits to the data and styles.

### What I learned

- The `:target` selector styles whatever element the `#id` in the URL points to.
- An `outline` and a `background` are separate layers: `outline-offset` moves only the outline.
- CSS 3D transforms (`transform-style: preserve-3d`, `rotateX`, `rotateY`) can build a cube from six faces, and `image-rendering: pixelated` keeps 16×16 textures sharp when scaled up.

### Next steps

- Design pass: background image, month photos on the cards (`#m1` to `#m12`), better navbar contrast (white on gold is hard to read).
- Shrink the favicon (e.g. with SVGO, or use a small PNG) and run a Lighthouse audit.
- Test on a phone and in Safari.
- Maybe show the pumpkin in October too, or build the Plants vs. Zombies pumpkin idea.
- For October, it will be a carrot harvested, instead of a pumpkin