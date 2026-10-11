import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  runTransaction
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzxkAPMvNZebOUfktw_XL1dD0Wt5NRikg",
  authDomain: "sujeet-portfolio.firebaseapp.com",
  databaseURL: "https://sujeet-portfolio-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sujeet-portfolio",
  storageBucket: "sujeet-portfolio.firebasestorage.app",
  messagingSenderId: "380345123473",
  appId: "1:380345123473:web:91c33be66b1b58ce7e3530",
  measurementId: "G-0000C91B56"
};

const presenceLabel = document.querySelector(".live-presence-label");
const presenceDot = document.querySelector(".live-presence-dot");
const presenceButton = document.querySelector(".live-presence");
const presenceList = document.querySelector(".live-presence-list");
const presencePanel = document.querySelector(".presence-panel");
const presencePanelClose = document.querySelector(".presence-panel-close");
const locationConsent = document.querySelector(".location-consent");
const locationStatus = document.querySelector(".location-status");
const countryChart = document.querySelector(".country-chart");
const remoteCursors = new Map();
const remoteCursorTimers = new Map();
const cursorColors = ["#f36b3d", "#5c9e9a", "#9aa84b", "#c06a78", "#6e7bd9"];
const visitorNumber = Math.floor(1000 + Math.random() * 9000);
const cursorColor = cursorColors[Math.floor(Math.random() * cursorColors.length)];
let presenceRef = null;
let lastCursorUpdate = 0;
let currentSection = "hero";
let visitorCountry = "Location unavailable";
let visitorLocation = "Location unavailable";
let visitorLocationSource = "ip";
let database = null;
let countryCounts = {};
let latestVisitors = {};

function setPresenceStatus(message, state = "connected") {
  if (!presenceLabel || !presenceDot) return;
  presenceLabel.textContent = message;
  presenceDot.dataset.state = state;
}

function getSectionAtViewportCenter() {
  const target = window.innerHeight * 0.38;
  const section = [...document.querySelectorAll("main > section[id]")].find((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.top <= target && bounds.bottom >= target;
  });
  return section?.id || "hero";
}

function removeRemoteCursor(uid) {
  const cursor = remoteCursors.get(uid);
  if (cursor) cursor.remove();
  remoteCursors.delete(uid);
  const timer = remoteCursorTimers.get(uid);
  if (timer) window.clearTimeout(timer);
  remoteCursorTimers.delete(uid);
}

function refreshRemoteCursor(uid, cursor) {
  cursor.classList.remove("is-stale");
  const previousTimer = remoteCursorTimers.get(uid);
  if (previousTimer) window.clearTimeout(previousTimer);
  remoteCursorTimers.set(uid, window.setTimeout(() => {
    cursor.classList.add("is-stale");
  }, 5000));
}

function positionRemoteCursor(cursor, visitor) {
  cursor.style.transform = `translate3d(${visitor.x}px, ${visitor.y - window.scrollY}px, 0)`;
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
    dot.style.backgroundColor = visitor.color || "#f36b3d";
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

function renderRemoteCursors(snapshot) {
  const visitors = snapshot.val() || {};
  latestVisitors = visitors;
  const activeIds = new Set(Object.keys(visitors));
  const otherVisitors = Object.entries(visitors).filter(([uid]) => uid !== presenceRef?.key);

  remoteCursors.forEach((_, uid) => {
    if (!activeIds.has(uid)) removeRemoteCursor(uid);
  });

  otherVisitors.forEach(([uid, visitor]) => {
    if (typeof visitor.x !== "number" || typeof visitor.y !== "number") return;
    let cursor = remoteCursors.get(uid);
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.className = "remote-cursor";
      cursor.innerHTML = '<span class="remote-cursor-arrow" aria-hidden="true"></span><span class="remote-cursor-label"></span>';
      document.body.append(cursor);
      remoteCursors.set(uid, cursor);
    }
    refreshRemoteCursor(uid, cursor);
    cursor.style.setProperty("--cursor-color", visitor.color || "#f36b3d");
    positionRemoteCursor(cursor, visitor);
    cursor.querySelector(".remote-cursor-label").textContent = visitor.label || "Visitor";
  });

  renderVisitorList(visitors);
  const count = otherVisitors.length;
  setPresenceStatus(count === 0 ? "You’re here alone" : `${count} other${count === 1 ? "" : "s"} here`);
}

function repositionRemoteCursors() {
  remoteCursors.forEach((cursor, uid) => {
    const visitor = latestVisitors[uid];
    if (visitor) positionRemoteCursor(cursor, visitor);
  });
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
  countries.slice(0, 8).forEach(([country, count]) => {
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

function openPresencePanel() {
  presencePanel?.classList.add("is-open");
  presencePanel?.setAttribute("aria-hidden", "false");
  presencePanelClose?.focus({ preventScroll: true });
}

function closePresencePanel() {
  presencePanel?.classList.remove("is-open");
  presencePanel?.setAttribute("aria-hidden", "true");
}

async function detectIpCountry() {
  try {
    const response = await fetch("https://ipwho.is/");
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
        if (presenceRef) await set(presenceRef, {
          x: 0, y: 0, section: currentSection, color: cursorColor,
          label: `Visitor ${visitorNumber}`, country: visitorCountry, location: visitorLocation,
          locationSource: visitorLocationSource, lastSeen: serverTimestamp()
        });
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
  if (!presenceLabel || !window.matchMedia("(pointer: fine)").matches) return;

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    database = getDatabase(app);
    const credential = await signInAnonymously(auth);
    presenceRef = ref(database, `presence/${credential.user.uid}`);

    await detectIpCountry();

    await onDisconnect(presenceRef).remove();
    await set(presenceRef, {
      x: 0,
      y: 0,
      section: currentSection,
      color: cursorColor,
      label: `Visitor ${visitorNumber}`,
      country: visitorCountry,
      location: visitorLocation,
      locationSource: visitorLocationSource,
      lastSeen: serverTimestamp()
    });
    await recordCountryVisit();

    onValue(ref(database, "presence"), renderRemoteCursors, (error) => {
      console.error("Firebase presence could not be read.", error);
      setPresenceStatus("Live presence unavailable", "error");
    });
    onValue(ref(database, "analytics/countries"), updateCountryCount, (error) => {
      console.error("Country analytics could not be read.", error);
    });

    setPresenceStatus("You’re here alone");
  } catch (error) {
    console.error("Firebase anonymous presence could not be started.", error);
    setPresenceStatus("Live presence unavailable", "error");
  }
}

window.addEventListener("pointermove", (event) => {
  if (!presenceRef) return;
  const now = performance.now();
  if (now - lastCursorUpdate < 120) return;
  lastCursorUpdate = now;
  set(presenceRef, {
    x: Math.round(event.clientX),
    y: Math.round(event.clientY + window.scrollY),
    section: currentSection,
    color: cursorColor,
    label: `Visitor ${visitorNumber}`,
    country: visitorCountry,
    location: visitorLocation,
    locationSource: visitorLocationSource,
    lastSeen: serverTimestamp()
  }).catch((error) => console.error("Firebase cursor update failed.", error));
}, { passive: true });

window.addEventListener("scroll", () => {
  currentSection = getSectionAtViewportCenter();
  repositionRemoteCursors();
}, { passive: true });

window.addEventListener("pagehide", () => {
  if (presenceRef) remove(presenceRef).catch((error) => console.error("Firebase presence cleanup failed.", error));
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePresencePanel();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".live-presence-wrap")) {
    presenceButton?.setAttribute("aria-expanded", "false");
  }
});

startPresence();
