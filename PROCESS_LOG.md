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

---

## Entry 2 · 11 October 2026 · Usability pass with Nielsen's heuristics

### Session goal

Evaluate the first version against Nielsen Norman Group's 10 usability heuristics ([source](https://www.nngroup.com/articles/ten-usability-heuristics/)) and fix what I found.

### How the session went

| # | What I asked the AI (summarised) | What the AI did | What I decided or changed |
|---|---|---|---|
| 1 | Shared my heuristic notes and my list of improvements: a new colour palette, an FAQ, a simpler font like Aristotelica Pro, consistent and required fields in the notes form with a 1000-character limit, no tan band behind the nav, sentence case for the intro, and `max-width: 65ch` on body text. | Implemented the whole list, then tested it and checked screenshots made with WebKit (Safari's engine). | Wrote the evaluation, chose the palette and gave each colour one job: tan = important, green = you can click this. |
| 2 | Added the Aristotelica Pro font files to the project. | Read the licence stored inside the font files: the free version excludes websites and sharing the files. Rendered Aristotelica next to 8 free fonts to find the closest match. | Went with Urbanist, a free font that looks very similar. The Aristotelica files stay on my computer and are blocked from the repo. |
| 3 | Commit, publish and add this entry. | Pushed to GitHub and checked the live site. | — |

### Changes, by heuristic

- **#1 Visibility of system status:** a live character counter on notes ("45 / 1000 characters"), clear status messages ("Note saved.", "2 fields are still empty."), and the current page shown in tan in the nav.
- **#2 Match between the system and the real world:** the FAQ explains garden terms like "start indoors", "sow outdoors" and "plant out".
- **#4 Consistency and standards:** each colour has one job everywhere; every form field has the same look; the FAQ link sits in the same place on every page.
- **#5 Error prevention:** "All fields are required" is shown before typing; the note is capped at 1000 characters; "What happened" starts on "Choose one…" instead of a pre-selected answer; the note box can't be dragged down the whole page.
- **#8 Aesthetic and minimalist design:** a simpler font, no band behind the nav, comfortable line length (65ch), and FAQ answers folded away until opened.
- **#9 Help users recognise, diagnose and recover from errors:** a plain-language message under each empty field ("Write which plant this is about."), a coral border, and the cursor jumps to the first empty field.
- **#10 Help and documentation:** an FAQ for first-time gardeners at the bottom of the home page, with nine questions (watering, spacing, frost, allotment rules, what to do when the previous gardener left nothing), reachable from the nav on every page.

### Problems and fixes

- **Font licence:** Aristotelica Pro's free licence says *"for use of the font on websites as webfonts … a software license is required"* and forbids sharing the files. Fix: Urbanist (SIL Open Font License), with the Aristotelica files added to `.gitignore`.
- **Date field taller than the others in Safari:** fixed by giving all single-line fields the same height.
- **The Plant field's error border stayed grey:** CSS specificity. The base rule `input:not([type="file"])` was more specific than `[aria-invalid="true"]`, because `:not()` counts what's inside it. Fix: a more specific error selector.
- **Intro wider than the text below it:** `ch` depends on the element's own font size, and the intro is 1.3× bigger. Fix: `max-width: calc(65ch / 1.3)`.
- **A warning got overwritten:** if the browser blocked storage, "Note saved." replaced the warning that it *wasn't* saved. Fixed.
- **Screenshots showed the month cards mirrored:** a small control test proved the screenshot method ignores `backface-visibility`; real Safari doesn't. No change needed.

### Testing

- Three automated test suites (jsdom). New tests cover the form checks, the character counter, the nav and the FAQ. Tests that assumed it was September now use today's date. All pass.
- Screenshots with WebKit at desktop and phone width, which caught the date-field and error-border bugs above.
- Contrast checked against WCAG: body text 14.4:1, tan 7.4:1, green 6.5:1, error coral 7.2:1. All are above the 4.5:1 needed for normal text.

### Web optimization notes

- The font is hosted with the site and cut down to the characters the site uses: 25 KB instead of 85 KB. It is preloaded, and `font-display: swap` shows text right away while it loads.
- No Google Fonts: loading fonts from Google sends visitors' IP addresses to Google, which a German court (LG München, 2022) ruled a GDPR violation.

### What I learned

- "Free for personal use" doesn't mean free to use on a website, and the licence text is stored inside the font file itself.
- The `ch` unit is relative to the element's own font size.
- `:not()` adds to a selector's specificity.
- `color-scheme: dark` makes the browser's own form controls (date picker, dropdowns) match a dark site.

### Next steps

- October easter egg: a carrot harvest instead of the pumpkin.
- Contrast on the card fronts: "Spring" on green is 4.3:1 and the summer card is 3.1:1, below the 4.5:1 that small text needs.
- Tags are green but not clickable, which bends the "green = click" rule; decide whether to keep them green.
- Still open from Entry 1: background image and month photos, a smaller favicon, a Lighthouse audit, testing on a real phone.


---

## Entry 3 · 11–12 October 2026 · Nav hover and the October carrot

### Session goal

Bring back a hover effect in the nav, and build the October easter egg from my Entry 1 plan: a Minecraft carrot you can plant, grow and harvest, as interactive as the September pumpkin.

### How the session went

| # | What I asked the AI (summarised) | What the AI did | What I decided or changed |
|---|---|---|---|
| 1 | Add back the hover effect on the nav tabs, as a lighter green instead of an underline. | Lighter green tab with dark text (8.2:1). Noticed tan text on light green would be unreadable (1.1:1), so the current page also switches to dark text on hover. | Chose lighter green. |
| 2 | The carrot files are in; tell me if anything is missing. I want to plant, click to grow until ready, then harvest. | Checked my files and listed what was missing: the carrot item, the dirt texture and (optional) a bone meal sound. Built the game so missing textures had stand-ins and the real ones were used automatically once added. | Found and supplied all the textures and sounds. |
| 3 | Which files exactly? | Gave the exact file names and where to find them. | Downloaded them. |
| 4 | Uploaded them, plus the bone meal sound. | Found that my `dirt.png` was a 3D picture of a whole block, not the flat texture, so it couldn't be used on the block's sides. | Replaced it with the flat 16×16 texture. |
| 5 | Add Entry 3 and keep the tests in the repo. | Moved the browser tests into `tests/` (run with `npm test`) and wrote this entry. | — |

### How the carrot works

1. **Plant:** click the dry farmland; it turns dark (watered) and a seedling appears, with a crop-placing sound.
2. **Grow:** each click is one growth step with green bone-meal sparkles and the bone meal sound. Minecraft carrots have 8 growth ages sharing 4 pictures, so it takes 7 clicks; the hint counts up ("Growing… 4 / 7").
3. **Harvest:** click when it says "Ready!"; 2–5 carrots drop around the block, as in Minecraft.
4. **Pick up:** click to collect them (one pop sound per carrot); a counter keeps score and the farmland dries out for the next round.

It works with the keyboard, holding Enter can't skip steps, and a double click right after harvesting can't grab the carrots before they land.

### Problems and fixes

- **Wrong kind of image:** my first `dirt.png` was a rendered 3D block, not a flat texture. Lesson: Minecraft Wiki pages show both, and only the flat texture can go on a block face.
- **The screenshot tool flattened 3D:** WebKit screenshots showed the block as a single slanted face. The AI switched to a real headless Chromium, which renders CSS 3D properly.
- **Carrots landed on the block:** they first appeared on the block's front face. They now land in a curve around its base, so they look like they're lying on the ground.
- **A test mistake, not a site bug:** the first real-mouse test of the pumpkin failed because it pressed a spot that was scrolled off-screen. After scrolling it into view, the pumpkin passed.
- **Two mini-games, one system:** "September = pumpkin" became a month-to-game list (`HARVEST_GAMES`), so another month's game is one line to add.

### Testing

- Tests now run in a real browser (Playwright with headless Chromium) instead of a simulated one: real clicks, key presses and rendering. 44 checks cover every page, the notes form, the full carrot cycle (including keyboard use) and the pumpkin. All pass, locally and on the live site.
- The tests live in `tests/` and run with `npm test`.

### What I learned

- Minecraft crops are four flat pictures crossed like a `#`; in CSS that's four planes with `rotateY` and `translateZ`.
- Not every screenshot method renders CSS 3D; testing needs a real browser engine.
- Automated tests can be wrong too: a failing test needs checking before blaming the code.

### Next steps

- Card-front contrast ("Spring" 4.3:1, summer 3.1:1).
- Decide whether tags stay green even though they aren't clickable.
- Still open: background image and month photos, a smaller favicon, a Lighthouse audit, testing on a real phone.
