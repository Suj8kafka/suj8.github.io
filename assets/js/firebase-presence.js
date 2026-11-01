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
const cloudflareStatus = document.querySelector(".cloudflare-analytics-status");
const cloudflareGrid = document.querySelector(".cloudflare-analytics-grid");
const cloudflareStats = document.querySelectorAll("[data-cloudflare-stat]");
const cloudflareLists = document.querySelectorAll("[data-cloudflare-list]");
const cloudflareAnalyticsUrl = "https://nameless-truth-99f0.sujeetkhadka00001.workers.dev";
const visitorNumber = Math.floor(1000 + Math.random() * 9000);
let presenceRef = null;
let currentSection = "hero";
let visitorCountry = "Location unavailable";
let visitorLocation = "Location unavailable";
let visitorLocationSource = "ip";
let database = null;
let countryCounts = {};
const DELETE_STALE_MS = 300000;  // delete records not updated for 5 min
const HEARTBEAT_MS = 20000;
let isLeaving = false;
let serverOffset = 0;
let rawVisitors = {};

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
    lastSeen: serverTimestamp()
  };
}

async function announcePresence() {
  if (!presenceRef || isLeaving) return;
  try {
    await onDisconnect(presenceRef).remove();
    await set(presenceRef, buildPresence());
  } catch (error) {
    console.error("Firebase presence announce failed.", error);
  }
}

function cleanStaleVisitors() {
  if (!database || isLeaving) return;
  const now = Date.now() + serverOffset;
  Object.entries(rawVisitors).forEach(([uid, visitor]) => {
    if (uid === presenceRef?.key) return;
    if (typeof visitor.lastSeen === "number" && now - visitor.lastSeen > DELETE_STALE_MS) {
      remove(ref(database, `presence/${uid}`)).catch(() => {});
    }
  });
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

function renderPresenceSnapshot(snapshot) {
  rawVisitors = snapshot.val() || {};
  refreshPresenceView();
}

function refreshPresenceView() {
  const visitors = {};
  Object.entries(rawVisitors).forEach(([uid, visitor]) => {
    const isMe = uid === presenceRef?.key;
    if (isMe || typeof visitor.lastSeen === "number") {
      visitors[uid] = visitor;
    }
  });
  renderVisitorList(visitors);
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
  if (!cloudflareStatus) return;
  if (cloudflareAnalyticsUrl.includes("YOUR-WORKER")) {
    cloudflareStatus.textContent = "Connect a Cloudflare Worker to show site activity.";
    return;
  }
  try {
    const response = await fetch(cloudflareAnalyticsUrl, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Analytics request returned ${response.status}`);
    const data = await response.json();
    cloudflareStats.forEach((stat) => {
      stat.textContent = formatAnalyticsNumber(Number(data[stat.dataset.cloudflareStat]) || 0);
    });
    cloudflareGrid.hidden = false;
    renderCloudflareList("paths", data.paths);
    renderCloudflareList("countries", data.countries);
    cloudflareStatus.textContent = data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Updated just now";
  } catch (error) {
    console.warn("Cloudflare analytics could not be loaded.", error);
    cloudflareStatus.textContent = "Analytics are temporarily unavailable.";
    cloudflareStatus.classList.add("is-error");
  }
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
        if (presenceRef && !isLeaving) await set(presenceRef, buildPresence());
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
    await announcePresence();
    await recordCountryVisit();

    onValue(ref(database, ".info/serverTimeOffset"), (snap) => {
      serverOffset = snap.val() || 0;
    });

    let wasConnected = false;
    onValue(ref(database, ".info/connected"), (snap) => {
      if (snap.val() === true) {
        if (wasConnected) announcePresence(); // re-register after a reconnect
        wasConnected = true;
      }
    });

    onValue(ref(database, "presence"), renderPresenceSnapshot, (error) => {
      console.error("Firebase presence could not be read.", error);
      setPresenceStatus("Live presence unavailable", "error");
    });
    onValue(ref(database, "analytics/countries"), updateCountryCount, (error) => {
      console.error("Country analytics could not be read.", error);
    });

    window.setInterval(() => {
      if (document.hidden || isLeaving) return;
      set(presenceRef, buildPresence()).catch((error) => console.error("Heartbeat failed.", error));
    }, HEARTBEAT_MS);

    window.setInterval(() => {
      refreshPresenceView();
      cleanStaleVisitors();
    }, 10000);

    setPresenceStatus("You’re here alone");
  } catch (error) {
    console.error("Firebase anonymous presence could not be started.", error);
    setPresenceStatus("Live presence unavailable", "error");
  }
}

window.addEventListener("scroll", () => {
  currentSection = getSectionAtViewportCenter();
}, { passive: true });

window.addEventListener("pagehide", () => {
  isLeaving = true;
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
    remove(presenceRef).catch(() => {});   // hidden tab = not "here"
  } else if (!isLeaving) {
    announcePresence();
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePresencePanel();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".live-presence-wrap")) {
    presenceButton?.setAttribute("aria-expanded", "false");
  }
});

startPresence();
loadCloudflareAnalytics();