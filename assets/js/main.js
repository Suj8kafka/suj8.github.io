const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const header = document.querySelector(".site-header");
const cursorOrb = document.querySelector(".cursor-orb");
const pageLoader = document.querySelector(".page-loader");
const storedTheme = localStorage.getItem("portfolio-theme");

function hidePageLoader() {
  if (pageLoader) pageLoader.classList.add("is-hidden");
}

if (storedTheme === "dark") {
  root.dataset.theme = "dark";
}

function updateThemeControl() {
  const isDark = root.dataset.theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.querySelector(".theme-label").textContent = isDark ? "Light" : "Dark";
}

themeToggle.addEventListener("click", () => {
  const isDark = root.dataset.theme !== "dark";
  root.dataset.theme = isDark ? "dark" : "light";
  localStorage.setItem("portfolio-theme", root.dataset.theme);
  updateThemeControl();
});

updateThemeControl();
document.getElementById("year").textContent = new Date().getFullYear();
window.addEventListener("load", hidePageLoader, { once: true });
if (document.readyState === "complete") hidePageLoader();

function initHeroParticles() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800) return;
  if (typeof window.particlesJS !== "function") {
    console.warn("Particle animation could not be initialized.");
    return;
  }

  window.particlesJS("particles-js", {
    particles: {
      number: { value: 56, density: { enable: true, value_area: 700 } },
      color: { value: ["#f36b3d", "#a7d7d0", "#d9e68a"] },
      shape: { type: "circle" },
      opacity: { value: .78, random: true },
      size: { value: 3, random: true },
      line_linked: { enable: true, distance: 145, color: "#686f68", opacity: .42, width: 1 },
      move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: { enable: true, mode: "repulse" },
        onclick: { enable: false, mode: "push" },
        resize: true
      },
      modes: { repulse: { distance: 85, duration: .45 } }
    },
    retina_detect: true
  });
}

const startParticles = window.requestIdleCallback
  ? (callback) => window.requestIdleCallback(callback, { timeout: 1200 })
  : (callback) => window.setTimeout(callback, 300);
startParticles(initHeroParticles);

let headerScrollFrame = 0;
function updateHeader() {
  headerScrollFrame = 0;
  header.classList.toggle("is-detached", window.scrollY > 28);
}

window.addEventListener("scroll", () => {
  if (!headerScrollFrame) headerScrollFrame = requestAnimationFrame(updateHeader);
}, { passive: true });
updateHeader();

let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;
window.addEventListener("pointermove", (event) => {
  document.body.classList.add("has-pointer");
  pointerX = event.clientX;
  pointerY = event.clientY;
  if (!pointerFrame) {
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      cursorOrb.style.setProperty("--cursor-x", `${pointerX}px`);
      cursorOrb.style.setProperty("--cursor-y", `${pointerY}px`);
    });
  }
});

document.addEventListener("pointerover", (event) => {
  if (event.target.closest("a, button, .experience-node")) document.body.classList.add("cursor-hover");
});
document.addEventListener("pointerout", (event) => {
  if (event.target.closest("a, button, .experience-node") && !event.relatedTarget?.closest("a, button, .experience-node")) {
    document.body.classList.remove("cursor-hover");
  }
});

document.querySelectorAll(".company-logo").forEach((logo) => {
  const image = logo.querySelector("img");
  image.addEventListener("error", () => {
    image.remove();
    logo.querySelector("span").style.display = "block";
  });
});

const revealItems = document.querySelectorAll(".experience-node, .article-card, .about-copy");
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => {
  item.classList.add("reveal");
  revealObserver.observe(item);
});
