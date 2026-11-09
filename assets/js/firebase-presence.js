import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { initializeAuth, inMemoryPersistence, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { createLiveCursors, cursorColor } from "./live-cursors.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  runTransaction
} from "./firebase-database.js";

const presenceLabel = document.querySelector(".live-presence-label");
const presenceDot = document.querySelector(".live-presence-dot");
const presenceButton = document.querySelector(".live-presence");
const presenceList = document.querySelector(".live-presence-list");
const presencePanel = document.querySelector(".presence-panel");
const presencePanelClose = document.querySelector(".presence-panel-close");
const locationConsent = document.querySelector(".location-consent");
const locationStatus = document.querySelector(".location-status");
const countryChart = document.querySelector(".country-chart");
const cloudflareStatus = document.querySelector(".cloudflare-analytics-status");
const cloudflareGrid = document.querySelector(".cloudflare-analytics-grid");
const cloudflareStats = document.querySelectorAll("[data-cloudflare-stat]");
const cloudflareLists = document.querySelectorAll("[data-cloudflare-list]");
const cloudflareRefresh = document.querySelector("[data-cloudflare-refresh]");
const cursorToggle = document.querySelector("[data-live-cursors]");
const cloudflareAnalyticsUrl = "https://nameless-truth-99f0.sujeetkhadka00001.workers.dev";
const visitorNumber = Math.floor(1000 + Math.random() * 9000);
let presenceRef = null;
let currentSection = "hero";
let visitorCountry = "Location unavailable";
let visitorLocation = "Location unavailable";
let visitorLocationSource = "ip";
let database = null;
let countryCounts = {};
const DELETE_STALE_MS = 120000;
const HEARTBEAT_MS = 20000;
let isLeaving = false;
let serverOffset = 0;
let rawVisitors = {};
let isConnected = false;
let presenceReady = false;
let hasConnected = false;
let presenceError = false;
let publishTimer = 0;
let visitorListSignature = '';
let analyticsLoading = false;
let analyticsLoadedAt = 0;
const liveCursors = createLiveCursors({
  document, window, now: () => Date.now() + serverOffset,
  enabled: () => cursorToggle?.checked !== false,
  onChange: queuePresenceUpdate
});

function queuePresenceUpdate() {
  if (!presenceRef || !isConnected || isLeaving || publishTimer) return;
  publishTimer = window.setTimeout(() => {
    publishTimer = 0;
    publishPresence();
  }, 100);
}

function publishPresence() {
  if (!presenceRef || !isConnected || !presenceReady || isLeaving) return;
  set(presenceRef, buildPresence()).catch(error => {
    console.error("Presence update failed.", error);
    presenceReady = false;
    presenceError = true;
    refreshPresenceView();
  });
}

function setPresenceStatus(message, state = "connected") {
  if (!presenceLabel || !presenceDot) return;
  presenceLabel.textContent = message;
  presenceDot.dataset.state = state;
}

function buildPresence() {
  return {
    section: currentSection,
    label: `Visitor ${visitorNumber}`,
    country: visitorCountry,
    location: visitorLocation,
    locationSource: visitorLocationSource,
    path: window.location?.pathname || "/",
    color: liveCursors.color,
    cursor: liveCursors.cursor,
    lastSeen: serverTimestamp()
  };
}

async function announcePresence() {
  if (!presenceRef || !isConnected || isLeaving) return;
  try {
    await onDisconnect(presenceRef).remove();
    if (!isLeaving && isConnected) {
      presenceReady = true;
      await set(presenceRef, buildPresence());
    }
  } catch (error) {
    presenceReady = false;
    presenceError = true;
    console.error("Firebase presence announce failed.", error);
    setPresenceStatus("Live presence unavailable", "error");
  }
}

function getSectionAtViewportCenter() {
  const target = window.innerHeight * 0.38;
  const section = [...document.querySelectorAll("main > section[id]")].find((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.top <= target && bounds.bottom >= target;
  });
  return section?.id || "hero";
}

function formatSection(section) {
  if (!section || section === "hero") return "the home section";
  return section.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderVisitorList(visitors) {
  if (!presenceList) return;
  const visitorEntries = Object.entries(visitors);
  presenceList.innerHTML = "";

  if (!visitorEntries.length) {
    const emptyMessage = document.createElement("span");
    emptyMessage.className = "live-presence-empty";
    emptyMessage.textContent = "No visitors right now";
    presenceList.append(emptyMessage);
    const analyticsButton = document.createElement("button");
    analyticsButton.className = "live-presence-analytics";
    analyticsButton.type = "button";
    analyticsButton.dataset.openAnalytics = "true";
    analyticsButton.textContent = "View visitor analytics";
    presenceList.append(analyticsButton);
    return;
  }

  visitorEntries.forEach(([uid, visitor]) => {
    const item = document.createElement("div");
    item.className = "live-presence-item";
    const dot = document.createElement("span");
    dot.className = "live-presence-item-dot";
    dot.style.backgroundColor = cursorColor(visitor.color);
    const details = document.createElement("span");
    details.innerHTML = `<strong></strong><small></small>`;
    details.querySelector("strong").textContent = uid === presenceRef?.key ? "You" : (visitor.label || "Anonymous visitor");
    details.querySelector("small").textContent = `Exploring ${formatSection(visitor.section)} · ${visitor.location || visitor.country || "Location unavailable"}`;
    item.append(dot, details);
    presenceList.append(item);
  });
  const analyticsButton = document.createElement("button");
  analyticsButton.className = "live-presence-analytics";
  analyticsButton.type = "button";
  analyticsButton.dataset.openAnalytics = "true";
  analyticsButton.textContent = "View visitor analytics";
  presenceList.append(analyticsButton);
}

function renderPresenceSnapshot(snapshot) {
  rawVisitors = snapshot.val() || {};
  refreshPresenceView();
}

function refreshPresenceView() {
  if (presenceError) {
    liveCursors.clear();
    setPresenceStatus("Live presence unavailable", "error");
    return;
  }
  if (!isConnected) {
    liveCursors.clear();
    setPresenceStatus(hasConnected ? "Reconnecting live" : "Connecting live", "connecting");
    return;
  }
  const visitors = {};
  const now = Date.now() + serverOffset;
  Object.entries(rawVisitors).forEach(([uid, visitor]) => {
    if (!visitor || typeof visitor !== "object") return;
    const isMe = uid === presenceRef?.key;
    if (isMe || (typeof visitor.lastSeen === "number" && now - visitor.lastSeen < DELETE_STALE_MS)) {
      visitors[uid] = visitor;
    }
  });
  const signature = JSON.stringify(Object.entries(visitors).map(([uid, visitor]) =>
    [uid, visitor.section, visitor.label, visitor.location, visitor.country, visitor.color]));
  if (signature !== visitorListSignature) {
    visitorListSignature = signature;
    renderVisitorList(visitors);
  }
  liveCursors.render(visitors, presenceRef?.key);
  const count = Object.keys(visitors).filter((uid) => uid !== presenceRef?.key).length;
  setPresenceStatus(count === 0 ? "You’re here alone" : `${count} other${count === 1 ? "" : "s"} here`);
}

function renderCountryChart() {
  if (!countryChart) return;
  const countries = Object.entries(countryCounts).sort(([, first], [, second]) => second - first);
  countryChart.innerHTML = "";
  if (!countries.length) {
    countryChart.textContent = "No country data yet.";
    return;
  }
  const maximum = countries[0][1];
  countries.forEach(([country, count]) => {
    const row = document.createElement("div");
    row.className = "country-chart-row";
    row.innerHTML = '<span class="country-chart-name"></span><span class="country-chart-track"><i></i></span><strong></strong>';
    row.querySelector(".country-chart-name").textContent = country;
    row.querySelector("i").style.width = `${Math.max(8, (count / maximum) * 100)}%`;
    row.querySelector("strong").textContent = count;
    countryChart.append(row);
  });
}

function updateCountryCount(snapshot) {
  countryCounts = snapshot.val() || {};
  renderCountryChart();
}

function formatAnalyticsNumber(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function renderCloudflareList(type, entries) {
  const list = document.querySelector(`[data-cloudflare-list="${type}"]`);
  if (!list || !Array.isArray(entries) || !entries.length) return;
  const items = list.querySelector(".cloudflare-list-items");
  items.innerHTML = "";
  entries.forEach(({ name, value }) => {
    const row = document.createElement("div");
    row.className = "cloudflare-list-row";
    row.innerHTML = "<span></span><strong></strong>";
    row.querySelector("span").textContent = name;
    row.querySelector("strong").textContent = formatAnalyticsNumber(value);
    items.append(row);
  });
  list.hidden = false;
}

async function loadCloudflareAnalytics() {
  if (!cloudflareStatus || analyticsLoading) return;
  if (cloudflareAnalyticsUrl.includes("YOUR-WORKER")) {
    cloudflareStatus.textContent = "Connect a Cloudflare Worker to show site activity.";
    return;
  }
  analyticsLoading = true;
  cloudflareStatus.classList.remove("is-error");
  cloudflareStatus.textContent = "Loading Cloudflare data…";
  if (cloudflareRefresh) cloudflareRefresh.disabled = true;
  try {
    const response = await fetch(cloudflareAnalyticsUrl, {
      headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000)
    });
    if (response.status === 503) {
      throw new Error("Cloudflare analytics is not configured yet.");
    }
    if (!response.ok) throw new Error(`Analytics request returned ${response.status}`);
    const data = await response.json();
    if (!Number.isFinite(data.requests) || !Number.isFinite(data.visits)) throw new Error("Invalid analytics response");
    cloudflareStats.forEach((stat) => {
      stat.textContent = formatAnalyticsNumber(Number(data[stat.dataset.cloudflareStat]) || 0);
    });
    cloudflareGrid.hidden = false;
    cloudflareLists.forEach(list => { list.hidden = true; });
    renderCloudflareList("paths", data.paths);
    renderCloudflareList("countries", data.countries);
    cloudflareStatus.textContent = data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Updated just now";
    analyticsLoadedAt = Date.now();
  } catch (error) {
    console.warn("Cloudflare analytics could not be loaded.", error);
    cloudflareStatus.textContent = error.message === "Cloudflare analytics is not configured yet."
      ? error.message : "Analytics are temporarily unavailable. Try refreshing.";
    cloudflareStatus.classList.add("is-error");
  } finally {
    analyticsLoading = false;
    if (cloudflareRefresh) cloudflareRefresh.disabled = false;
  }
}

function openPresencePanel() {
  presencePanel?.classList.add("is-open");
  presencePanel?.setAttribute("aria-hidden", "false");
  presencePanelClose?.focus({ preventScroll: true });
  presenceButton?.setAttribute("aria-expanded", "true");
  if (Date.now() - analyticsLoadedAt > 300000) loadCloudflareAnalytics();
}

function closePresencePanel() {
  if (!presencePanel?.classList.contains("is-open")) return;
  presencePanel?.classList.remove("is-open");
  presencePanel?.setAttribute("aria-hidden", "true");
  presenceButton?.setAttribute("aria-expanded", "false");
  presenceButton?.focus({ preventScroll: true });
}

async function detectIpCountry() {
  try {
    const response = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return;
    const location = await response.json();
    if (location.success && typeof location.country === "string") visitorCountry = location.country.slice(0, 60);
  } catch (error) {
    console.warn("Approximate visitor country could not be detected.", error);
  }
  visitorLocation = visitorCountry;
}

async function recordCountryVisit() {
  if (!database || visitorCountry === "Location unavailable") return;
  const countryKey = visitorCountry.replace(/[.#$/[\]]/g, "_");
  await runTransaction(ref(database, `analytics/countries/${countryKey}`), (count) => (count || 0) + 1);
}

async function usePreciseLocation() {
  if (!navigator.geolocation) {
    if (locationStatus) locationStatus.textContent = "Precise location is not supported by this browser.";
    return;
  }
  if (locationStatus) locationStatus.textContent = "Waiting for location permission…";
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`);
      const location = await response.json();
      const preciseCountry = location.countryName || location.countryCode;
      const locality = location.city || location.locality || location.principalSubdivision;
      if (preciseCountry) {
        visitorCountry = preciseCountry.slice(0, 60);
        visitorLocation = locality ? `${locality}, ${preciseCountry}`.slice(0, 60) : visitorCountry;
        visitorLocationSource = "precise";
        if (locationStatus) locationStatus.textContent = `Showing ${visitorLocation} for this session.`;
        publishPresence();
      }
    } catch (error) {
      console.warn("Precise visitor location could not be resolved.", error);
      if (locationStatus) locationStatus.textContent = "Location could not be resolved.";
    }
  }, () => {
    if (locationStatus) locationStatus.textContent = "Location permission was not granted.";
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
}

async function startPresence() {
  if (!presenceLabel) return;

  try {
    const app = initializeApp(firebaseConfig);
    // Each page gets its own anonymous identity, avoiding tab/session record collisions.
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    database = getDatabase(app);
    const credential = await signInAnonymously(auth);
    presenceRef = ref(database, `presence/${credential.user.uid}`);

    onValue(ref(database, ".info/serverTimeOffset"), (snap) => {
      serverOffset = snap.val() || 0;
    });

    onValue(ref(database, ".info/connected"), (snap) => {
      isConnected = snap.val() === true;
      presenceReady = false;
      presenceError = false;
      if (isConnected) { hasConnected = true; announcePresence(); }
      refreshPresenceView();
    });

    onValue(ref(database, "presence"), renderPresenceSnapshot, (error) => {
      presenceError = true;
      console.error("Firebase presence could not be read.", error);
      setPresenceStatus("Live presence unavailable", "error");
    });
    onValue(ref(database, "analytics/countries"), updateCountryCount, (error) => {
      console.error("Country analytics could not be read.", error);
    });

    window.setInterval(() => {
      publishPresence();
    }, HEARTBEAT_MS);

    window.setInterval(() => {
      refreshPresenceView();
    }, 1000);

    // Country lookup/analytics must never block the live subscriptions.
    detectIpCountry().then(() => {
      publishPresence();
      return recordCountryVisit();
    }).catch(error => console.warn("Country visit could not be recorded.", error));
  } catch (error) {
    console.error("Firebase anonymous presence could not be started.", error);
    setPresenceStatus("Live presence unavailable", "error");
  }
}

window.addEventListener("scroll", () => {
  const section = getSectionAtViewportCenter();
  if (section !== currentSection) { currentSection = section; queuePresenceUpdate(); }
  liveCursors.capture();
  if (isConnected && !presenceError) liveCursors.render(rawVisitors, presenceRef?.key);
}, { passive: true });
window.addEventListener("resize", () => {
  liveCursors.capture();
  if (isConnected && !presenceError) liveCursors.render(rawVisitors, presenceRef?.key);
}, { passive: true });

window.addEventListener("pagehide", () => {
  isLeaving = true;
  window.clearTimeout(publishTimer);
  publishTimer = 0;
  liveCursors.clear();
  if (presenceRef) remove(presenceRef).catch((error) => console.error("Firebase presence cleanup failed.", error));
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {   // page restored from back/forward cache
    isLeaving = false;
    announcePresence();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!presenceRef) return;
  if (document.hidden) {
    liveCursors.hide();
    liveCursors.clear();
    publishPresence();
  } else if (!isLeaving) {
    announcePresence();
    refreshPresenceView();
  }
});

presenceButton?.addEventListener("click", () => {
  openPresencePanel();
});
presenceList?.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-analytics]")) openPresencePanel();
});
presencePanelClose?.addEventListener("click", closePresencePanel);
presencePanel?.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-presence-close")) closePresencePanel();
});
locationConsent?.addEventListener("click", usePreciseLocation);
cloudflareRefresh?.addEventListener("click", loadCloudflareAnalytics);
cursorToggle?.addEventListener("change", () => {
  liveCursors.hide();
  liveCursors.clear();
  queuePresenceUpdate();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePresencePanel();
  if (event.key === "Tab" && presencePanel?.classList.contains("is-open")) {
    const controls = [...presencePanel.querySelectorAll('button:not(:disabled), input, a[href]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});

startPresence();
