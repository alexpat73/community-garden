// ============================================================
// Gardens and garden groups (prototype).
// Finds real Berlin gardens (gardens-data.js, from OpenStreetMap) and runs garden
// groups in this browser: the examples from community-demo.js plus your own.
// Nothing is sent anywhere; join requests are approved by a pretend admin.
// Uses helpers from app.js: $, esc, storageGet, storageSet, formatDate, todayISO,
// loadNotes, showStatus, requiredFieldsChecker, emptyFieldsMessage, charCounter.
// ============================================================

const COMMUNITY_KEY = "garden-community-v1";
const APPROVAL_DELAY_MS = 4000; // the pretend admin accepts join requests after 4 seconds
const PAGE_SIZE = 30;
const TYPE_NAMES = { c: "Community garden", a: "Allotment colony" };
const PHOTO_ACCEPT = "image/*,.heic,.heif";

// ---------- Small helpers ----------

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const plantName = (id) => PLANTS.find((p) => p.id === id)?.name ?? id;

// "Kürbis Straße" and "kurbis strasse" should match each other.
const simplify = (text) => String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase();

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Straight-line distance between two points on Earth (haversine formula).
function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000 / 10) * 10} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`);

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// Loads a script once (Leaflet, the HEIC converter) only when it's needed.
const loadedScripts = {};
function loadScript(src) {
  loadedScripts[src] ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => { delete loadedScripts[src]; reject(new Error(`Couldn't load ${src}`)); };
    document.head.append(script);
  });
  return loadedScripts[src];
}

// "30 Sep 2026 · Planted · Garlic" for a My Notes diary entry (older imported notes may lack some parts).
const diaryLine = (n) => [formatDate(n.date), n.kind, n.plant].filter(Boolean).join(" · ");

// Picks plants mentioned in free text, e.g. "Tomatoes and basil" -> ["tomato", "basil"].
const plantsMentioned = (text) => PLANTS.filter((p) => simplify(text).includes(simplify(p.name))).map((p) => p.id);

// ---------- All gardens: the examples plus the real ones ----------

const ALL_GARDENS = [...DEMO_GARDENS, ...GARDENS].map(([name, type, lat, lon, district, website, postcode, id]) => ({
  name, type, lat, lon, website, postcode, id,
  district: GARDEN_DISTRICTS[district],
  example: id.startsWith("demo-"),
  search: simplify(`${name} ${GARDEN_DISTRICTS[district]} ${postcode}`),
})).sort((a, b) => a.name.localeCompare(b.name, "de"));
const gardenById = (id) => ALL_GARDENS.find((g) => g.id === id);
const gardenUrl = (id) => `garden.html?id=${encodeURIComponent(id)}`;

function osmUrl(id) {
  const kind = { n: "node", w: "way", r: "relation" }[id[0]];
  return kind ? `https://www.openstreetmap.org/${kind}/${id.slice(1)}` : "";
}

// ---------- Prototype state (saved in this browser only) ----------

function seedState() {
  return {
    me: { name: "" },
    groups: DEMO_GROUPS.map((g) => ({
      id: g.id, gardenId: g.gardenId, name: g.name, description: g.description, owner: g.owner, example: true,
      members: g.members.map((m) => ({ id: uid(), name: m.name, growing: m.growing, photo: null, isMe: false })),
      notes: g.notes.map((n) => ({ id: uid(), author: n.author, authorIsMe: false, date: isoDaysAgo(n.daysAgo),
        visibility: n.visibility, text: n.text, photo: null })),
      requests: [],
    })),
    myStatus: {},     // group id -> "owner" | "member" | "pending"
    myRequests: {},   // group id -> { growing, sentAt } while waiting for approval
  };
}

function loadState() {
  try {
    const state = JSON.parse(storageGet(COMMUNITY_KEY));
    if (state && Array.isArray(state.groups)) return state;
  } catch {
    // broken or missing: start fresh below
  }
  const fresh = seedState();
  storageSet(COMMUNITY_KEY, JSON.stringify(fresh));
  return fresh;
}

// False when the browser is out of space (usually because of photos) or blocks storage.
const saveState = (state) => storageSet(COMMUNITY_KEY, JSON.stringify(state));

const groupOfGarden = (state, gardenId) => state.groups.find((g) => g.gardenId === gardenId);

// The pretend admin: accepts every request that has waited long enough. Returns the accepted groups.
function processApprovals(state) {
  const accepted = [];
  for (const [groupId, request] of Object.entries(state.myRequests)) {
    const group = state.groups.find((g) => g.id === groupId);
    if (!group || state.myStatus[groupId] !== "pending") { delete state.myRequests[groupId]; continue; }
    if (Date.now() - request.sentAt < APPROVAL_DELAY_MS) continue;
    group.members.push({ id: uid(), name: state.me.name, growing: plantsMentioned(request.growing), photo: null, isMe: true });
    state.myStatus[groupId] = "member";
    delete state.myRequests[groupId];
    accepted.push(group);
  }
  if (accepted.length) saveState(state);
  return accepted;
}
const acceptedMessage = (groups) => groups.map((g) => `${g.owner} accepted your request! You're now a member of ${g.name}.`).join(" ");

function resetPrototype() {
  if (!confirm("Reset the prototype? This removes your groups, requests and group notes from this browser and brings back the examples. Your own My Notes diary isn't affected.")) return;
  storageSet(COMMUNITY_KEY, JSON.stringify(seedState()));
  location.reload();
}

// ---------- Photos (JPG, PNG, WebP and iPhone HEIC) ----------

const PHOTO_MAX_BYTES = 25 * 1024 * 1024;
const PHOTO_MAX_SIDE = 640;
const HEIC_BRANDS = ["mif1", "msf1", "heic", "heix", "hevc", "hevx"];

class PhotoError extends Error {}

// HEIC files start with a "brand" at bytes 8-12. Checked as well as the name, since some browsers leave the type empty.
async function isHeicFile(file) {
  if (/^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true;
  const brand = new TextDecoder().decode(await file.slice(8, 12).arrayBuffer());
  return HEIC_BRANDS.includes(brand.replace(/\0/g, "").trim());
}

function decodeWithBrowser(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

// Returns a small JPEG data URL. Redrawing on a canvas also drops all EXIF data, including GPS location.
async function preparePhoto(file, onProgress) {
  if (file.size > PHOTO_MAX_BYTES) throw new PhotoError("That photo is over 25 MB. Please pick a smaller one.");
  let image;
  try {
    image = await decodeWithBrowser(file); // JPG/PNG/WebP everywhere; Safari can also read HEIC itself
  } catch {
    if (!(await isHeicFile(file))) throw new PhotoError("This photo couldn't be read. Try a JPG or PNG.");
    onProgress?.("Converting iPhone photo…");
    try {
      await loadScript("vendor/heic-to/heic-to.js"); // about 775 KB, only loaded for HEIC photos
      image = await window.HeicTo({ blob: file, type: "bitmap" });
    } catch {
      throw new PhotoError("This photo couldn't be read. Try a JPG or PNG.");
    }
  }
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  return canvas.toDataURL("image/jpeg", 0.7);
}

// Wires a photo input: shows progress and a preview, and keeps Save disabled while it works.
// Returns { get: () => dataUrl or null, clear() }.
function photoField(input, preview, status, submitButton) {
  let photo = null;
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    submitButton.disabled = true;
    showStatus(status, "Preparing photo…");
    try {
      photo = await preparePhoto(file, (message) => showStatus(status, message));
      preview.innerHTML = `<img src="${photo}" alt="Preview of your photo">`;
      showStatus(status, "Photo ready.");
    } catch (error) {
      photo = null;
      preview.innerHTML = "";
      input.value = "";
      showStatus(status, error instanceof PhotoError ? error.message : "This photo couldn't be read. Try a JPG or PNG.", true);
    } finally {
      submitButton.disabled = false;
    }
  });
  return {
    get: () => photo,
    clear() { photo = null; input.value = ""; preview.innerHTML = ""; showStatus(status, ""); },
  };
}

// ---------- Shared bits of markup ----------

function avatar(member) {
  return member.photo
    ? `<img class="avatar" src="${esc(member.photo)}" alt="">`
    : `<span class="avatar" aria-hidden="true">${esc((member.name || "?").trim().charAt(0).toUpperCase())}</span>`;
}

function noteCard(note, canDelete) {
  return `<li class="note-card">
    <p class="note-head"><strong>${esc(note.author)}</strong> · ${esc(formatDate(note.date))}
      <span class="tag">${note.visibility === "public" ? "Public" : "Members only"}</span></p>
    <p class="note-body">${esc(note.text)}</p>
    ${note.photo ? `<img class="note-photo" src="${esc(note.photo)}" alt="Photo from ${esc(note.author)}">` : ""}
    ${canDelete ? `<button type="button" class="button-secondary small-button" data-delete-note="${esc(note.id)}">Delete</button>` : ""}
  </li>`;
}

// One required field: label, input, error line. Matches the notes form (the .field pattern).
function field(id, label, input, extra = "") {
  return `<div class="field">
    <label for="${id}">${label}</label>
    ${input}
    ${extra}
    <p class="field-error" id="${id}-error"></p>
  </div>`;
}

// ---------- Find a garden (gardens.html) ----------

function renderGardens() {
  const state = loadState();
  const pageStatus = $("#community-status");
  const accepted = processApprovals(state);
  if (accepted.length) showStatus(pageStatus, acceptedMessage(accepted));

  // Your groups
  const mine = state.groups.filter((g) => state.myStatus[g.id]);
  const statusLabel = { owner: "Owner", member: "Member", pending: "Request pending" };
  // Only shown once you're in a group, so the search stays at the top of the page.
  $("#my-groups-box").hidden = !mine.length;
  $("#my-groups").innerHTML = `<ul class="my-groups">${mine.map((g) => `<li><a href="${gardenUrl(g.gardenId)}">${esc(g.name)}</a>
    <span class="tag">${statusLabel[state.myStatus[g.id]]}</span></li>`).join("")}</ul>`;

  const search = $("#garden-search");
  const district = $("#garden-district");
  const type = $("#garden-type");
  const listStatus = $("#near-status");
  district.insertAdjacentHTML("beforeend", GARDEN_DISTRICTS.map((d) => `<option>${esc(d)}</option>`).join(""));

  let shown = PAGE_SIZE;
  let here = null; // your position, only ever kept in this page
  let map = null;
  let markers = null;
  const hasGroup = (g) => Boolean(groupOfGarden(state, g.id));

  function results() {
    const query = simplify(search.value.trim());
    const list = ALL_GARDENS.filter((g) =>
      (!query || g.search.includes(query)) &&
      (!district.value || g.district === district.value) &&
      (type.value === "all" || (type.value === "example" ? g.example : type.value === "group" ? hasGroup(g) : g.type === type.value)));
    if (here) {
      for (const g of list) g.km = distanceKm(here, g);
      list.sort((a, b) => a.km - b.km);
    }
    return list;
  }

  function draw() {
    const list = results();
    const visible = list.slice(0, shown);
    $("#garden-count").textContent = list.length
      ? (visible.length < list.length ? `Showing ${visible.length} of ${list.length} gardens` : `Showing all ${list.length} gardens`)
      : "No gardens match. Try another name or district.";
    $("#garden-results").innerHTML = visible.map((g) => `
      <li class="garden-card">
        <a class="garden-name" href="${gardenUrl(g.id)}">${esc(g.name)}</a>
        <p class="garden-meta">${TYPE_NAMES[g.type]} · ${esc(g.district)}${here ? ` · ${formatDistance(g.km)}` : ""}</p>
        ${g.example || hasGroup(g) ? `<p class="garden-tags">${hasGroup(g) ? '<span class="tag">Has a group</span>' : ""}
          ${g.example ? '<span class="tag">Example</span>' : ""}</p>` : ""}
        ${map ? `<button type="button" class="button-secondary small-button" data-fly="${esc(g.id)}">Show on map</button>` : ""}
      </li>`).join("");
    $("#show-more").hidden = visible.length >= list.length;
    if (map) drawMarkers(list);
  }

  const redraw = () => { shown = PAGE_SIZE; draw(); };
  search.addEventListener("input", debounce(redraw, 150));
  district.addEventListener("change", redraw);
  type.addEventListener("change", redraw);
  $("#show-more").addEventListener("click", () => { shown += PAGE_SIZE; draw(); });

  $("#near-me").addEventListener("click", () => {
    if (!navigator.geolocation) {
      showStatus(listStatus, "Your browser can't share your location, so the list stays A to Z.", true);
      return;
    }
    showStatus(listStatus, "Finding your location…");
    navigator.geolocation.getCurrentPosition((position) => {
      here = { lat: position.coords.latitude, lon: position.coords.longitude };
      showStatus(listStatus, "Nearest gardens first. Your location never leaves this device.");
      redraw();
      if (map) showHere();
    }, () => {
      showStatus(listStatus, "Couldn't get your location, so the list stays A to Z. You can allow location in your browser settings.", true);
    }, { timeout: 10000, maximumAge: 600000 });
  });

  // ----- The map, loaded only when asked for -----
  const markerById = new Map();
  let hereMarker = null;

  $("#show-map").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Loading map…";
    try {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "vendor/leaflet/leaflet.css";
      document.head.append(css);
      await loadScript("vendor/leaflet/leaflet.js");
    } catch {
      button.disabled = false;
      button.textContent = "Show map";
      showStatus(listStatus, "The map couldn't be loaded. Check your internet connection.", true);
      return;
    }
    $("#map-placeholder").hidden = true;
    $("#map").hidden = false;
    map = L.map("map", { preferCanvas: true }).setView([52.515, 13.405], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
    $("#map-legend").hidden = false;
    if (here) showHere();
    draw();
  });

  function drawMarkers(list) {
    markers.clearLayers();
    markerById.clear();
    for (const g of list) {
      const colour = g.type === "c" ? "#2E7D32" : "#A0521D";
      const marker = L.circleMarker([g.lat, g.lon], { radius: 6, color: "#1F271D", weight: 1, fillColor: colour, fillOpacity: 0.9 })
        .bindPopup(`<strong>${esc(g.name)}</strong><br>${TYPE_NAMES[g.type]} · ${esc(g.district)}<br><a href="${gardenUrl(g.id)}">Open this garden</a>`)
        .addTo(markers);
      markerById.set(g.id, marker);
    }
  }

  function showHere() {
    hereMarker?.remove();
    hereMarker = L.circleMarker([here.lat, here.lon], { radius: 8, color: "#FAF7F0", weight: 3, fillColor: "#3D7BD9", fillOpacity: 1 })
      .bindTooltip("You are here").addTo(map);
    map.setView([here.lat, here.lon], 13);
  }

  $("#garden-results").addEventListener("click", (event) => {
    const id = event.target.closest("[data-fly]")?.dataset.fly;
    if (!id || !map) return;
    const g = gardenById(id);
    map.flyTo([g.lat, g.lon], 16);
    markerById.get(id)?.openPopup();
  });

  $("#reset-prototype").addEventListener("click", resetPrototype);
  draw();
}

// ---------- One garden and its group (garden.html?id=…) ----------

function renderGardenPage() {
  const garden = gardenById(new URLSearchParams(location.search).get("id") || "");
  const main = $("#garden-main");
  if (!garden) {
    $("#garden-title").textContent = "GARDEN NOT FOUND";
    main.innerHTML = '<p>We couldn\'t find this garden. <a href="gardens.html">Back to all gardens</a></p>';
    return;
  }
  document.title = `${garden.name} · Community Garden`;
  $("#garden-title").textContent = garden.name.toUpperCase();
  $("#reset-prototype").addEventListener("click", resetPrototype);

  let state = loadState();
  const pageStatus = $("#community-status");
  const accepted = processApprovals(state);
  if (accepted.length) showStatus(pageStatus, acceptedMessage(accepted));

  // Saves and redraws, or undoes the change if the browser is out of space. The message appears
  // next to what you just did (target), scrolled into view if needed, rather than at the top of the page.
  function commit(message, target = "#group-flash", scroll = true) {
    if (!saveState(state)) {
      state = loadState();
      draw();
      flash("Not enough space in this browser to save that (photos take the most). Try without a photo, or delete some.", target, true, true);
      return;
    }
    draw();
    if (message) flash(message, target, false, scroll);
  }

  function flash(message, target, isError = false, scroll = true) {
    const el = $(target) || $("#group-flash") || pageStatus;
    showStatus(el, message, isError);
    if (scroll) el.scrollIntoView({ block: "nearest" });
  }

  const details = `
    <dl class="facts">
      <dt>Type</dt><dd>${TYPE_NAMES[garden.type]}</dd>
      <dt>District</dt><dd>${esc(garden.district)}</dd>
      ${garden.postcode ? `<dt>Postcode</dt><dd>${esc(garden.postcode)}</dd>` : ""}
      ${garden.website ? `<dt>Website</dt><dd><a href="${esc(garden.website)}" target="_blank" rel="noopener">${esc(garden.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a></dd>` : ""}
      ${garden.example ? "<dt>Note</dt><dd>A made-up garden for this prototype.</dd>"
        : `<dt>Map</dt><dd><a href="${osmUrl(garden.id)}" target="_blank" rel="noopener">View on OpenStreetMap</a></dd>`}
    </dl>`;

  function draw() {
    const group = groupOfGarden(state, garden.id);
    const status = group ? state.myStatus[group.id] : null;
    if (!group) drawNoGroup(details);
    else if (status === "owner" || status === "member") drawMemberView(details, group, status);
    else drawVisitorView(details, group, status);
  }

  // ----- Nobody has started a group yet -----
  function drawNoGroup(details) {
    main.innerHTML = `${details}
      <section class="group-box">
        <p class="flash" id="group-flash" role="status"></p>
        <h2>No group yet</h2>
        <p>Nobody has started a group for this garden on this site. If you garden here, start one: you decide who can join, and each note can be for members only or for everyone.</p>
        <form id="start-form" class="note-form" novalidate>
          <p class="form-hint">All fields are required.</p>
          ${field("start-name", "Your name in the group", `<input type="text" id="start-name" maxlength="40" required
            placeholder="A first name or nickname is fine" value="${esc(state.me.name)}" data-error="Write the name others will see." aria-describedby="start-name-error">`)}
          ${field("start-about", "About the group", `<textarea id="start-about" rows="3" maxlength="300" required
            placeholder="Who you are, when you meet, who's welcome…" data-error="Write a sentence about the group." aria-describedby="start-about-count start-about-error"></textarea>`,
            '<p class="char-count" id="start-about-count">0 / 300 characters</p>')}
          <button type="submit">Start the group</button>
          <p class="form-status" id="start-status" role="status"></p>
        </form>
      </section>`;
    const form = $("#start-form");
    const check = requiredFieldsChecker(form);
    charCounter($("#start-about"), $("#start-about-count"));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = check();
      if (empty) return showStatus($("#start-status"), emptyFieldsMessage(empty), true);
      state.me.name = $("#start-name").value.trim();
      const group = {
        id: uid(), gardenId: garden.id, name: garden.name, description: $("#start-about").value.trim(),
        owner: state.me.name, example: false,
        members: [{ id: uid(), name: state.me.name, growing: [], photo: null, isMe: true }],
        notes: [],
        requests: DEMO_REQUESTS.map((r) => ({ ...r, id: uid(), date: todayISO() })),
      };
      state.groups.push(group);
      state.myStatus[group.id] = "owner";
      commit(`Your group is ready. ${group.requests.length} people have already asked to join (example requests).`);
    });
  }

  // ----- Not a member (or waiting): public notes and the join form -----
  function drawVisitorView(details, group, status) {
    const publicNotes = group.notes.filter((n) => n.visibility === "public");
    const hidden = group.notes.length - publicNotes.length;
    main.innerHTML = `${details}
      <section class="group-box">
        <p class="flash" id="group-flash" role="status"></p>
        <h2>${esc(group.name)}</h2>
        <p class="small">Community group run by its members, not an official page of this garden.</p>
        <p>${esc(group.description)}</p>
        <p class="group-meta">${plural(group.members.length, "member")} · started by ${esc(group.owner)}</p>
        <h3>Public notes</h3>
        ${publicNotes.length ? `<ul class="note-feed">${publicNotes.map((n) => noteCard(n, false)).join("")}</ul>`
          : '<p class="empty">No public notes yet.</p>'}
        ${hidden ? `<p class="hidden-notes">${plural(hidden, "members-only note")} ${hidden === 1 ? "is" : "are"} hidden. Ask to join to read ${hidden === 1 ? "it" : "them"}.</p>` : ""}
        ${status === "pending"
          ? `<p class="request-status" role="status">Request sent to ${esc(group.owner)}, waiting for approval… (In this prototype, a pretend admin answers in a few seconds.)</p>`
          : `<h3>Ask to join</h3>
            <form id="join-form" class="note-form" novalidate>
              <p class="form-hint">All fields are required. ${esc(group.owner)} will see your request.</p>
              ${field("join-name", "Your name", `<input type="text" id="join-name" maxlength="40" required placeholder="A first name or nickname is fine"
                value="${esc(state.me.name)}" data-error="Write the name the group will see." aria-describedby="join-name-error">`)}
              ${field("join-message", "Message to the group", `<textarea id="join-message" rows="3" maxlength="500" required
                placeholder="A little about you and why you'd like to join" data-error="Write a short message to the group." aria-describedby="join-message-count join-message-error"></textarea>`,
                '<p class="char-count" id="join-message-count">0 / 500 characters</p>')}
              ${field("join-growing", "What would you like to grow?", `<input type="text" id="join-growing" maxlength="100" required
                placeholder="e.g. Tomatoes and basil" data-error="Write what you'd like to grow, or 'not sure yet'." aria-describedby="join-growing-error">`)}
              <button type="submit">Ask to join</button>
              <p class="form-status" id="join-status" role="status"></p>
            </form>`}
      </section>`;
    if (status === "pending") return scheduleApprovalCheck(group);

    const form = $("#join-form");
    const check = requiredFieldsChecker(form);
    charCounter($("#join-message"), $("#join-message-count"));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = check();
      if (empty) return showStatus($("#join-status"), emptyFieldsMessage(empty), true);
      state.me.name = $("#join-name").value.trim();
      state.myStatus[group.id] = "pending";
      state.myRequests[group.id] = { growing: $("#join-growing").value.trim(), sentAt: Date.now() };
      commit(null); // the "waiting for approval" line replaces the form
    });
  }

  function scheduleApprovalCheck(group) {
    const waited = Date.now() - (state.myRequests[group.id]?.sentAt ?? 0);
    setTimeout(() => {
      state = loadState();
      const accepted = processApprovals(state);
      draw();
      if (accepted.length) flash(acceptedMessage(accepted), "#group-flash");
    }, Math.max(0, APPROVAL_DELAY_MS - waited) + 50);
  }

  // ----- Members and the owner: everything -----
  function drawMemberView(details, group, status) {
    const isOwner = status === "owner";
    const me = group.members.find((m) => m.isMe);
    const myNotes = loadNotes().sort((a, b) => b.date.localeCompare(a.date));
    const notes = [...group.notes].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));

    main.innerHTML = `${details}
      ${isOwner && group.requests.length ? `
        <section class="group-box requests">
          <h2>Join requests (${group.requests.length})</h2>
          <p class="form-status" id="requests-status" role="status"></p>
          <ul class="request-list">${group.requests.map((r) => `
            <li class="request-card">
              <p><strong>${esc(r.name)}</strong> · ${esc(formatDate(r.date))} <span class="tag">Example request</span></p>
              <p class="note-body">${esc(r.message)}</p>
              <p class="small">Would like to grow: ${esc(r.growing)}</p>
              <button type="button" data-approve="${esc(r.id)}">Approve</button>
              <button type="button" class="button-secondary" data-decline="${esc(r.id)}">Decline</button>
            </li>`).join("")}</ul>
        </section>` : ""}
      <section class="group-box">
        <p class="flash" id="group-flash" role="status"></p>
        <h2>${esc(group.name)}</h2>
        <p class="small">Community group run by its members, not an official page of this garden.</p>
        <p>${esc(group.description)}</p>
        <p class="group-meta">${plural(group.members.length, "member")} · started by ${esc(group.owner)} · you're ${isOwner ? "the owner" : "a member"}</p>
      </section>
      <div class="group-columns">
        <section class="group-box">
          <h2>Notes</h2>
          <form id="note-post" class="note-form" novalidate>
            ${field("post-text", "New note", `<textarea id="post-text" rows="4" maxlength="1000" required placeholder="What did you do, notice or need help with?"
              data-error="Write your note first." aria-describedby="post-text-count post-text-error"></textarea>`,
              '<p class="char-count" id="post-text-count">0 / 1000 characters</p>')}
            ${myNotes.length ? `<div class="field">
              <label for="post-share">Or share one of My Notes</label>
              <select id="post-share"><option value="">Choose a note from your diary…</option>
                ${myNotes.map((n) => `<option value="${esc(n.id)}">${esc(diaryLine(n))}</option>`).join("")}
              </select></div>` : ""}
            <fieldset class="choice">
              <legend>Who can read it?</legend>
              <label><input type="radio" name="visibility" value="members" checked> Members only</label>
              <label><input type="radio" name="visibility" value="public"> Public: anyone, without joining</label>
            </fieldset>
            <div class="field">
              <label for="post-photo">Photo (optional)</label>
              <input type="file" id="post-photo" accept="${PHOTO_ACCEPT}">
              <p class="small">JPG, PNG or iPhone (HEIC) photos. They're made smaller, and location data is removed.</p>
              <div class="photo-preview" id="post-preview"></div>
              <p class="form-status" id="post-photo-status" role="status"></p>
            </div>
            <button type="submit" id="post-submit">Post note</button>
            <p class="form-status" id="post-status" role="status"></p>
          </form>
          ${notes.length ? `<ul class="note-feed">${notes.map((n) => noteCard(n, n.authorIsMe || isOwner)).join("")}</ul>`
            : '<p class="empty">No notes yet. Be the first!</p>'}
        </section>
        <aside>
          <section class="group-box">
            <h2>Members (${group.members.length})</h2>
            <ul class="member-list">${group.members.map((m) => `
              <li class="member-card">${avatar(m)}
                <div><strong>${esc(m.name)}</strong>${m.isMe ? " (you)" : ""}${m.name === group.owner ? ' <span class="tag">Owner</span>' : ""}
                  <br><span class="small">${m.growing.length ? `Grows: ${m.growing.map((id) => esc(plantName(id))).join(", ")}` : "Hasn't said what they grow yet"}</span></div>
              </li>`).join("")}</ul>
          </section>
          <section class="group-box">
            <h2>My profile in this group</h2>
            <form id="profile-form" class="note-form" novalidate>
              ${field("profile-name", "Name", `<input type="text" id="profile-name" maxlength="40" required value="${esc(me?.name ?? state.me.name)}"
                data-error="Write the name others will see." aria-describedby="profile-name-error">`)}
              <fieldset class="choice plant-picker">
                <legend>What I'm growing</legend>
                ${PLANTS.map((p) => `<label><input type="checkbox" value="${esc(p.id)}"${me?.growing.includes(p.id) ? " checked" : ""}> ${esc(p.name)}</label>`).join("")}
              </fieldset>
              <div class="field">
                <label for="profile-photo">Profile photo (optional)</label>
                <input type="file" id="profile-photo" accept="${PHOTO_ACCEPT}">
                <div class="photo-preview" id="profile-preview">${me?.photo ? `<img src="${esc(me.photo)}" alt="Your current photo">` : ""}</div>
                <p class="form-status" id="profile-photo-status" role="status"></p>
                ${me?.photo ? '<button type="button" class="button-secondary small-button" id="profile-photo-remove">Remove photo</button>' : ""}
              </div>
              <button type="submit" id="profile-submit">Save profile</button>
              <p class="form-status" id="profile-status" role="status"></p>
            </form>
            ${isOwner && !group.example
              ? '<button type="button" class="button-secondary" id="delete-group">Delete this group</button>'
              : '<button type="button" class="button-secondary" id="leave-group">Leave this group</button>'}
          </section>
        </aside>
      </div>`;

    // New note
    const post = $("#note-post");
    const checkPost = requiredFieldsChecker(post);
    const text = $("#post-text");
    const updateCount = charCounter(text, $("#post-text-count"));
    const postPhoto = photoField($("#post-photo"), $("#post-preview"), $("#post-photo-status"), $("#post-submit"));
    $("#post-share")?.addEventListener("change", (event) => {
      const n = myNotes.find((note) => note.id === event.target.value);
      if (!n) return;
      text.value = `${diaryLine(n)}${n.text ? `: ${n.text}` : ""}`.slice(0, text.maxLength);
      text.dispatchEvent(new Event("input"));
      updateCount();
    });
    post.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = checkPost();
      if (empty) return showStatus($("#post-status"), emptyFieldsMessage(empty), true);
      const visibility = post.querySelector('input[name="visibility"]:checked').value;
      group.notes.push({ id: uid(), author: me?.name ?? state.me.name, authorIsMe: true, date: todayISO(),
        visibility, text: text.value.trim(), photo: postPhoto.get() });
      commit(visibility === "public" ? "Note posted. Everyone can read it." : "Note posted. Only members can read it.", "#post-status");
    });

    // Delete a note (your own, or any note if it's your group)
    main.querySelectorAll("[data-delete-note]").forEach((button) => button.addEventListener("click", () => {
      if (!confirm("Delete this note?")) return;
      group.notes = group.notes.filter((n) => n.id !== button.dataset.deleteNote);
      commit("Note deleted.", "#post-status", false);
    }));

    // Join requests (owner)
    main.querySelectorAll("[data-approve], [data-decline]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.approve || button.dataset.decline;
      const request = group.requests.find((r) => r.id === id);
      group.requests = group.requests.filter((r) => r.id !== id);
      if (button.dataset.approve) {
        group.members.push({ id: uid(), name: request.name, growing: plantsMentioned(request.growing), photo: null, isMe: false });
        commit(`${request.name} is now a member and can read the members-only notes.`, "#requests-status");
      } else {
        commit(`You declined ${request.name}'s request.`, "#requests-status");
      }
    }));

    // My profile
    const profile = $("#profile-form");
    const checkProfile = requiredFieldsChecker(profile);
    const profilePhoto = photoField($("#profile-photo"), $("#profile-preview"), $("#profile-photo-status"), $("#profile-submit"));
    let removePhoto = false;
    $("#profile-photo-remove")?.addEventListener("click", () => {
      removePhoto = true;
      profilePhoto.clear();
      showStatus($("#profile-photo-status"), "Photo will be removed when you save.");
    });
    profile.addEventListener("submit", (event) => {
      event.preventDefault();
      const empty = checkProfile();
      if (empty) return showStatus($("#profile-status"), emptyFieldsMessage(empty), true);
      const newName = $("#profile-name").value.trim();
      if (me) {
        if (group.owner === me.name) group.owner = newName;
        group.notes.forEach((n) => { if (n.authorIsMe) n.author = newName; });
        me.name = newName;
        me.growing = [...profile.querySelectorAll(".plant-picker input:checked")].map((box) => box.value);
        if (profilePhoto.get()) me.photo = profilePhoto.get();
        else if (removePhoto) me.photo = null;
      }
      state.me.name = newName;
      commit("Profile saved.", "#profile-status");
    });

    // Leave or delete
    $("#leave-group")?.addEventListener("click", () => {
      if (!confirm(`Leave ${group.name}? You'll need to ask again to read the members-only notes.`)) return;
      group.members = group.members.filter((m) => !m.isMe);
      delete state.myStatus[group.id];
      commit(`You left ${group.name}.`);
    });
    $("#delete-group")?.addEventListener("click", () => {
      if (!confirm(`Delete the group for ${group.name}? Its members, notes and requests are removed.`)) return;
      state.groups = state.groups.filter((g) => g.id !== group.id);
      delete state.myStatus[group.id];
      commit("Group deleted.");
    });
  }

  draw();
}

// ---------- Start ----------

({ gardens: renderGardens, garden: renderGardenPage })[document.body.dataset.page]?.();
