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
  if (typeof window.particlesJS !== "function") {
    console.warn("Particle animation could not be initialized.");
    return;
  }

  window.particlesJS("particles-js", {
    particles: {
      number: { value: 88, density: { enable: true, value_area: 700 } },
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

initHeroParticles();

function updateHeader() {
  header.classList.toggle("is-detached", window.scrollY > 28);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

window.addEventListener("pointermove", (event) => {
  document.body.classList.add("has-pointer");
  cursorOrb.style.left = `${event.clientX}px`;
  cursorOrb.style.top = `${event.clientY}px`;
});

document.querySelectorAll("a, button, .experience-node").forEach((element) => {
  element.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
  element.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
});

document.querySelectorAll(".experience-card").forEach((card) => {
  const accent = card.classList.contains("card-blue") ? "#a7d7d0"
    : card.classList.contains("card-pink") ? "#edbbc2"
      : card.classList.contains("card-lime") ? "#d9e68a" : "#f36b3d";
  card.addEventListener("pointerenter", () => {
    card.classList.add("is-hovered");
    card.style.setProperty("background", accent, "important");
  });
  card.addEventListener("pointerleave", () => {
    card.classList.remove("is-hovered");
    card.style.removeProperty("background");
  });
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
