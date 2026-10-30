// ============================================================
// Community Garden - logic for every page.
// Each page has <body data-page="..."> and the matching render function runs.
// Plant and month data lives in data.js.
// ============================================================

const NOTES_KEY = "garden-notes";
const CITY_KEY = "garden-city";

// ---------- Small helpers ----------

const $ = (selector) => document.querySelector(selector);

function currentMonth() {
  return new Date().getMonth() + 1;
}

// Keeps a month number in 1-12, so December + 1 = January.
function wrapMonth(n) {
  return ((n - 1 + 12) % 12) + 1;
}

function monthUrl(n) {
  return `month.html?m=${n}`;
}

// Makes text safe to put inside HTML (important for user notes).
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plantsFor(month, stage) {
  return PLANTS.filter((p) => (p[stage] || []).includes(month));
}

// "Kürbis Straße" and "kurbis strasse" should match each other.
const simplify = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase();

// Does the plant's English or German name contain the searched text? ("kurbis" finds Kürbis)
function plantMatches(p, text) {
  return simplify(`${p.name} ${p.de}`).includes(simplify(text.trim()));
}

// What a plant needs in a month, e.g. ["Sow outdoors", "Harvest"].
function plantJobsIn(p, month) {
  return STAGES.filter((s) => (p[s.key] || []).includes(month)).map((s) => s.label);
}

// [10, 11, 12, 1, 2] -> "Oct-Feb", [2, 3, 9, 10] -> "Feb-Mar, Sep-Oct"
function formatMonths(list) {
  if (!list || !list.length) return "";
  const sorted = [...new Set(list)].sort((a, b) => a - b);
  const runs = [];
  for (const m of sorted) {
    const last = runs[runs.length - 1];
    if (last && m === last[1] + 1) last[1] = m;
    else runs.push([m, m]);
  }
  // A run ending in December continues into January's run.
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) {
    const first = runs.shift();
    runs[runs.length - 1][1] = first[1];
  }
  const short = (m) => MONTHS[m - 1].short;
  return runs.map(([a, b]) => (a === b ? short(a) : `${short(a)}–${short(b)}`)).join(", ");
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-09-30" -> "30 Sep 2026"
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// localStorage can be blocked (private mode, strict settings), so never let it crash the page.
function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function loadNotes() {
  try {
    const notes = JSON.parse(storageGet(NOTES_KEY));
    return Array.isArray(notes) ? notes.filter((note) => note && typeof note.date === "string") : [];
  } catch {
    return [];
  }
}
// The mobile app's profile and settings (app.html). Kept here because other pages read them too.
const APP_KEY = "garden-app-v1";
const APP_DEFAULTS = {
  signedIn: false, returning: false, name: "", district: "", photo: null, growing: [],
  prefs: { nearMe: true, autoMap: false, noteVisibility: "members" },
};
function loadAppSettings() {
  const settings = structuredClone(APP_DEFAULTS);
  try {
    const saved = JSON.parse(storageGet(APP_KEY));
    if (saved && typeof saved === "object") Object.assign(settings, saved, { prefs: { ...settings.prefs, ...saved.prefs } });
  } catch {
    // broken or missing: use the defaults
  }
  return settings;
}
const saveAppSettings = (settings) => storageSet(APP_KEY, JSON.stringify(settings));

// Only our own resized photos (JPEG/PNG data URLs) are shown, e.g. from the app's photo notes or an imported file.
const safePhoto = (photo) => (typeof photo === "string" && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(photo) ? photo : "");
const notePhoto = (note) => (safePhoto(note.photo) ? `<img class="note-photo" src="${note.photo}" alt="Photo for this note">` : "");

// Saves the notes as a JSON file (desktop My Notes page and the app's Settings).
function downloadNotes(notes) {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `garden-notes-${todayISO()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function saveNotes(notes) {
  return storageSet(NOTES_KEY, JSON.stringify(notes));
}

// ---------- Month flip card (same structure as the album cards) ----------

function monthCard(n) {
  const m = MONTHS[n - 1];
  const sowCount = new Set([...plantsFor(n, "indoors"), ...plantsFor(n, "outdoors")]).size;
  return `
    <div class="maincontainer">
      <div class="thecard">
        <div class="thefront season-${m.season}" id="m${n}">
          <span class="card-month">${m.name}</span>
          <span class="card-season">${m.season}</span>
        </div>
        <div class="theback">
          <p class="card-month">${m.name}</p>
          <p>Day ${m.high} °C · Night ${m.low} °C</p>
          <p>Frost risk: ${m.frostRisk}</p>
          <p>Sow ${sowCount} · Plant ${plantsFor(n, "plant").length} · Harvest ${plantsFor(n, "harvest").length}</p>
        </div>
      </div>
    </div>`;
}

// ---------- Home page ----------

function renderHome() {
  const now = currentMonth();
  $("#now-month").innerHTML = `It's <strong>${MONTHS[now - 1].name}</strong>. <a href="${monthUrl(now)}">See what to do this month →</a>`;

  $("#month-grid").innerHTML = MONTHS.map((m, i) => {
    const n = i + 1;
    const isNow = n === now;
    return `
      <figure class="${isNow ? "current" : ""}">
        <a href="${monthUrl(n)}" aria-label="${m.name}: what to sow, plant and harvest">${monthCard(n)}</a>
        <figcaption>
          <h2>${m.name}</h2>
          ${isNow ? '<p class="badge">This month</p>' : ""}
        </figcaption>
      </figure>`;
  }).join("");

  HARVEST_GAMES[now]?.($("#harvest-spot"));
  $("#faq-list").innerHTML = faqHtml();
  setupForecast();
}

// The FAQ from data.js as fold-out questions (answers are trusted HTML from data.js, not user input).
function faqHtml() {
  return FAQ.map(({ q, a }) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("");
}

// Live 7-day forecast from Open-Meteo (free, no API key needed).
// The forecast is for one of Berlin's districts: the one picked last time, else the district
// in the app profile, else Mitte.
function setupForecast() {
  const select = $("#city");
  select.innerHTML = WEATHER_DISTRICTS.map((d, i) => `<option value="${i}">${esc(d.name)}</option>`).join("");
  const byName = (name) => WEATHER_DISTRICTS.findIndex((d) => d.name === name);
  const index = [storageGet(CITY_KEY), loadAppSettings().district, "Mitte"].map(byName).find((i) => i >= 0);
  select.value = String(index);

  select.addEventListener("change", () => {
    storageSet(CITY_KEY, WEATHER_DISTRICTS[select.value].name);
    loadForecast(WEATHER_DISTRICTS[select.value]);
  });
  loadForecast(WEATHER_DISTRICTS[select.value]);
}

let forecastRequest = 0;

async function loadForecast(city) {
  const request = ++forecastRequest; // ignore old answers if the city changed meanwhile
  const summary = $("#forecast-summary");
  const table = $("#forecast");
  summary.textContent = "Loading forecast…";
  table.innerHTML = "";

  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${city.lat}&longitude=${city.lon}`
    + "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
    + "&timezone=Europe%2FBerlin&forecast_days=7";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const daily = (await res.json()).daily;
    if (request !== forecastRequest) return;

    const frostDays = [];
    let totalRain = 0;
    const rows = daily.time.map((day, i) => {
      const name = new Date(`${day}T12:00`).toLocaleDateString("en-GB", { weekday: "short" });
      const high = Math.round(daily.temperature_2m_max[i]);
      const low = Math.round(daily.temperature_2m_min[i]);
      const rain = daily.precipitation_sum[i] || 0;
      const frost = daily.temperature_2m_min[i] <= 2; // ground frost is likely around +2 °C air temperature
      totalRain += rain;
      if (frost) frostDays.push(name);
      return `<tr class="${frost ? "frost" : ""}"><th>${name}</th><td>${high} °C</td><td>${low} °C</td><td>${rain.toFixed(1)} mm</td><td>${frost ? "Frost risk" : ""}</td></tr>`;
    });

    table.innerHTML = `<tr><th>Day</th><th>High</th><th>Low</th><th>Rain</th><th></th></tr>${rows.join("")}`;

    const messages = [];
    messages.push(frostDays.length
      ? `Frost risk on ${frostDays.join(", ")}: cover tender plants or keep them inside.`
      : "No frost expected this week.");
    if (totalRain < 5) messages.push("Very little rain coming, so plan to water.");
    summary.textContent = messages.join(" ");
  } catch {
    if (request !== forecastRequest) return;
    summary.textContent = "Couldn't load the forecast right now (are you offline?). The monthly guide below still works.";
  }
}

// ---------- Month page ----------

function renderMonth() {
  const param = parseInt(new URLSearchParams(location.search).get("m"), 10);
  const n = param >= 1 && param <= 12 ? param : currentMonth();
  const m = MONTHS[n - 1];

  document.title = `${m.name} · Community Garden`;
  $("#month-title").textContent = m.name.toUpperCase();
  $("#prev-month").href = monthUrl(wrapMonth(n - 1));
  $("#next-month").href = monthUrl(wrapMonth(n + 1));
  $("#month-card").innerHTML = monthCard(n);

  $("#weather").innerHTML = `
    <h2>Weather in a typical German ${m.name}</h2>
    <dl class="facts">
      <dt>Daytime</dt><dd>${m.high} °C</dd>
      <dt>Night</dt><dd>${m.low} °C</dd>
      <dt>Rain</dt><dd>about ${m.rain} mm</dd>
      <dt>Daylight</dt><dd>about ${m.daylight} hours</dd>
      <dt>Frost risk</dt><dd>${m.frostRisk}. ${m.frostNote}</dd>
    </dl>
    <p class="small">Long-term averages for central Germany. The north is a little milder in winter; the south and higher ground are colder. Check the live forecast on the home page before planting out.</p>`;

  $("#jobs").innerHTML = `<h2>Jobs for ${m.name}</h2><div class="jobs-box" id="jobs-box"></div>`;
  setupJobs($("#jobs-box"), n); // tick jobs off and add your own; the app's Home shares this month's list

  $("#sow").innerHTML = `
    <h2>Sow</h2>
    <h3>Start indoors (windowsill)</h3>${plantList(n, "indoors")}
    <h3>Sow outdoors</h3>${plantList(n, "outdoors")}`;
  $("#plant").innerHTML = `<h2>Plant out</h2>${plantList(n, "plant")}`;
  $("#harvest").innerHTML = `<h2>Harvest</h2>${plantList(n, "harvest")}`;
  if (HARVEST_GAMES[n]) {
    const spot = document.createElement("div");
    spot.className = "harvest-spot";
    $("#harvest").append(spot);
    HARVEST_GAMES[n](spot);
  }

  const notes = loadNotes()
    .filter((note) => Number(note.date.slice(5, 7)) === n)
    .sort((a, b) => b.date.localeCompare(a.date));
  $("#month-notes").innerHTML = `
    <h2>Your notes from ${m.name}</h2>
    ${notes.length
      ? `<ul>${notes.map(noteSummary).join("")}</ul>`
      : `<p class="empty">No notes for ${m.name} yet. <a href="notes.html">Add one</a> so next year you know what happened.</p>`}`;
}

function plantList(month, stage) {
  const plants = plantsFor(month, stage);
  if (!plants.length) return '<p class="empty">Nothing this month.</p>';
  return `<ul class="plant-names">${plants.map((p) => {
    const extra = [];
    if (p.notes && p.notes[stage]) extra.push(p.notes[stage]);
    if (p.tender && month === 5 && (stage === "plant" || stage === "outdoors")) extra.push("only after 15 May");
    return `<li>
      <a href="plants.html#${p.id}">${esc(p.name)}</a> <span class="de">(${esc(p.de)})</span>
      ${p.difficulty === "Easy" ? '<span class="tag">easy</span>' : ""}
      ${extra.length ? `<span class="note">- ${esc(extra.join("; "))}</span>` : ""}
    </li>`;
  }).join("")}</ul>`;
}

function noteSummary(note) {
  return `<li><strong>${esc(formatDate(note.date))}</strong> · ${esc(note.kind)}${note.plant ? ` · ${esc(note.plant)}` : ""}
    ${note.text ? `<br><span class="note-text">${esc(note.text)}</span>` : ""}${notePhoto(note)}</li>`;
}

// ---------- All plants page ----------

function renderPlants() {
  const now = currentMonth();
  const types = [...new Set(PLANTS.map((p) => p.type))];

  // The whole year as a table (folded away under the list)
  const head = `<tr><th>Plant</th>${MONTHS.map((m, i) =>
    `<th class="${i + 1 === now ? "now" : ""}">${m.short}</th>`).join("")}</tr>`;
  const body = types.map((type) => {
    const rows = PLANTS.filter((p) => p.type === type).map((p) => {
      const cells = MONTHS.map((m, i) => {
        const stages = STAGES.filter((s) => (p[s.key] || []).includes(i + 1));
        const title = stages.map((s) => s.label).join(", ");
        return `<td class="${i + 1 === now ? "now" : ""}" title="${title}">${stages.map((s) => s.code).join(" ")}</td>`;
      }).join("");
      return `<tr><th><a href="#${p.id}">${esc(p.name)}</a></th>${cells}</tr>`;
    }).join("");
    return `<tr class="group"><th colspan="13">${type}</th></tr>${rows}`;
  }).join("");
  $("#calendar").innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;

  // The list of plant cards, with a search and filters
  $("#plant-type").insertAdjacentHTML("beforeend", types.map((type) => `<option>${esc(type)}</option>`).join(""));
  for (const option of document.querySelectorAll("#plant-when option[data-text]")) {
    option.textContent = `${option.dataset.text} ${MONTHS[now - 1].name}`;
  }
  $("#plant-list").innerHTML = PLANTS.map((p) => plantDetails(p)).join("");
  renderPhotoCredits();

  const form = $("#plant-filters");
  function filter() {
    const text = $("#plant-search").value;
    const type = $("#plant-type").value;
    const when = $("#plant-when").value;
    const easy = $("#plant-easy").checked;
    let shown = 0;
    for (const p of PLANTS) {
      const jobs = plantJobsIn(p, now);
      const match = plantMatches(p, text) && (!type || p.type === type) && (!easy || p.difficulty === "Easy")
        && (!when || (when === "any" && jobs.length > 0)
          || (when === "sow" && jobs.some((job) => job !== "Harvest")) || (when === "harvest" && jobs.includes("Harvest")));
      document.getElementById(p.id).hidden = !match;
      if (match) shown++;
    }
    $("#plant-count").textContent = shown === PLANTS.length ? `All ${shown} plants` : `${shown} of ${PLANTS.length} plants`;
    $("#plant-empty").hidden = shown > 0;
  }
  form.addEventListener("input", filter);
  form.addEventListener("change", filter);
  form.addEventListener("submit", (event) => event.preventDefault()); // Enter in the search box stays on the page
  $("#plant-reset").addEventListener("click", () => {
    form.reset();
    filter();
    $("#plant-search").focus();
  });
  filter();

  // A link from the year table shows that plant, even if the filters hid it.
  $("#calendar").addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && document.getElementById(link.hash.slice(1))?.hidden) {
      form.reset();
      filter();
    }
  });

  // The plant cards are created by JavaScript, so jump to #tomato etc. ourselves: straight there,
  // not the page's smooth scroll, and again once the font has loaded (it changes the cards' height).
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) {
    const jump = () => target.scrollIntoView({ behavior: "instant" });
    jump();
    document.fonts?.ready.then(jump);
  }
}

// Photos of a plant at three stages, from plant-photos.js (small, and loaded only when scrolled to).
function stagePhotos(p) {
  const photos = (typeof PLANT_PHOTOS !== "undefined" && PLANT_PHOTOS[p.id]) || [];
  if (!photos.length) return "";
  const words = { Seedling: "as a seedling", Growing: "growing", Ready: p.type === "Flowers" ? "in flower" : "ready to harvest" };
  return `<ul class="stage-photos">${photos.map((photo) => `<li><figure>
      <img src="${esc(photo.src)}" width="240" height="180" loading="lazy" alt="${esc(`${p.name} ${words[photo.stage]}`)}">
      <figcaption>${esc(photo.stage)}</figcaption></figure></li>`).join("")}</ul>`;
}

// One plant: photos, when to do what, what to do this month, and the details in a fold-out.
// Used on the All Plants page and in the app's plant sheet (open: the details start unfolded).
function plantDetails(p, open = false) {
  const month = currentMonth();
  const when = STAGES
    .filter((s) => p[s.key] && p[s.key].length)
    .map((s) => `<li><strong>${s.label}:</strong> ${formatMonths(p[s.key])}${p.notes && p.notes[s.key] ? `, ${esc(p.notes[s.key])}` : ""}</li>`)
    .join("");
  const jobs = plantJobsIn(p, month);
  return `
    <article class="plant" id="${p.id}">
      <h3>${esc(p.name)} <span class="de">(${esc(p.de)})</span></h3>
      <p class="plant-tags"><span class="tag">${esc(p.type)}</span> <span class="tag">${esc(p.difficulty)}</span>${p.tender ? ' <span class="tag">Frost-tender</span>' : ""}</p>
      ${stagePhotos(p)}
      <ul class="plant-when">${when}</ul>
      ${jobs.length ? `<p class="plant-now">In ${MONTHS[month - 1].name}: ${esc(jobs.join(", ").toLowerCase())}</p>` : ""}
      <details class="plant-more"${open ? " open" : ""}>
        <summary>Spacing, sun, water and a tip</summary>
        <dl class="facts">
          <dt>Spacing</dt><dd>${esc(p.spacing)}</dd>
          <dt>Sun</dt><dd>${esc(p.sun)}</dd>
          <dt>Water</dt><dd>${esc(p.water)}</dd>
          <dt>Difficulty</dt><dd>${esc(p.difficulty)}${p.tender ? " · frost-tender" : ""}</dd>
          <dt>Good neighbours</dt><dd>${p.good.length ? esc(p.good.join(", ")) : "-"}</dd>
          <dt>Bad neighbours</dt><dd>${p.bad.length ? esc(p.bad.join(", ")) : "-"}</dd>
        </dl>
        <p class="tip">${esc(p.tip)}</p>
      </details>
    </article>`;
}

// Every photo's author and licence (they are free to use only with this credit).
function renderPhotoCredits() {
  const list = $("#photo-credits");
  if (!list || typeof PLANT_PHOTOS === "undefined") return;
  list.innerHTML = PLANTS.filter((p) => PLANT_PHOTOS[p.id]).map((p) => `<li><strong>${esc(p.name)}:</strong> ${PLANT_PHOTOS[p.id].map((photo) =>
    `<a href="${esc(photo.page)}">${esc(photo.stage.toLowerCase())}</a> by ${esc(photo.author)}, ${photo.licenseUrl
      ? `<a href="${esc(photo.licenseUrl)}">${esc(photo.license)}</a>` : esc(photo.license)}`).join("; ")}</li>`).join("");
}

// ---------- Form helpers (notes page and garden groups) ----------

// A status line under a form: "error" (coral), "success" (green, with a check mark) or plain "info".
// (true still means "error", so older calls keep working.)
function showStatus(el, message, kind = "info") {
  if (kind === true) kind = "error";
  el.textContent = message;
  el.classList.toggle("is-error", kind === "error");
  el.classList.toggle("is-success", kind === "success" && Boolean(message));
}

// A short green pop-up confirming that something was saved or sent (visibility of system status).
// Screen readers already hear the status line next to the form, so the pop-up is hidden from them.
let toastTimer = null;
function toast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("aria-hidden", "true");
    (document.querySelector(".phone") || document.body).append(el); // inside the phone frame in the app
  }
  el.textContent = `✓ ${message}`;
  el.classList.remove("show");
  void el.offsetWidth; // restart the animation if one is already showing
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

// Every field with a data-error message is required. The returned check() marks each empty
// field (coral border + its message underneath), focuses the first one and returns how many are empty.
function requiredFieldsChecker(form) {
  const fields = [...form.querySelectorAll("[data-error]")];
  const showError = (field, show) => {
    field.setAttribute("aria-invalid", String(show));
    form.querySelector(`#${field.id}-error`).textContent = show ? field.dataset.error : "";
  };
  fields.forEach((field) => field.addEventListener("input", () => {
    if (field.value.trim()) showError(field, false);
  }));
  return () => {
    const missing = fields.filter((field) => !field.value.trim());
    fields.forEach((field) => showError(field, missing.includes(field)));
    missing[0]?.focus();
    return missing.length;
  };
}

const emptyFieldsMessage = (count) => (count === 1 ? "One field is still empty." : `${count} fields are still empty.`);

// Live "45 / 1000 characters" counter, so people see a field's limit coming. Returns update().
function charCounter(field, counter) {
  const update = () => {
    const used = field.value.length;
    const max = field.maxLength;
    counter.textContent = `${used} / ${max} characters${used >= max ? ": limit reached" : ""}`;
    counter.classList.toggle("near", used >= max * 0.9);
  };
  field.addEventListener("input", update);
  return update;
}

// ---------- A month's jobs: the built-in ones from data.js plus your own ----------

// Saved for the next time each month comes round (this year's October, next year's March), so the
// month page and the app's Home share the same list for the current month.
function jobsKey(month) {
  const now = new Date();
  return `garden-jobs-${now.getFullYear() + (month < now.getMonth() + 1 ? 1 : 0)}-${month}`;
}

function loadJobs(month) {
  try {
    const saved = JSON.parse(storageGet(jobsKey(month)));
    if (Array.isArray(saved)) return { done: saved, custom: [] }; // older format: only the ticks
    if (saved && typeof saved === "object") {
      return {
        done: Array.isArray(saved.done) ? saved.done.filter(Number.isInteger) : [],
        custom: Array.isArray(saved.custom) ? saved.custom.filter((job) => job && typeof job.text === "string") : [],
      };
    }
  } catch {
    // broken: start empty
  }
  return { done: [], custom: [] };
}
const saveJobs = (month, jobs) => storageSet(jobsKey(month), JSON.stringify(jobs));

// Fills box with the month's checklist and an "Add a job" form, and keeps it up to date.
function setupJobs(box, month) {
  const builtIn = MONTHS[month - 1].jobs;
  let justAdded = null;

  function render() {
    const jobs = loadJobs(month);
    const total = builtIn.length + jobs.custom.length;
    const done = jobs.done.filter((i) => i < builtIn.length).length + jobs.custom.filter((job) => job.done).length;
    box.innerHTML = `
      <p class="jobs-progress" aria-live="polite">${total && done === total ? `All ${total} done. Well done!` : `${done} of ${total} done`}</p>
      <ul class="checklist">
        ${builtIn.map((job, i) => `<li><label><input type="checkbox" data-job="${i}"${jobs.done.includes(i) ? " checked" : ""}> <span>${esc(job)}</span></label></li>`).join("")}
        ${jobs.custom.map((job) => `<li class="custom-job${job.id === justAdded ? " is-new" : ""}">
          <label><input type="checkbox" data-custom="${esc(job.id)}"${job.done ? " checked" : ""}> <span>${esc(job.text)}</span></label>
          <button type="button" class="remove-job" data-remove="${esc(job.id)}" aria-label="Remove “${esc(job.text)}”">✕</button></li>`).join("")}
      </ul>
      <form class="add-job" novalidate>
        <label class="visually-hidden" for="new-job-${month}">Add your own job</label>
        <input type="text" id="new-job-${month}" maxlength="100" required placeholder="Add your own job, e.g. Fix the shed door"
               data-error="Write the job first." aria-describedby="new-job-${month}-error">
        <button type="submit">Add</button>
      </form>
      <p class="field-error" id="new-job-${month}-error"></p>
      <p class="form-status" role="status"></p>`;
    justAdded = null;
  }

  const status = (message, kind) => showStatus(box.querySelector(".form-status"), message, kind);

  box.addEventListener("change", (event) => {
    const tick = event.target;
    const jobs = loadJobs(month);
    if (tick.dataset.job !== undefined) {
      const i = Number(tick.dataset.job);
      jobs.done = tick.checked ? [...new Set([...jobs.done, i])] : jobs.done.filter((d) => d !== i);
    } else if (tick.dataset.custom) {
      const job = jobs.custom.find((j) => j.id === tick.dataset.custom);
      if (job) job.done = tick.checked;
    } else {
      return;
    }
    saveJobs(month, jobs);
    const total = builtIn.length + jobs.custom.length;
    const done = jobs.done.filter((i) => i < builtIn.length).length + jobs.custom.filter((j) => j.done).length;
    box.querySelector(".jobs-progress").textContent = total && done === total ? `All ${total} done. Well done!` : `${done} of ${total} done`;
  });

  box.addEventListener("input", (event) => { // typing clears the "write the job first" message
    if (event.target.closest(".add-job") && event.target.value.trim()) {
      event.target.removeAttribute("aria-invalid");
      box.querySelector(".field-error").textContent = "";
    }
  });

  box.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.target.querySelector("input");
    const text = input.value.trim();
    if (!text) {
      input.setAttribute("aria-invalid", "true");
      box.querySelector(".field-error").textContent = input.dataset.error;
      return input.focus();
    }
    const jobs = loadJobs(month);
    justAdded = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    jobs.custom.push({ id: justAdded, text, done: false });
    if (!saveJobs(month, jobs)) return status("Your browser is blocking storage, so the job couldn't be saved.", "error");
    render();
    status("Job added.", "success");
    toast("Job added");
    box.querySelector("input[type=text]").focus();
  });

  box.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    const jobs = loadJobs(month);
    jobs.custom = jobs.custom.filter((j) => j.id !== button.dataset.remove);
    saveJobs(month, jobs);
    render();
    status("Job removed.", "success");
  });

  render();
}

// ---------- Notes page ----------

function renderNotesPage() {
  let notes = loadNotes();
  const form = $("#note-form");
  const status = $("#notes-status");

  form.elements.date.value = todayISO();
  $("#plant-names").innerHTML = PLANTS.map((p) => `<option value="${esc(p.name)}">`).join("");

  let justSaved = null; // the new note gets a short highlight
  function draw() {
    const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    $("#notes-list").innerHTML = sorted.length
      ? sorted.map((note) => `
          <li${note.id === justSaved ? ' class="is-new"' : ""}>
            <strong>${esc(formatDate(note.date))}</strong> · ${esc(note.kind)}${note.plant ? ` · ${esc(note.plant)}` : ""}
            ${note.text ? `<br><span class="note-text">${esc(note.text)}</span>` : ""}
            ${notePhoto(note)}
            <button type="button" class="delete" data-id="${esc(note.id)}">Delete</button>
          </li>`).join("")
      : '<li class="empty">No notes yet. Your first one goes above.</li>';
  }

  const setStatus = (message, isError) => showStatus(status, message, isError);

  // Returns false (and says so) when the browser blocks storage.
  function persist() {
    if (saveNotes(notes)) return true;
    setStatus("Your browser is blocking storage, so notes will be lost when you close this page. Use 'Download notes' to keep them.", true);
    return false;
  }

  const checkRequired = requiredFieldsChecker(form);
  const noteText = form.elements.text;
  const updateCounter = charCounter(noteText, $("#note-text-count"));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const empty = checkRequired();
    if (empty) {
      setStatus(emptyFieldsMessage(empty), true);
      return;
    }
    notes.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: form.elements.date.value,
      kind: form.elements.kind.value,
      plant: form.elements.plant.value.trim(),
      text: noteText.value.trim(),
    });
    justSaved = notes[notes.length - 1].id;
    if (persist()) { setStatus("Note saved.", "success"); toast("Note saved"); }
    form.elements.plant.value = "";
    noteText.value = "";
    updateCounter();
    draw();
  });

  $("#notes-list").addEventListener("click", (event) => {
    const button = event.target.closest(".delete");
    if (!button || !confirm("Delete this note?")) return;
    notes = notes.filter((note) => String(note.id) !== button.dataset.id);
    if (persist()) { setStatus("Note deleted.", "success"); toast("Note deleted"); }
    draw();
  });

  $("#export-notes").addEventListener("click", () => downloadNotes(notes));

  $("#import-notes").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      if (!Array.isArray(incoming)) throw new Error("not a list");
      const known = new Set(notes.map((note) => String(note.id)));
      let added = 0;
      for (const item of incoming) {
        if (!item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
        const id = String(item.id || `${Date.now()}-${added}`);
        if (known.has(id)) continue;
        known.add(id);
        notes.push({
          id,
          date: item.date,
          kind: String(item.kind || "Other"),
          plant: String(item.plant || ""),
          text: String(item.text || ""),
          ...(safePhoto(item.photo) ? { photo: item.photo } : {}),
        });
        added++;
      }
      if (persist()) { setStatus(`Loaded ${added} new note${added === 1 ? "" : "s"} from ${file.name}.`, "success"); toast(`${added} notes loaded`); }
      draw();
    } catch {
      setStatus("That file doesn't look like a garden notes file.", true);
    }
    event.target.value = "";
  });

  draw();
}

// ---------- Minecraft harvest mini-games (easter eggs) ----------

// Which month shows which mini-game, on the home page and on that month's page.
const HARVEST_GAMES = { 9: setupPumpkin, 10: setupCarrot };

const PUMPKIN_DIR = "images/minecraftPumpkinAnimation";
const CRACK_IMAGES = Array.from({ length: 10 }, (_, i) => `${PUMPKIN_DIR}/destroy_stage_${i}.png`);
const DIG_SOUND = "images/Wood_dig3.ogg.mp3";
const PICKUP_SOUND = "images/minecraft_item_pickup.mp3";
const MINE_STEP_MS = 150; // 10 stages x 150 ms = 1.5 s, like breaking a pumpkin by hand in Minecraft
const CUBE_FACES = ["front", "back", "left", "right", "top", "bottom"]
  .map((face) => `<span class="mc-face mc-${face}"></span>`).join("");

const sounds = {};
const SOUNDS_KEY = "garden-sounds"; // "off" when sounds are switched off in the app's Settings
function playSound(src, volume = 1) {
  if (storageGet(SOUNDS_KEY) === "off") return;
  sounds[src] ??= new Audio(src);
  const sound = sounds[src].cloneNode(); // a copy, so quick hits can overlap
  sound.volume = volume;
  sound.play().catch(() => {}); // the browser may block sound; the animation still works
}

// Little squares of a texture flying out, like Minecraft block-breaking particles.
function burstParticles(container, texture, count = 18) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "mc-particle";
    piece.style.backgroundImage = `url("${texture}")`;
    piece.style.backgroundPosition = `${Math.random() * 100}% ${Math.random() * 100}%`;
    container.append(piece);
    const dx = (Math.random() - 0.5) * 180;
    const up = 20 + Math.random() * 50;
    const down = 50 + Math.random() * 40;
    piece.animate([
      { transform: "translate(0, 0)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${-up}px)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px, ${down}px)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 300, easing: "ease-out" }).onfinish = () => piece.remove();
  }
}

function setupPumpkin(spot) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  CRACK_IMAGES.forEach((src) => { new Image().src = src; }); // preload so the cracks don't flicker

  spot.innerHTML = `
    <p class="harvest-hint">Pumpkins are ready to harvest! Hold down on the pumpkin to break it.</p>
    <button type="button" class="mc-stage" aria-label="Pumpkin block: hold to harvest">
      <span class="mc-cube mc-block">${CUBE_FACES}</span>
    </button>
    <p class="harvest-count" aria-live="polite"></p>`;

  // One button for the whole thing, so keyboard focus never jumps around.
  const button = spot.querySelector(".mc-stage");
  const cube = spot.querySelector(".mc-block");
  const hint = spot.querySelector(".harvest-hint");
  const count = spot.querySelector(".harvest-count");
  let state = "block"; // "block" -> "item" -> "picking" -> back to "block"
  let crack = -1;
  let timer = null;
  let autoPickup = null;
  let waitForRelease = false; // after breaking, the held key/mouse must be let go first
  let item = null;
  let harvested = 0;

  function setCrack(n) {
    crack = n;
    cube.style.setProperty("--crack", n < 0 ? "none" : `url("${CRACK_IMAGES[n]}")`);
  }

  function press() {
    if (waitForRelease) return;
    if (state === "block") startMining();
    else if (state === "item") pickUp();
  }

  function release() {
    waitForRelease = false;
    stopMining();
  }

  function startMining() {
    if (timer) return;
    timer = setInterval(() => {
      if (crack === CRACK_IMAGES.length - 1) return breakBlock();
      setCrack(crack + 1);
      if (crack % 2 === 0) playSound(DIG_SOUND, 0.25); // quiet hit sounds while mining
    }, MINE_STEP_MS);
  }

  // Letting go early resets the cracks, just like in the game.
  function stopMining() {
    clearInterval(timer);
    timer = null;
    if (state === "block") setCrack(-1);
  }

  function breakBlock() {
    stopMining();
    state = "item";
    waitForRelease = true;
    setCrack(-1);
    playSound(DIG_SOUND);
    button.classList.add("broken");
    button.setAttribute("aria-label", "Pick up the pumpkin");
    hint.textContent = "Click the pumpkin to pick it up.";
    if (!reduceMotion) burstParticles(button, `${PUMPKIN_DIR}/pumpkin_side.png`);
    dropItem();
    autoPickup = setTimeout(pickUp, 6000);
  }

  // The dropped item: a small spinning, bobbing pumpkin.
  function dropItem() {
    item = document.createElement("span");
    item.className = "mc-item";
    item.innerHTML = `<span class="mc-bob"><span class="mc-cube">${CUBE_FACES}</span></span>`;
    button.append(item);
    if (reduceMotion) return;
    item.animate([
      { transform: "translateY(-40px)" },
      { transform: "translateY(-70px)", offset: 0.4 },
      { transform: "translateY(0)" },
    ], { duration: 500, easing: "ease-in" });
  }

  function pickUp() {
    if (state !== "item") return;
    state = "picking";
    clearTimeout(autoPickup);
    playSound(PICKUP_SOUND);
    harvested++;
    count.textContent = `Pumpkins harvested: ${harvested}`;
    if (reduceMotion) return regrow();
    item.animate([
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: "translateY(-60px) scale(0.3)", opacity: 0 },
    ], { duration: 250, easing: "ease-in" }).onfinish = regrow;
  }

  // A new pumpkin grows back so you can do it again.
  function regrow() {
    item.remove();
    item = null;
    state = "block";
    button.classList.remove("broken");
    button.classList.add("regrow");
    button.setAttribute("aria-label", "Pumpkin block: hold to harvest");
    hint.textContent = "Another one grew back! Hold down on it to break it.";
  }
  cube.addEventListener("animationend", () => button.classList.remove("regrow"));

  // Mouse / touch: hold to mine, let go or slide off to stop.
  button.addEventListener("pointerdown", (event) => {
    if (event.button === 0) press();
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((type) => button.addEventListener(type, release));
  button.addEventListener("contextmenu", (event) => event.preventDefault()); // no long-press menu on phones

  // Keyboard: hold Space or Enter.
  button.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) press();
  });
  button.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") release();
  });
  button.addEventListener("blur", release);
}

// ---------- Minecraft carrot (October) ----------

const CARROT_DIR = "images/minecraftCarrotAnimation";
const CARROT_STAGES = [0, 1, 2, 3].map((i) => `${CARROT_DIR}/carrots_stage_${i}.png`);
const CARROT_MAX_AGE = 7; // Minecraft carrots grow through 8 ages (0-7) that share 4 pictures
const CARROT_AGE_TO_STAGE = [0, 0, 1, 1, 2, 2, 2, 3];
const PLANT_SOUNDS = ["images/Crop_place1.ogg.mp3", "images/Crop_place6.ogg.mp3"];
const HARVEST_SOUNDS = ["images/Bamboo_Sapling_dig1.ogg.mp3", "images/Bamboo_Sapling_dig4.ogg.mp3"];
const GROW_SOUND = `${CARROT_DIR}/Bonemeal5.ogg.mp3`; // bone meal, as in Minecraft
// Optional textures: used automatically as soon as these files are added.
const CARROT_ITEM = `${CARROT_DIR}/carrot.png`; // the carrot you pick up
const FARMLAND_SIDE = `${CARROT_DIR}/dirt.png`; // farmland has dirt sides in Minecraft
// The four crop planes, crossed like a # on top of the block (as in Minecraft).
const CROP_PLANES = ["a", "b", "c", "d"].map((p) => `<span class="mc-crop mc-crop-${p}"></span>`).join("");

// Stand-in carrot item (my own 16x16 pixel drawing) until carrot.png is added.
const CARROT_STAND_IN = pixelArt([
  "................",
  "...........g..g.",
  "..........gG.gG.",
  "...........gGgG.",
  "..........ooGG..",
  ".........oooo...",
  "........oodod...",
  ".......oooodd...",
  "......ooodod....",
  ".....oodood.....",
  "....oooodd......",
  "...ooodd........",
  "...oodd.........",
  "..odd...........",
  "..d.............",
  "................",
], { o: "#E9892B", d: "#B85E17", g: "#6DC43B", G: "#3B8A22" });

function pixelArt(rows, colors) {
  const pixels = rows.flatMap((row, y) => [...row].map((c, x) =>
    colors[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[c]}"/>` : "")).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${pixels}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

function setupCarrot(spot) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  [...CARROT_STAGES, `${CARROT_DIR}/farmland_wet.png`].forEach((src) => { new Image().src = src; });

  spot.innerHTML = `
    <p class="harvest-hint">October is carrot harvest time. Click the farmland to plant a carrot.</p>
    <button type="button" class="mc-stage mc-carrot" aria-label="Farmland: click to plant a carrot">
      <span class="mc-cube mc-block mc-farmland">${CUBE_FACES}${CROP_PLANES}</span>
    </button>
    <p class="harvest-count" aria-live="polite"></p>`;

  // One button for the whole thing, so keyboard focus never jumps around.
  const button = spot.querySelector(".mc-stage");
  const cube = spot.querySelector(".mc-farmland");
  const hint = spot.querySelector(".harvest-hint");
  const count = spot.querySelector(".harvest-count");
  let state = "empty"; // "empty" -> "growing" -> "ready" -> "dropped" -> "picking" -> back to "empty"
  let age = 0;
  let items = [];
  let busy = false; // ignore clicks while carrots are still flying out
  let autoPickup = null;
  let harvested = 0;
  let itemSrc = CARROT_STAND_IN;

  // Swap in the real Minecraft textures if they've been added to the folder.
  const itemProbe = new Image();
  itemProbe.onload = () => { itemSrc = CARROT_ITEM; };
  itemProbe.src = CARROT_ITEM;
  const sideProbe = new Image();
  sideProbe.onload = () => cube.style.setProperty("--farmland-side", `url("${FARMLAND_SIDE}")`);
  sideProbe.src = FARMLAND_SIDE;

  function setCrop(newAge) {
    age = newAge;
    cube.style.setProperty("--crop", newAge < 0 ? "none" : `url("${CARROT_STAGES[CARROT_AGE_TO_STAGE[newAge]]}")`);
  }

  function setState(next, label, message) {
    state = next;
    button.setAttribute("aria-label", label);
    hint.textContent = message;
  }

  button.addEventListener("click", () => {
    if (busy) return;
    if (state === "empty") plant();
    else if (state === "growing") grow();
    else if (state === "ready") harvest();
    else if (state === "dropped") pickUp();
  });
  // Holding Enter repeats clicks; ignore the repeats so nothing gets skipped by accident.
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.repeat) event.preventDefault();
  });

  function plant() {
    setCrop(0);
    cube.classList.add("wet"); // watered right after sowing
    playSound(pickRandom(PLANT_SOUNDS));
    setState("growing", "Carrot seedling: click to help it grow",
      `Planted and watered! Click to help it grow (0 / ${CARROT_MAX_AGE}).`);
  }

  function grow() {
    setCrop(age + 1);
    playSound(GROW_SOUND, 0.7);
    if (!reduceMotion) sparkle();
    if (age < CARROT_MAX_AGE) {
      hint.textContent = `Growing… ${age} / ${CARROT_MAX_AGE}`;
      return;
    }
    setState("ready", "Carrots are ready: click to harvest", "Ready! Click to harvest the carrots.");
  }

  // Green sparkles, like bone meal in Minecraft.
  function sparkle() {
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement("span");
      dot.className = "mc-sparkle";
      dot.style.left = `${30 + Math.random() * 40}%`;
      dot.style.top = `${10 + Math.random() * 40}%`;
      button.append(dot);
      dot.animate([
        { transform: "translateY(0) scale(0.4)", opacity: 0 },
        { transform: "translateY(-6px) scale(1)", opacity: 1, offset: 0.3 },
        { transform: "translateY(-20px) scale(0.6)", opacity: 0 },
      ], { duration: 700 + Math.random() * 300, easing: "ease-out" }).onfinish = () => dot.remove();
    }
  }

  function harvest() {
    setCrop(-1);
    cube.classList.remove("wet");
    playSound(pickRandom(HARVEST_SOUNDS));
    if (!reduceMotion) burstParticles(button, CARROT_STAGES[3], 12);
    const amount = 2 + Math.floor(Math.random() * 4); // 2-5 carrots, like Minecraft
    for (let i = 0; i < amount; i++) dropCarrot(i, amount);
    setState("dropped", `Pick up ${amount} carrots`, `You harvested ${amount} carrots! Click to pick them up.`);
    busy = true;
    setTimeout(() => { busy = false; }, 500);
    autoPickup = setTimeout(pickUp, 6000);
  }

  // A carrot item that pops out of the soil, then spins and bobs on the ground.
  function dropCarrot(i, amount) {
    const item = document.createElement("span");
    item.className = "mc-drop";
    item.innerHTML = `<span class="mc-bob"><img class="mc-carrot-item" src="${itemSrc}" alt=""></span>`;
    // Land in a curve around the front of the block, so they look like they're on the ground.
    const x = (i - (amount - 1) / 2) * 36 + (Math.random() - 0.5) * 8;
    const y = 125 - Math.abs(x) * 0.35;
    item.style.setProperty("--x", `${x}px`); // resting spot, used by the CSS
    item.style.setProperty("--y", `${y}px`);
    Object.assign(item.dataset, { x, y });
    button.append(item);
    items.push(item);
    if (reduceMotion) return;
    item.animate([
      { transform: "translate(0, 0)" },
      { transform: `translate(${x / 2}px, -40px)`, offset: 0.4 },
      { transform: `translate(${x}px, ${y}px)` },
    ], { duration: 500, easing: "ease-in" });
  }

  function pickUp() {
    if (state !== "dropped") return;
    state = "picking";
    clearTimeout(autoPickup);
    harvested += items.length;
    count.textContent = `Carrots harvested: ${harvested}`;
    items.forEach((_, i) => setTimeout(() => playSound(PICKUP_SOUND, 0.6), i * 80)); // one pop per carrot
    const done = () => {
      items.forEach((item) => item.remove());
      items = [];
      setState("empty", "Farmland: click to plant a carrot", "Click the farmland to plant another carrot.");
    };
    if (reduceMotion) return done();
    items.forEach((item, i) => {
      const x = Number(item.dataset.x);
      const y = Number(item.dataset.y);
      const fly = item.animate([
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
        { transform: `translate(${x}px, ${y - 60}px) scale(0.3)`, opacity: 0 },
      ], { duration: 250, delay: i * 80, easing: "ease-in", fill: "forwards" });
      if (i === items.length - 1) fly.onfinish = done;
    });
  }
}

// ---------- Start ----------

const pages = { home: renderHome, month: renderMonth, plants: renderPlants, notes: renderNotesPage };
pages[document.body.dataset.page]?.();
