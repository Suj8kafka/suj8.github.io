import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { initializeAuth, inMemoryPersistence, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { createLiveCursors, cursorColor } from "./live-cursors.js?v=20261112-presence";
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
const locationConsent = document.querySelector(".location-consent");
const locationStatus = document.querySelector(".location-status");
const countryChart = document.querySelector(".country-chart");
const cursorToggle = document.querySelector("[data-live-cursors]");
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
let hasPresenceSnapshot = false;
let presenceReadError = false;
let expiryTimer = 0;
let heartbeatTimer = 0;
let viewportFrame = 0;
let destroyed = false;
let connectionVersion = 0;
const subscriptions = [];
const listeners = [];
function listen(target, name, callback, options) {
  target?.addEventListener(name, callback, options);
  listeners.push(() => target?.removeEventListener(name, callback, options));
}
const liveCursors = createLiveCursors({
  document, window, now: () => Date.now() + serverOffset,
  enabled: () => cursorToggle?.checked !== false,
  onChange: queuePresenceUpdate
});

function queuePresenceUpdate() {
  if (destroyed || !presenceRef || !isConnected || isLeaving || publishTimer) return;
  publishTimer = window.setTimeout(() => {
    publishTimer = 0;
    publishPresence();
  }, 100);
}

function publishPresence() {
  if (destroyed || !presenceRef || !isConnected || !presenceReady || isLeaving) return;
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
  if (destroyed || !presenceRef || !isConnected || isLeaving) return;
  const version = connectionVersion;
  try {
    await onDisconnect(presenceRef).remove();
    if (!destroyed && !isLeaving && isConnected && version === connectionVersion) {
      await set(presenceRef, buildPresence());
      if (destroyed || isLeaving || !isConnected || version !== connectionVersion) return;
      presenceReady = true;
      presenceError = false;
      refreshPresenceView();
    }
  } catch (error) {
    if (destroyed || isLeaving || version !== connectionVersion) return;
    presenceReady = false;
    presenceError = true;
    console.error("Firebase presence announce failed.", error);
    refreshPresenceView();
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
  if (destroyed) return;
  rawVisitors = snapshot.val() || {};
  hasPresenceSnapshot = true;
  presenceReadError = false;
  refreshPresenceView();
}

function showPresenceFallback(message, state) {
  liveCursors.clear();
  setPresenceStatus(message, state);
  const signature = `status:${message}`;
  if (!presenceList || visitorListSignature === signature) return;
  visitorListSignature = signature;
  presenceList.innerHTML = "";
  const text = document.createElement("span");
  text.className = "live-presence-empty";
  text.textContent = message;
  presenceList.append(text);
}

function refreshPresenceView() {
  window.clearTimeout(expiryTimer);
  expiryTimer = 0;
  if (destroyed || isLeaving) return;
  if (presenceError || presenceReadError) {
    showPresenceFallback("Live presence unavailable", "error");
    return;
  }
  if (!isConnected || !presenceReady || !hasPresenceSnapshot) {
    showPresenceFallback(hasConnected ? "Reconnecting live" : "Connecting live", "connecting");
    return;
  }
  const visitors = {};
  const now = Date.now() + serverOffset;
  let nextExpiry = Infinity;
  Object.entries(rawVisitors).forEach(([uid, visitor]) => {
    if (!visitor || typeof visitor !== "object") return;
    const isMe = uid === presenceRef?.key;
    const age = now - visitor.lastSeen;
    if (isMe || (Number.isFinite(visitor.lastSeen) && age >= -HEARTBEAT_MS && age < DELETE_STALE_MS)) {
      visitors[uid] = visitor;
      if (!isMe) nextExpiry = Math.min(nextExpiry, DELETE_STALE_MS - age);
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
  // Expire stale rows when needed; idle pages do not need a one-second render loop.
  if (Number.isFinite(nextExpiry)) expiryTimer = window.setTimeout(refreshPresenceView, nextExpiry + 1);
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
  if (destroyed || isLeaving || !database || visitorCountry === "Location unavailable") return;
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
  if (presenceButton) presenceButton.disabled = false;
  setPresenceStatus("Connecting live", "connecting");

  try {
    const app = initializeApp(firebaseConfig);
    // Each page gets its own anonymous identity, avoiding tab/session record collisions.
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    database = getDatabase(app);
    const credential = await signInAnonymously(auth);
    if (destroyed) return;
    presenceRef = ref(database, `presence/${credential.user.uid}`);

    subscriptions.push(onValue(ref(database, ".info/serverTimeOffset"), (snap) => {
      serverOffset = snap.val() || 0;
      refreshPresenceView();
    }));

    subscriptions.push(onValue(ref(database, ".info/connected"), (snap) => {
      connectionVersion++;
      isConnected = snap.val() === true;
      presenceReady = false;
      presenceError = false;
      if (isConnected) { hasConnected = true; announcePresence(); }
      refreshPresenceView();
    }));

    subscriptions.push(onValue(ref(database, "presence"), renderPresenceSnapshot, (error) => {
      presenceReadError = true;
      console.error("Firebase presence could not be read.", error);
      refreshPresenceView();
    }));
    subscriptions.push(onValue(ref(database, "analytics/countries"), updateCountryCount, (error) => {
      console.error("Country analytics could not be read.", error);
      if (countryChart) countryChart.textContent = "Country visits are temporarily unavailable.";
    }));

    startHeartbeat();

    // Country lookup/analytics must never block the live subscriptions.
    detectIpCountry().then(() => {
      publishPresence();
      return recordCountryVisit();
    }).catch(error => console.warn("Country visit could not be recorded.", error));
  } catch (error) {
    console.error("Firebase anonymous presence could not be started.", error);
    presenceError = true;
    refreshPresenceView();
  }
}

function startHeartbeat() {
  if (!destroyed && !isLeaving && !heartbeatTimer) heartbeatTimer = window.setInterval(publishPresence, HEARTBEAT_MS);
}

function updateViewport() {
  viewportFrame = 0;
  if (destroyed || isLeaving || document.hidden) return;
  const section = getSectionAtViewportCenter();
  if (section !== currentSection) { currentSection = section; queuePresenceUpdate(); }
  liveCursors.capture();
  if (isConnected && presenceReady && !presenceError && !presenceReadError) liveCursors.render(rawVisitors, presenceRef?.key);
}
function queueViewportUpdate() {
  if (!destroyed && !isLeaving && !viewportFrame) viewportFrame = window.requestAnimationFrame(updateViewport);
}
listen(window, "scroll", queueViewportUpdate, { passive: true });
listen(window, "resize", queueViewportUpdate, { passive: true });

listen(window, "pagehide", (event) => {
  isLeaving = true;
  connectionVersion++;
  presenceReady = false;
  window.clearInterval(heartbeatTimer);
  heartbeatTimer = 0;
  window.clearTimeout(expiryTimer);
  window.cancelAnimationFrame(viewportFrame);
  viewportFrame = 0;
  window.clearTimeout(publishTimer);
  publishTimer = 0;
  liveCursors.hide();
  liveCursors.clear();
  if (presenceRef) remove(presenceRef).catch((error) => console.error("Firebase presence cleanup failed.", error));
  if (!event?.persisted) {
    destroyed = true;
    subscriptions.forEach(unsubscribe => unsubscribe?.());
    listeners.forEach(unlisten => unlisten());
    liveCursors.destroy();
  }
});

listen(window, "pageshow", (event) => {
  if (event.persisted) {   // page restored from back/forward cache
    isLeaving = false;
    startHeartbeat();
    announcePresence();
    refreshPresenceView();
  }
});

listen(document, "visibilitychange", () => {
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

listen(locationConsent, "click", usePreciseLocation);
listen(cursorToggle, "change", () => {
  liveCursors.hide();
  liveCursors.clear();
  queuePresenceUpdate();
});

startPresence();
