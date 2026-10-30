// ============================================================
// The mobile app (app.html): Home, Explore and Settings tabs.
// Reuses app.js (weather, notes, months, plants, mini-games, form helpers, app settings)
// and community.js (gardens, search, groups, photos). Everything stays on this phone.
// ============================================================

const SUGGESTIONS_KEY = "garden-suggestions";
const ICONS = "vendor/fontawesome/icons.svg";
const TABS = ["home", "explore", "settings"];
const NOTE_KINDS = ["Sowed", "Planted", "Harvested", "Watered / fed", "Problem", "Other"];
const RESULTS_PAGE = 20;

// icon() comes from community.js
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

let app = loadAppSettings(); // profile + settings (app.js)
let community = loadState(); // garden groups (community.js)

function saveApp() {
  return saveAppSettings(app);
}

function readList(key) {
  try {
    const list = JSON.parse(storageGet(key));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* storage blocked: nothing to remove */ }
}

// Copies your name, plants and photo onto your member cards in every group.
function syncMeInGroups() {
  community = loadState();
  community.me.name = app.name;
  for (const group of community.groups) {
    if (community.myStatus[group.id] === "owner" && !group.example) group.owner = app.name;
    for (const member of group.members) {
      if (!member.isMe) continue;
      member.name = app.name;
      member.growing = [...app.growing];
      member.photo = app.photo;
    }
    for (const note of group.notes) if (note.authorIsMe) note.author = app.name;
  }
  return saveState(community);
}

// ---------- The bottom sheet ----------

const sheet = $("#sheet");
let sheetOpener = null;

function openSheet(title, html) {
  sheetOpener = document.activeElement;
  $("#sheet-title").textContent = title;
  $("#sheet-body").innerHTML = html;
  $("#sheet-backdrop").hidden = false;
  sheet.hidden = false;
  sheet.scrollTop = 0;
  if (!history.state?.sheet) history.pushState({ sheet: true }, ""); // the phone's Back button closes it
  // preventScroll: the sheet is still sliding in from below, and the browser would otherwise
  // scroll the whole phone up to show the button
  $("#sheet-close").focus({ preventScroll: true });
  return $("#sheet-body");
}

function closeSheet(fromHistory = false) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  $("#sheet-backdrop").hidden = true;
  $("#sheet-body").innerHTML = "";
  sheetOpener?.focus?.();
  if (!fromHistory && history.state?.sheet) history.back();
}

$("#sheet-close").addEventListener("click", () => closeSheet());
$("#sheet-backdrop").addEventListener("click", () => closeSheet());
window.addEventListener("popstate", () => closeSheet(true));
document.addEventListener("keydown", (event) => {
  if (sheet.hidden) return;
  if (event.key === "Escape") closeSheet();
  if (event.key === "Tab") { // keep keyboard focus inside the open sheet
    const items = [...sheet.querySelectorAll("button, a[href], input, select, textarea")].filter((el) => !el.disabled && el.offsetParent);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

// Links to desktop pages inside sheets and the FAQ become in-app actions.
function handleAppLink(event) {
  const link = event.target.closest("a[href]");
  if (!link || link.hasAttribute("data-desktop")) return; // links meant for the desktop site stay normal links
  const href = link.getAttribute("href");
  if (href.startsWith("plants.html#")) { event.preventDefault(); openPlantSheet(href.split("#")[1]); }
  else if (href === "plants.html") { event.preventDefault(); openAllPlantsSheet(); }
  else if (href.startsWith("month.html")) { event.preventDefault(); openMonthSheet(Number(new URL(href, location.href).searchParams.get("m")) || currentMonth()); }
  else if (href === "notes.html") { event.preventDefault(); closeSheet(); location.hash = "#home"; $("#my-notes-card").scrollIntoView(); }
  else if (href === "gardens.html") { event.preventDefault(); closeSheet(); location.hash = "#explore"; }
}
sheet.addEventListener("click", handleAppLink);

// ---------- Welcome / sign in ----------

const districtOptions = GARDEN_DISTRICTS.map((d) => `<option>${esc(d)}</option>`).join("");
$("#welcome-district").insertAdjacentHTML("beforeend", districtOptions);
$("#app-profile-district").insertAdjacentHTML("beforeend", districtOptions);

const checkWelcome = requiredFieldsChecker($("#welcome-form"));
$("#welcome-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const empty = checkWelcome();
  if (empty) return showStatus($("#welcome-status"), emptyFieldsMessage(empty), true);
  const name = $("#welcome-name").value.trim();
  app.returning = app.signedIn === false && app.name === name && app.returning; // same person logging back in
  Object.assign(app, { signedIn: true, name, district: $("#welcome-district").value });
  saveApp();
  syncMeInGroups();
  showApp();
});

function showWelcome(message = "") {
  closeSheet();
  $("#welcome").hidden = false;
  $("#screens").hidden = true;
  $("#tabbar").hidden = true;
  $("#fab-note").hidden = true;
  $("#welcome-title").textContent = app.name ? `Welcome back, ${app.name}` : "Community Garden";
  $("#welcome-name").value = app.name;
  $("#welcome-district").value = app.district;
  showStatus($("#welcome-status"), message);
}

let homeReady = false;
function showApp() {
  $("#welcome").hidden = true;
  $("#screens").hidden = false;
  $("#tabbar").hidden = false;
  if (!homeReady) {
    setupHome();
    setupExplore();
    setupSettings();
    homeReady = true;
  }
  renderSettings();
  // "Welcome" the first time, "Welcome back" after that
  $("#greeting").textContent = `${app.returning ? "Welcome back" : "Welcome"}, ${app.name}`;
  if (!app.returning) { app.returning = true; saveApp(); }
  route();
}

// ---------- Tabs ----------

function route() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
  for (const t of TABS) $(`#tab-${t}`).hidden = t !== tab;
  $("#screens").classList.toggle("explore-mode", tab === "explore");
  $("#screens").classList.toggle("home-mode", tab === "home");
  $("#fab-note").hidden = tab !== "home";
  for (const link of document.querySelectorAll(".tabbar a")) {
    if (link.dataset.tab === tab) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  $("#screens").scrollTop = 0;
  document.title = `${capitalise(tab)} · Community Garden app`;
  if (tab === "explore") openExplore();
  if (tab === "home") renderHome();
}
window.addEventListener("hashchange", () => { if (app.signedIn) route(); });

// ---------- Home ----------

function setupHome() {
  setupForecast(); // app.js: fills #city, #forecast and #forecast-summary
  new MutationObserver(() => {
    $("#forecast-summary").classList.toggle("has-frost", $("#forecast-summary").textContent.startsWith("Frost risk"));
  }).observe($("#forecast-summary"), { childList: true, characterData: true, subtree: true });

  $("#update-garden").addEventListener("click", () => openUpdateSheet());
  $("#fab-note").addEventListener("click", () => openUpdateSheet());
  $("#add-note").addEventListener("click", () => openUpdateSheet());
  $("#photo-note").addEventListener("click", () => openUpdateSheet({ camera: true }));
  $("#all-notes").addEventListener("click", openAllNotesSheet);
  $("#all-plants").addEventListener("click", openAllPlantsSheet);

  setupJobs($("#jobs-box"), currentMonth()); // app.js: the same checklist as the month page, with your own jobs

  $("#season").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-plant]");
    if (chip) openPlantSheet(chip.dataset.plant);
  });
  $("#month-strip").addEventListener("click", (event) => {
    const card = event.target.closest("[data-month]");
    if (card) openMonthSheet(Number(card.dataset.month));
  });
  $("#community-updates").addEventListener("click", (event) => {
    const garden = event.target.closest("[data-garden]");
    if (garden) { location.hash = "#explore"; openGardenSheet(garden.dataset.garden); }
    if (event.target.closest("[data-go-explore]")) {
      location.hash = "#explore";
      if (app.district) { $("#explore-search").value = app.district; drawResults(); }
    }
  });

  // The month's mini-game (September pumpkin, October carrot), if there is one
  const now = currentMonth();
  if (HARVEST_GAMES[now]) {
    $("#game-card").hidden = false;
    $("#game-title").textContent = `${MONTHS[now - 1].name} mini-game`;
    HARVEST_GAMES[now]($("#harvest-spot"));
  }

  // Suggestion box
  const suggest = $("#suggest-form");
  const checkSuggest = requiredFieldsChecker(suggest);
  const updateCount = charCounter($("#suggest-text"), $("#suggest-text-count"));
  suggest.addEventListener("submit", (event) => {
    event.preventDefault();
    const empty = checkSuggest();
    if (empty) return showStatus($("#suggest-status"), emptyFieldsMessage(empty), true);
    const list = readList(SUGGESTIONS_KEY);
    list.push({ id: uid(), date: todayISO(), topic: $("#suggest-topic").value, text: $("#suggest-text").value.trim() });
    storageSet(SUGGESTIONS_KEY, JSON.stringify(list));
    $("#suggest-text").value = "";
    updateCount();
    showStatus($("#suggest-status"), `Thanks! In this prototype, suggestions are saved on this phone (${plural(list.length, "suggestion")} so far).`, "success");
    toast("Suggestion sent");
  });
}

function renderHome() {
  const now = currentMonth();
  const month = MONTHS[now - 1];
  $("#month-chip").textContent = `It's ${month.name} · ${capitalise(month.season)}`;

  $("#jobs-title").textContent = `${month.name} jobs`;

  // In season
  const groups = [["harvest", "Ready to harvest"], ["outdoors", "Sow outdoors"], ["indoors", "Start indoors"], ["plant", "Plant out"]];
  $("#season").innerHTML = groups.map(([stage, label]) => {
    const plants = plantsFor(now, stage);
    return plants.length ? `<h3>${label}</h3><div class="chips">${plants.map((p) =>
      `<button type="button" class="chip" data-plant="${esc(p.id)}">${esc(p.name)}</button>`).join("")}</div>` : "";
  }).join("");

  // The 12 months, small
  $("#month-strip").innerHTML = MONTHS.map((m, i) => `
    <button type="button" class="mini-month season-${m.season}${i + 1 === now ? " current" : ""}" data-month="${i + 1}"
      aria-label="${m.name}${i + 1 === now ? " (this month)" : ""}">
      <span class="mini-month-name">${m.short}</span><span class="small">${m.high}° / ${m.low}°</span>
    </button>`).join("");

  renderUpdates();
  renderMyNotes();
}


function renderUpdates() {
  community = loadState();
  const accepted = processApprovals(community);
  const mine = community.groups.filter((g) => ["member", "owner"].includes(community.myStatus[g.id]));
  const pending = community.groups.filter((g) => community.myStatus[g.id] === "pending");
  const box = $("#community-updates");
  if (!mine.length && !pending.length) {
    box.innerHTML = `<p class="empty">You're not in a garden group yet.</p>
      <button type="button" data-go-explore>${icon("compass")} Find a garden${app.district ? ` in ${esc(app.district)}` : ""}</button>`;
    return;
  }
  const latest = mine.flatMap((g) => g.notes.map((n) => ({ g, n })))
    .sort((a, b) => b.n.date.localeCompare(a.n.date)).slice(0, 5);
  box.innerHTML = `
    ${accepted.length ? `<p class="flash">${esc(acceptedMessage(accepted))}</p>` : ""}
    ${pending.map((g) => `<p class="request-status">Waiting for ${esc(g.owner)} to accept your request to ${esc(g.name)}.</p>`).join("")}
    ${mine.filter((g) => community.myStatus[g.id] === "owner" && g.requests.length).map((g) => `
      <p><button type="button" class="button-secondary" data-garden="${esc(g.gardenId)}">${plural(g.requests.length, "join request")} waiting for ${esc(g.name)}</button></p>`).join("")}
    <ul class="note-feed">${latest.map(({ g, n }) => `
      <li class="note-card">
        <p class="note-head"><button type="button" class="link-button" data-garden="${esc(g.gardenId)}">${esc(g.name)}</button></p>
        <p class="note-head"><strong>${esc(n.author)}</strong> · ${esc(formatDate(n.date))}
          <span class="tag">${n.visibility === "public" ? "Public" : "Members only"}</span></p>
        <p class="note-body">${esc(n.text)}</p>
        ${n.photo ? `<img class="note-photo" src="${esc(n.photo)}" alt="Photo from ${esc(n.author)}">` : ""}
      </li>`).join("")}</ul>
    ${mine.length && !latest.length ? '<p class="empty">No notes in your groups yet.</p>' : ""}`;
}

function sortedNotes() {
  return loadNotes().sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
}

function renderMyNotes(newId = null) {
  const notes = sortedNotes();
  $("#app-notes").innerHTML = notes.length
    ? notes.slice(0, 3).map((n) => noteSummary(n).replace("<li>", n.id === newId ? '<li class="is-new">' : "<li>")).join("")
    : '<li class="empty">No notes yet. Tap "Add a note" after your next visit to the plot.</li>';
  $("#all-notes").hidden = notes.length <= 3;
  $("#all-notes").textContent = `See all ${notes.length}`;
}

function openAllNotesSheet() {
  openSheet("My notes", `<ul class="notes-list">${sortedNotes().map(noteSummary).join("")}</ul>
    <p class="small">To delete or import notes, use My Notes on the <a href="notes.html" data-desktop>desktop site</a>.</p>`);
}

// ---------- Sheets for plants and months ----------

function openPlantSheet(id) {
  const plant = PLANTS.find((p) => p.id === id);
  if (plant) openSheet(plant.name, `<div class="sheet-plant">${plantDetails(plant, true)}</div>`);
}

function openAllPlantsSheet() {
  const types = [...new Set(PLANTS.map((p) => p.type))];
  const box = openSheet("All plants", `<div class="all-plants">
    <form class="note-form" role="search" aria-label="Find a plant">
      <div class="field">
        <label for="app-plant-search">Search</label>
        <input type="search" id="app-plant-search" placeholder="Name, in English or German" autocomplete="off">
      </div>
      <label class="check-row"><input type="checkbox" id="app-plant-easy"> Easy for beginners only</label>
    </form>
    <p class="small" id="app-plant-count" aria-live="polite"></p>
    ${types.map((type) => `<section data-type><h3>${esc(type)}</h3><div class="chips">${PLANTS.filter((p) => p.type === type)
      .map((p) => `<button type="button" class="chip" data-plant="${esc(p.id)}">${esc(p.name)}</button>`).join("")}</div></section>`).join("")}
  </div>`).querySelector(".all-plants");

  const filter = () => {
    const text = $("#app-plant-search").value;
    const easy = $("#app-plant-easy").checked;
    let shown = 0;
    for (const chip of box.querySelectorAll("[data-plant]")) {
      const p = PLANTS.find((plant) => plant.id === chip.dataset.plant);
      chip.hidden = !(plantMatches(p, text) && (!easy || p.difficulty === "Easy"));
      if (!chip.hidden) shown++;
    }
    for (const group of box.querySelectorAll("[data-type]")) group.hidden = !group.querySelector("[data-plant]:not([hidden])");
    $("#app-plant-count").textContent = shown === PLANTS.length ? `All ${shown} plants` : shown ? `${shown} of ${PLANTS.length} plants` : "No plant matches. Try another word.";
  };
  filter();
  box.addEventListener("input", filter);
  box.addEventListener("submit", (event) => event.preventDefault());
  box.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-plant]");
    if (chip) openPlantSheet(chip.dataset.plant);
  });
}

function openMonthSheet(n) {
  const m = MONTHS[n - 1];
  openSheet(m.name, `
    <dl class="facts">
      <dt>Daytime</dt><dd>${m.high} °C</dd>
      <dt>Night</dt><dd>${m.low} °C</dd>
      <dt>Rain</dt><dd>about ${m.rain} mm</dd>
      <dt>Daylight</dt><dd>about ${m.daylight} hours</dd>
      <dt>Frost risk</dt><dd>${m.frostRisk}. ${m.frostNote}</dd>
    </dl>
    <h3>Jobs</h3><ul>${m.jobs.map((job) => `<li>${esc(job)}</li>`).join("")}</ul>
    <h3>Start indoors</h3>${plantList(n, "indoors")}
    <h3>Sow outdoors</h3>${plantList(n, "outdoors")}
    <h3>Plant out</h3>${plantList(n, "plant")}
    <h3>Harvest</h3>${plantList(n, "harvest")}`);
}

// ---------- Update garden: a note for My Notes + what you grow ----------

function openUpdateSheet({ camera = false } = {}) {
  const body = openSheet("Update garden", `
    <form id="update-note" class="note-form" novalidate>
      <h3>What did you do?</h3>
      <p class="form-hint">All fields are required; the photo is optional. Saved to My notes.</p>
      ${field("update-date", "Date", `<input type="date" id="update-date" required value="${todayISO()}"
        data-error="Choose the day it happened." aria-describedby="update-date-error">`)}
      ${field("update-kind", "What happened", `<select id="update-kind" required data-error="Choose what you did." aria-describedby="update-kind-error">
        <option value="" disabled selected>Choose one…</option>${NOTE_KINDS.map((k) => `<option>${k}</option>`).join("")}</select>`)}
      ${field("update-plant", "Plant", `<input type="text" id="update-plant" list="update-plants" maxlength="60" required placeholder="e.g. Tomato, or All beds"
        data-error="Write which plant this is about." aria-describedby="update-plant-error">
        <datalist id="update-plants">${PLANTS.map((p) => `<option value="${esc(p.name)}">`).join("")}</datalist>`)}
      ${field("update-text", "Note", `<textarea id="update-text" rows="3" maxlength="1000" required placeholder="Where, how much, how it went…"
        data-error="Write a short note about what you did." aria-describedby="update-text-count update-text-error"></textarea>`,
        '<p class="char-count" id="update-text-count">0 / 1000 characters</p>')}
      <div class="field">
        <label for="update-photo">${icon("camera")} Photo (optional)</label>
        <input type="file" id="update-photo" accept="${PHOTO_ACCEPT}" capture="environment">
        <p class="small">Opens the camera on a phone. iPhone photos work; location data is removed.</p>
        <div class="photo-preview" id="update-preview"></div>
        <p class="form-status" id="update-photo-status" role="status"></p>
      </div>
      <button type="submit" id="update-submit">Save note</button>
      <p class="form-status" id="update-status" role="status"></p>
    </form>
    <form id="update-growing" class="note-form">
      <fieldset class="choice plant-picker">
        <legend>What are you growing?</legend>
        ${PLANTS.map((p) => `<label><input type="checkbox" value="${esc(p.id)}"${app.growing.includes(p.id) ? " checked" : ""}> ${esc(p.name)}</label>`).join("")}
      </fieldset>
      <button type="submit">Save what I grow</button>
      <p class="form-status" id="growing-status" role="status"></p>
    </form>`);

  const form = body.querySelector("#update-note");
  const check = requiredFieldsChecker(form);
  const updateCount = charCounter($("#update-text"), $("#update-text-count"));
  const photo = photoField($("#update-photo"), $("#update-preview"), $("#update-photo-status"), $("#update-submit"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const empty = check();
    if (empty) return showStatus($("#update-status"), emptyFieldsMessage(empty), true);
    const notes = loadNotes();
    const note = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: $("#update-date").value,
      kind: $("#update-kind").value, plant: $("#update-plant").value.trim(), text: $("#update-text").value.trim() };
    if (photo.get()) note.photo = photo.get();
    notes.push(note);
    if (!saveNotes(notes)) {
      return showStatus($("#update-status"), "Not enough space on this phone to save that (photos take the most). Try without the photo.", true);
    }
    $("#update-plant").value = "";
    $("#update-text").value = "";
    updateCount();
    photo.clear();
    showStatus($("#update-status"), "Saved to My notes.", "success");
    toast("Note saved");
    renderMyNotes(note.id);
  });

  body.querySelector("#update-growing").addEventListener("submit", (event) => {
    event.preventDefault();
    app.growing = [...event.target.querySelectorAll("input:checked")].map((box) => box.value);
    saveApp();
    const inGroups = syncMeInGroups();
    showStatus($("#growing-status"), inGroups ? "Saved. Your garden groups show this too." : "Saved.", "success");
    toast("Saved what you grow");
  });

  if (camera) $("#update-photo").click(); // straight to the camera (still inside the tap, so phones allow it)
}

// ---------- Explore ----------

let exploreType = "all";
let exploreShown = RESULTS_PAGE;
let here = null;
let map = null;
let markers = null;
let hereMarker = null;
let lastPlace = "";
const markerById = new Map();

function setupExplore() {
  $("#explore-search").addEventListener("input", debounce(() => { exploreShown = RESULTS_PAGE; drawResults(); }, 200));
  document.querySelector(".explore-bar .chips").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-type]");
    if (!chip) return;
    exploreType = chip.dataset.type;
    for (const c of document.querySelectorAll(".explore-bar .chip")) c.setAttribute("aria-pressed", String(c === chip));
    exploreShown = RESULTS_PAGE;
    drawResults();
  });
  $("#explore-more").addEventListener("click", () => { exploreShown += RESULTS_PAGE; drawResults(); });
  $("#results-toggle").addEventListener("click", () => {
    const panel = $("#results-panel");
    panel.classList.toggle("expanded");
    $("#results-toggle").setAttribute("aria-expanded", String(panel.classList.contains("expanded")));
  });
  $("#explore-results").addEventListener("click", (event) => {
    const item = event.target.closest("[data-garden]");
    if (item) openGardenSheet(item.dataset.garden);
  });
  $("#load-map").addEventListener("click", () => {
    if ($("#always-map").checked) { app.prefs.autoMap = true; saveApp(); renderSettings(); }
    loadMap();
  });
  $("#explore-near").addEventListener("click", findNearMe);
}

function openExplore() {
  $("#explore-near").hidden = !app.prefs.nearMe;
  if (app.prefs.autoMap && !map) loadMap();
  drawResults();
  if (map) setTimeout(() => map.invalidateSize(), 0); // the map was hidden while another tab was open
}

function drawResults() {
  community = loadState();
  const { list, centre, label } = findGardens({ query: $("#explore-search").value, type: exploreType, here, state: community });
  const visible = list.slice(0, exploreShown);
  $("#explore-count").textContent = list.length ? `${plural(list.length, "garden")}${label}` : "No gardens match";
  $("#explore-results").innerHTML = visible.map((g) => {
    const group = groupOfGarden(community, g.id);
    return `<li><button type="button" class="result-card" data-garden="${esc(g.id)}">
      <span class="garden-name">${esc(g.name)}</span>
      <span class="garden-meta">${TYPE_NAMES[g.type]} · ${esc(placeName(g))}${g.km != null ? ` · ${formatDistance(g.km)}` : ""}</span>
      ${group || g.example ? `<span class="garden-tags">${group ? '<span class="tag">Has a group</span>' : ""}${g.example ? ' <span class="tag">Example</span>' : ""}</span>` : ""}
    </button></li>`;
  }).join("");
  $("#explore-more").hidden = visible.length >= list.length;
  if (!map) return;
  markers.clearLayers();
  markerById.clear();
  for (const g of list) {
    const marker = L.circleMarker([g.lat, g.lon], { radius: 7, color: "#1F271D", weight: 1, fillColor: g.type === "c" ? "#2E7D32" : "#A0521D", fillOpacity: 0.9 })
      .on("click", () => openGardenSheet(g.id))
      .addTo(markers);
    markerById.set(g.id, marker);
  }
  if (centre && label !== lastPlace) map.setView([centre.lat, centre.lon], 14);
  lastPlace = centre ? label : "";
}

async function loadMap() {
  const button = $("#load-map");
  button.disabled = true;
  button.textContent = "Loading map…";
  try {
    if (!document.querySelector('link[href="vendor/leaflet/leaflet.css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "vendor/leaflet/leaflet.css";
      document.head.append(css);
    }
    await loadScript("vendor/leaflet/leaflet.js");
  } catch {
    button.disabled = false;
    button.textContent = "Load map";
    return showStatus($("#explore-status"), "The map couldn't be loaded. Check your internet connection.", true);
  }
  if (map) return;
  $("#map-consent").hidden = true;
  $("#app-map").hidden = false;
  map = L.map("app-map", { preferCanvas: true, zoomControl: false }).setView([52.515, 13.405], 11);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  markers = L.layerGroup().addTo(map);
  if (here) showHere();
  drawResults();
}

function findNearMe() {
  if (!navigator.geolocation) return showStatus($("#explore-status"), "This phone can't share its location.", true);
  showStatus($("#explore-status"), "Finding your location…");
  navigator.geolocation.getCurrentPosition((position) => {
    here = { lat: position.coords.latitude, lon: position.coords.longitude };
    $("#explore-search").value = "";
    showStatus($("#explore-status"), "Nearest gardens first. Your location never leaves this phone.");
    exploreShown = RESULTS_PAGE;
    drawResults();
    if (map) showHere();
  }, () => {
    showStatus($("#explore-status"), "Couldn't get your location. You can allow it in your phone's settings.", true);
  }, { timeout: 10000, maximumAge: 600000 });
}

function showHere() {
  hereMarker?.remove();
  hereMarker = L.circleMarker([here.lat, here.lon], { radius: 9, color: "#FAF7F0", weight: 3, fillColor: "#3D7BD9", fillOpacity: 1 })
    .bindTooltip("You are here").addTo(map);
  map.setView([here.lat, here.lon], 14);
}

// ---------- A garden in a sheet: public notes, join form, members-only notes ----------

let approvalTimer = null;

function openGardenSheet(id, flash = "") {
  const garden = gardenById(id);
  if (!garden) return;
  community = loadState();
  const accepted = processApprovals(community);
  if (accepted.length && !flash) { flash = acceptedMessage(accepted); toast("Request accepted"); }
  const group = groupOfGarden(community, id);
  const status = group ? community.myStatus[group.id] : null;
  const isMember = status === "member" || status === "owner";
  const isOwner = status === "owner" && !group.example;
  const km = here ? distanceKm(here, garden) : null;

  let groupHtml;
  if (!group) {
    groupHtml = `
      <p>No group for this garden yet. If you garden here, start one: you decide who can join.</p>
      <form id="app-start" class="note-form" novalidate>
        ${field("app-start-about", "About the group", `<textarea id="app-start-about" rows="3" maxlength="300" required
          placeholder="Who you are, when you meet, who's welcome…" data-error="Write a sentence about the group." aria-describedby="app-start-about-error"></textarea>`)}
        ${field("app-start-places", "How many places? (people or plots)", `<input type="number" id="app-start-places" min="1" max="500" required value="10"
          inputmode="numeric" data-error="Write how many people the group has room for." aria-describedby="app-start-places-error">`)}
        <button type="submit">Start the group</button>
        <p class="form-status" id="app-start-status" role="status"></p>
      </form>`;
  } else {
    const full = !freePlaces(group);
    const shownNotes = (isMember ? group.notes : group.notes.filter((n) => n.visibility === "public"))
      .slice().sort((a, b) => b.date.localeCompare(a.date));
    const hidden = group.notes.length - shownNotes.length;
    // Many join requests would push everything else down, so they go at the bottom; after 3 they fold away.
    const requestCard = (r) => `<li class="request-card">
      <p><strong>${esc(r.name)}</strong> · ${esc(formatDate(r.date))} <span class="tag">Example request</span></p>
      <p class="note-body">${esc(r.message)}</p>
      <p class="small">Would like to grow: ${esc(r.growing)}</p>
      <button type="button" data-approve="${esc(r.id)}"${full ? " disabled" : ""}>Approve</button>
      <button type="button" class="button-secondary" data-decline="${esc(r.id)}">Decline</button>
    </li>`;
    const requests = isOwner ? group.requests : [];
    groupHtml = `
      <p class="small">Community group run by its members, not an official page of this garden.</p>
      <p>${esc(group.description)}</p>
      <p class="group-meta">${plural(group.members.length, "member")} · started by ${esc(group.owner)}${isMember ? ` · you're ${status === "owner" ? "the owner" : "a member"}` : ""}</p>
      <p class="places${full ? " full" : ""}">${icon("users")} ${placesLine(group)}</p>
      ${isOwner ? `
        <details class="group-edit">
          <summary>Group details: description and places</summary>
          <form id="app-edit" class="note-form" novalidate>
            ${field("app-edit-about", "Description", `<textarea id="app-edit-about" rows="3" maxlength="300" required
              data-error="Write a sentence about the group." aria-describedby="app-edit-about-error">${esc(group.description)}</textarea>`)}
            ${field("app-edit-places", "Places (people or plots)", `<input type="number" id="app-edit-places" min="${group.members.length}" max="500" required
              value="${group.places}" inputmode="numeric" data-error="Write how many people the group has room for." aria-describedby="app-edit-places-error">`)}
            <button type="submit">Save group details</button>
            <p class="form-status" id="app-edit-status" role="status"></p>
          </form>
        </details>` : ""}
      <h3>${isMember ? "Notes" : "Public notes"}</h3>
      ${shownNotes.length ? `<ul class="note-feed">${shownNotes.map((n) => noteCard(n, false)).join("")}</ul>` : '<p class="empty">No notes yet.</p>'}
      ${hidden ? `<p class="hidden-notes">${plural(hidden, "members-only note")} ${hidden === 1 ? "is" : "are"} hidden. Ask to join to read ${hidden === 1 ? "it" : "them"}.</p>` : ""}
      ${status === "pending" ? `<p class="request-status" role="status">Request sent to ${esc(group.owner)}, waiting for approval… (In this prototype, a pretend admin answers in a few seconds.)</p>` : ""}
      ${status === "waiting" ? `<p class="request-status" role="status">You're on the waiting list. ${esc(group.owner)} will let you know when a place is free.</p>
        <button type="button" class="button-secondary" id="app-leave-waiting">Leave the waiting list</button>` : ""}
      ${!status ? `
        <h3>${full ? "Join the waiting list" : "Ask to join"}</h3>
        <form id="app-join" class="note-form" novalidate>
          <p class="form-hint">${full ? "This group is full right now. Join the waiting list and you'll hear when a place is free. " : ""}All fields are required. ${esc(group.owner)} will see your request.</p>
          ${field("app-join-name", "Your name", `<input type="text" id="app-join-name" maxlength="40" required value="${esc(app.name)}"
            data-error="Write the name the group will see." aria-describedby="app-join-name-error">`)}
          ${field("app-join-message", "Message to the group", `<textarea id="app-join-message" rows="3" maxlength="500" required
            placeholder="A little about you and why you'd like to join" data-error="Write a short message to the group." aria-describedby="app-join-message-error"></textarea>`)}
          ${field("app-join-growing", "What would you like to grow?", `<input type="text" id="app-join-growing" maxlength="100" required
            placeholder="e.g. Tomatoes and basil" data-error="Write what you'd like to grow, or 'not sure yet'." aria-describedby="app-join-growing-error">`)}
          <button type="submit">${full ? "Join the waiting list" : "Ask to join"}</button>
          <p class="form-status" id="app-join-status" role="status"></p>
        </form>` : ""}
      ${isMember ? `<p class="small"><a href="${gardenUrl(id)}" data-desktop>Post notes and see members on the desktop site</a></p>` : ""}
      ${requests.length ? `
        <section class="sheet-requests" aria-labelledby="app-requests-title">
          <h3 id="app-requests-title">Join requests (${requests.length})</h3>
          ${full ? '<p class="small">The group is full. Add places under "Group details" to accept more people.</p>' : ""}
          <p class="form-status" id="app-requests-status" role="status"></p>
          <ul class="request-list">${requests.slice(0, 3).map(requestCard).join("")}</ul>
          ${requests.length > 3 ? `<details class="more-requests"><summary>Show all ${requests.length} requests</summary>
            <ul class="request-list">${requests.slice(3).map(requestCard).join("")}</ul></details>` : ""}
        </section>` : ""}`;
  }

  const body = openSheet(garden.name, `
    <p class="flash${flash ? " is-success" : ""}" id="sheet-flash" role="status">${esc(flash)}</p>
    <p class="garden-meta">${TYPE_NAMES[garden.type]} · ${esc(placeName(garden))}${km != null ? ` · ${formatDistance(km)} away` : ""}</p>
    ${garden.website ? `<p><a href="${esc(garden.website)}" target="_blank" rel="noopener">Garden website</a></p>` : ""}
    ${garden.example ? '<p class="small">A made-up garden for this prototype.</p>' : ""}
    ${groupHtml}`);

  if (map) { map.setView([garden.lat, garden.lon], Math.max(map.getZoom(), 15)); }

  // Saves, redraws the sheet and shows the message next to what you did, or at the top of the sheet
  // if that part is gone (e.g. after answering the last join request).
  const done = (message, where = "#sheet-flash") => {
    if (!saveState(community)) return showStatus($("#sheet-flash"), "This phone's storage is full, so that couldn't be saved.", true);
    openGardenSheet(id);
    const el = $(where) || $("#sheet-flash");
    showStatus(el, message, "success");
    el.scrollIntoView({ block: "nearest" });
    toast(message.split(/[.!]/)[0]);
    renderUpdates();
  };

  const start = body.querySelector("#app-start");
  if (start) {
    const check = requiredFieldsChecker(start);
    start.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = check();
      if (empty) return showStatus($("#app-start-status"), emptyFieldsMessage(empty), true);
      const places = Number($("#app-start-places").value);
      if (!(places >= 1 && places <= 500)) return showStatus($("#app-start-status"), "Places must be a number from 1 to 500.", true);
      community = loadState();
      community.me.name = app.name;
      const created = startGroup(community, garden, { description: $("#app-start-about").value.trim(), places });
      const asked = created.requests.length === 1 ? "1 person has" : `${created.requests.length} people have`;
      done(`Your group is ready. ${asked} already asked to join (example requests, at the bottom).`);
    });
  }

  const join = body.querySelector("#app-join");
  if (join) {
    const check = requiredFieldsChecker(join);
    join.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = check();
      if (empty) return showStatus($("#app-join-status"), emptyFieldsMessage(empty), true);
      community = loadState();
      community.me.name = $("#app-join-name").value.trim();
      if (!freePlaces(group)) {
        community.myStatus[group.id] = "waiting";
        return done(`You're on the waiting list for ${group.name}.`);
      }
      community.myStatus[group.id] = "pending";
      community.myRequests[group.id] = { growing: $("#app-join-growing").value.trim(), sentAt: Date.now() };
      done("Request sent. You'll see here when it's accepted.");
    });
  }

  body.querySelector("#app-leave-waiting")?.addEventListener("click", () => {
    community = loadState();
    delete community.myStatus[group.id];
    done("You left the waiting list.");
  });

  const edit = body.querySelector("#app-edit");
  if (edit) {
    const check = requiredFieldsChecker(edit);
    edit.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = check();
      if (empty) return showStatus($("#app-edit-status"), emptyFieldsMessage(empty), true);
      const places = Number($("#app-edit-places").value);
      if (!(places >= group.members.length && places <= 500)) {
        return showStatus($("#app-edit-status"), `Places must be at least ${group.members.length} (your members) and at most 500.`, true);
      }
      community = loadState();
      const mine = community.groups.find((g) => g.id === group.id);
      mine.description = $("#app-edit-about").value.trim();
      mine.places = places;
      done("Group details saved.");
    });
  }

  body.querySelectorAll("[data-approve], [data-decline]").forEach((button) => button.addEventListener("click", () => {
    community = loadState();
    const mine = community.groups.find((g) => g.id === group.id);
    done(answerRequest(mine, button.dataset.approve || button.dataset.decline, Boolean(button.dataset.approve)), "#app-requests-status");
  }));

  if (status === "pending") {
    clearTimeout(approvalTimer);
    const waited = Date.now() - (community.myRequests[group.id]?.sentAt ?? 0);
    approvalTimer = setTimeout(() => {
      if (!sheet.hidden && $("#sheet-title").textContent === garden.name) openGardenSheet(id);
      renderUpdates();
    }, Math.max(0, APPROVAL_DELAY_MS - waited) + 50);
  }
}

// ---------- Settings ----------

let profilePhoto = null;
let installPrompt = null;

function setupSettings() {
  $("#app-profile-photo").accept = PHOTO_ACCEPT;
  profilePhoto = photoField($("#app-profile-photo"), $("#app-profile-preview"), $("#app-profile-photo-status"), $("#app-profile-submit"));
  const checkProfile = requiredFieldsChecker($("#app-profile"));
  $("#app-profile").addEventListener("submit", (event) => {
    event.preventDefault();
    const empty = checkProfile();
    if (empty) return showStatus($("#app-profile-status"), emptyFieldsMessage(empty), true);
    app.name = $("#app-profile-name").value.trim();
    app.district = $("#app-profile-district").value;
    if (profilePhoto.get()) app.photo = profilePhoto.get();
    if (!saveApp()) return showStatus($("#app-profile-status"), "Not enough space on this phone to save that photo.", true);
    syncMeInGroups();
    $("#greeting").textContent = `Welcome back, ${app.name}`;
    showStatus($("#app-profile-status"), "Profile saved.", "success");
    toast("Profile saved");
  });

  const savePrefs = (message) => { saveApp(); showStatus($("#permissions-status"), message, "success"); };
  $("#pref-near-me").addEventListener("change", (e) => { app.prefs.nearMe = e.target.checked; savePrefs(e.target.checked ? "\"Near me\" is on." : "\"Near me\" is off and hidden."); });
  $("#pref-auto-map").addEventListener("change", (e) => { app.prefs.autoMap = e.target.checked; savePrefs(e.target.checked ? "The map loads automatically." : "Explore will ask before loading the map."); });
  $("#pref-sounds").addEventListener("change", (e) => { storageSet(SOUNDS_KEY, e.target.checked ? "on" : "off"); showStatus($("#permissions-status"), e.target.checked ? "Sounds are on." : "Sounds are off.", "success"); });
  for (const radio of document.querySelectorAll('input[name="pref-visibility"]')) {
    radio.addEventListener("change", () => { app.prefs.noteVisibility = radio.value; savePrefs(radio.value === "public" ? "New group notes will be public." : "New group notes will be for members only."); });
  }

  $("#app-faq").innerHTML = faqHtml(); // the same questions as the desktop site
  $("#app-faq").addEventListener("click", handleAppLink);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    $("#install-app").hidden = false;
  });
  $("#install-app").addEventListener("click", async () => {
    installPrompt?.prompt();
    await installPrompt?.userChoice;
    installPrompt = null;
    $("#install-app").hidden = true;
  });
  if (matchMedia?.("(display-mode: standalone)").matches) $("#install-text").textContent = "You're using the installed app. It works without signal on your plot.";

  $("#download-notes").addEventListener("click", () => downloadNotes(loadNotes()));
  $("#reset-prototype").addEventListener("click", resetPrototype);
  $("#logout").addEventListener("click", () => {
    if (!confirm("Log out? Your notes and garden groups stay on this phone.")) return;
    app.signedIn = false;
    saveApp();
    location.hash = "";
    showWelcome("You're logged out. Your notes are still here when you come back.");
  });
  $("#delete-profile").addEventListener("click", () => {
    if (!confirm("Delete your profile? This erases your name, notes, garden groups, jobs, suggestions and settings from this phone. It can't be undone.")) return;
    for (const key of [APP_KEY, NOTES_KEY, COMMUNITY_KEY, CITY_KEY, SOUNDS_KEY, SUGGESTIONS_KEY]) storageRemove(key);
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith("garden-jobs-")) storageRemove(key);
    } catch { /* storage blocked */ }
    app = loadAppSettings();
    community = loadState();
    profilePhoto.clear();
    location.hash = "";
    showWelcome("Your profile was deleted from this phone.");
  });
}

function renderSettings() {
  $("#app-profile-name").value = app.name;
  $("#app-profile-district").value = app.district;
  $("#app-profile-preview").innerHTML = app.photo ? `<img src="${esc(app.photo)}" alt="Your profile photo">` : `<span class="avatar">${esc(app.name.charAt(0).toUpperCase() || "?")}</span>`;
  $("#pref-near-me").checked = app.prefs.nearMe;
  $("#pref-auto-map").checked = app.prefs.autoMap;
  $("#pref-sounds").checked = storageGet(SOUNDS_KEY) !== "off";
  for (const radio of document.querySelectorAll('input[name="pref-visibility"]')) radio.checked = radio.value === app.prefs.noteVisibility;
}

// ---------- Start ----------

// Offline + installable: the service worker only looks after the app, not the desktop pages.
if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  navigator.serviceWorker.register("sw.js", { scope: "./app" }).catch(() => {});
}

if (app.signedIn) showApp(); else showWelcome();
