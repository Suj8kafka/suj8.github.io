import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set
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
const remoteCursors = new Map();
const cursorColors = ["#f36b3d", "#5c9e9a", "#9aa84b", "#c06a78", "#6e7bd9"];
const visitorNumber = Math.floor(1000 + Math.random() * 9000);
const cursorColor = cursorColors[Math.floor(Math.random() * cursorColors.length)];
let presenceRef = null;
let lastCursorUpdate = 0;
let currentSection = "hero";

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
}

function renderRemoteCursors(snapshot) {
  const visitors = snapshot.val() || {};
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
    cursor.style.setProperty("--cursor-color", visitor.color || "#f36b3d");
    cursor.style.transform = `translate3d(${visitor.x}px, ${visitor.y}px, 0)`;
    cursor.querySelector(".remote-cursor-label").textContent = visitor.label || "Visitor";
  });

  const count = otherVisitors.length;
  setPresenceStatus(count === 0 ? "You’re here alone" : `${count} other${count === 1 ? "" : "s"} here`);
}

async function startPresence() {
  if (!presenceLabel || !window.matchMedia("(pointer: fine)").matches) return;

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    const credential = await signInAnonymously(auth);
    presenceRef = ref(database, `presence/${credential.user.uid}`);

    await onDisconnect(presenceRef).remove();
    await set(presenceRef, {
      x: 0,
      y: 0,
      section: currentSection,
      color: cursorColor,
      label: `Visitor ${visitorNumber}`,
      lastSeen: serverTimestamp()
    });

    onValue(ref(database, "presence"), renderRemoteCursors, (error) => {
      console.error("Firebase presence could not be read.", error);
      setPresenceStatus("Live presence unavailable", "error");
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
    y: Math.round(event.clientY),
    section: currentSection,
    color: cursorColor,
    label: `Visitor ${visitorNumber}`,
    lastSeen: serverTimestamp()
  }).catch((error) => console.error("Firebase cursor update failed.", error));
}, { passive: true });

window.addEventListener("scroll", () => {
  currentSection = getSectionAtViewportCenter();
}, { passive: true });

window.addEventListener("pagehide", () => {
  if (presenceRef) remove(presenceRef).catch((error) => console.error("Firebase presence cleanup failed.", error));
});

startPresence();
